import { fetchSeason, type MatchRow, type Season, type TeamRow } from './lolesports';
import { computeScenarios, type ScenarioResult } from './scenarios';
import { LIVE_WINDOW, OUR_TAG } from './lck2026';

/**
 * 시즌 데이터 서버 캐시.
 *
 * 한 번 만드는 데 API 4회(순위 2 + 일정 페이징 2)와 경우의 수 전수 계산이 들어간다.
 * 경기 결과는 하루에 두 번 정도만 바뀌므로 5분 TTL 로 충분하다.
 */

const TTL_MS = 5 * 60 * 1000;

export interface SeasonBundle {
  season: Season;
  /** 우리 팀이 속한 그룹의 경우의 수 */
  scenarios: ScenarioResult;
  ourGroup: 'legend' | 'rise';
  us: TeamRow | null;
  next: MatchRow | null;
  recent: MatchRow[];
  fetchedAt: string;
}

let cache: { at: number; bundle: SeasonBundle } | null = null;
let inflight: Promise<SeasonBundle> | null = null;

export function ourMatches(matches: MatchRow[], code = OUR_TAG) {
  return matches.filter((m) => m.a.code === code || m.b.code === code);
}

export function nextMatchOf(matches: MatchRow[], code = OUR_TAG, now = Date.now()): MatchRow | null {
  return (
    ourMatches(matches, code)
      .filter((m) => m.state !== 'completed' && +new Date(m.startTime) > now - LIVE_WINDOW.afterMs)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))[0] ?? null
  );
}

export function recentOf(matches: MatchRow[], code = OUR_TAG, n = 3): MatchRow[] {
  return ourMatches(matches, code)
    .filter((m) => m.state === 'completed')
    .sort((a, b) => b.startTime.localeCompare(a.startTime))
    .slice(0, n);
}

/** 지금이 어떤 경기의 방송 시간대인가 (팀 무관 — LCK 채널은 전 경기를 송출한다) */
export function inLiveWindow(matches: MatchRow[], now = Date.now()): MatchRow | null {
  return (
    matches.find((m) => {
      const k = +new Date(m.startTime);
      return now >= k - LIVE_WINDOW.beforeMs && now <= k + LIVE_WINDOW.afterMs;
    }) ?? null
  );
}

async function build(): Promise<SeasonBundle> {
  const season = await fetchSeason();
  const ourGroup = season.legend.some((t) => t.code === OUR_TAG) ? 'legend' : 'rise';
  const group = ourGroup === 'legend' ? season.legend : season.rise;
  // 레전드는 2위까지 PO 직행, 라이즈는 3위까지 플레이인 진출이 상위 시드선
  const seedCut = ourGroup === 'legend' ? 2 : 3;
  return {
    season,
    scenarios: computeScenarios(group, season.matches, OUR_TAG, seedCut),
    ourGroup,
    us: group.find((t) => t.code === OUR_TAG) ?? null,
    next: nextMatchOf(season.matches),
    recent: recentOf(season.matches),
    fetchedAt: new Date().toISOString(),
  };
}

export async function getSeason(force = false): Promise<SeasonBundle> {
  if (!force && cache && Date.now() - cache.at < TTL_MS) return cache.bundle;
  // 동시 요청이 겹쳐도 원본 호출은 한 번만
  if (!inflight) {
    inflight = build()
      .then((bundle) => {
        cache = { at: Date.now(), bundle };
        return bundle;
      })
      .finally(() => {
        inflight = null;
      });
  }
  try {
    return await inflight;
  } catch (e) {
    // 갱신에 실패하면 만료된 캐시라도 내보낸다 — 빈 화면보다 낫다
    if (cache) return cache.bundle;
    throw e;
  }
}

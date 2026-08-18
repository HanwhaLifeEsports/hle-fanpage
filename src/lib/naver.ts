/**
 * 네이버 e스포츠 기록 API 클라이언트 — POM 포인트와 선수 기록
 *
 * 왜 여기서 가져오는가:
 *  LoL Esports API 는 POM(경기 MVP)을 내려주지 않는다. 예전 구현이 경기 id 로
 *  선수를 골라 배정하는 샘플 값이었던 이유가 이것이고, 실제 기록과 달랐던 이유도
 *  이것이다. 네이버 기록 페이지(game.naver.com/esports/.../record/lck)가 쓰는
 *  내부 API 는 실제 값을 준다.
 *
 * 실측으로 확인한 것:
 *  - GET /service/v1/ranking/{leagueId}/player 가 리그 전체 선수 기록을 준다.
 *    쿼리 파라미터는 붙이지 않는다. bracket 이나 position 을 넘기면 400 이 돌아온다.
 *  - pogPoint 는 전부 100 의 배수다. 리그 합계 9000pt = 90회, 같은 시점의
 *    리그 경기 수(10팀 × 18경기 ÷ 2 = 90)와 정확히 일치한다.
 *    즉 세트가 아니라 '경기'마다 한 명에게 100pt 를 준다.
 *  - 응답에 access-control-allow-origin 이 없다 → 브라우저에서 직접 못 부른다.
 *    서버에서만 부르고 결과를 화면으로 넘긴다.
 *  - bracket 은 현재 전부 "regular" 다. 플레이오프 기록이 어떻게 붙는지는
 *    포스트시즌이 시작돼야 확인할 수 있다.
 *
 * 공개 문서가 없는 내부 API 라 경로가 예고 없이 바뀔 수 있다. 그래서 실패를
 * 정상 경로로 취급한다 — 기록을 못 가져와도 선수단 화면은 그대로 뜬다.
 */

const API = 'https://esports-api.game.naver.com/service/v1';

export const NAVER_LEAGUE_ID = 'lck_2026';

/** 한화생명e스포츠 (네이버 팀 id) */
export const NAVER_OUR_TEAM = 'R480';

/** 경기 MVP 한 명에게 주는 포인트. 포인트 ÷ 이 값 = 선정 횟수 */
export const POM_UNIT = 100;

export interface PlayerStat {
  naverId: string;
  nick: string;
  /** 시즌 누적 POM 포인트 */
  pom: number;
  /** 선정 횟수 */
  pomCount: number;
  /** POM 포인트 리그 순위. 동점은 같은 순위를 준다 (1, 2, 2, 4) */
  pomRank: number;
  kda: number;
  kills: number;
  deaths: number;
  assists: number;
  /** 킬 관여율 0~1 */
  killShare: number;
  /** 출전 세트 수 */
  sets: number;
  wins: number;
  losses: number;
}

/** 선수 id → 기록. 기록이 없는 선수는 키 자체가 없다 */
export type StatMap = Record<string, PlayerStat>;

/* ------------------------------------------------------------------ */
/* 원시 응답 (필요한 필드만)                                             */
/* ------------------------------------------------------------------ */

interface RawPlayer {
  playerId: string;
  teamId: string;
  wins: number;
  loses: number;
  addInfo: {
    kda: number;
    kills: number;
    deaths: number;
    assists: number;
    killInvolveRate: number;
    competeSetCount: number;
    pogPoint: number;
  };
  player: { nickName: string };
}

interface RawResponse {
  code: number;
  message: string | null;
  content: RawPlayer[];
}

/* ------------------------------------------------------------------ */
/* 수집                                                                */
/* ------------------------------------------------------------------ */

/**
 * POM 포인트 리그 순위. 동점자는 같은 순위를 받고 다음 순위를 건너뛴다.
 * 순위는 리그 전체에서 매겨야 의미가 있어서, 팀으로 거르기 전에 계산한다.
 */
function rankByPom(rows: RawPlayer[]): Map<string, number> {
  const sorted = [...rows].sort((a, b) => b.addInfo.pogPoint - a.addInfo.pogPoint);
  const out = new Map<string, number>();
  let rank = 0;
  let prev: number | null = null;
  sorted.forEach((r, i) => {
    if (r.addInfo.pogPoint !== prev) {
      rank = i + 1;
      prev = r.addInfo.pogPoint;
    }
    out.set(r.playerId, rank);
  });
  return out;
}

export async function fetchPlayerStats(
  teamId: string = NAVER_OUR_TEAM,
  leagueId: string = NAVER_LEAGUE_ID,
): Promise<StatMap> {
  const res = await fetch(`${API}/ranking/${leagueId}/player`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(8_000),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`naver ranking → HTTP ${res.status}`);

  const body = (await res.json()) as RawResponse;
  const rows = body.content ?? [];
  const ranks = rankByPom(rows);

  const out: StatMap = {};
  for (const r of rows) {
    if (r.teamId !== teamId) continue;
    const a = r.addInfo;
    out[r.playerId] = {
      naverId: r.playerId,
      nick: r.player.nickName,
      pom: a.pogPoint,
      pomCount: Math.round(a.pogPoint / POM_UNIT),
      pomRank: ranks.get(r.playerId) ?? 0,
      kda: a.kda,
      kills: a.kills,
      deaths: a.deaths,
      assists: a.assists,
      killShare: a.killInvolveRate,
      sets: a.competeSetCount,
      wins: r.wins,
      losses: r.loses,
    };
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* 캐시                                                                */
/* ------------------------------------------------------------------ */

/**
 * 기록은 경기가 끝나야 바뀐다. 10분이면 충분하고, 남의 내부 API 를
 * 방문자 수만큼 두드리지 않는 편이 예의에도 맞다.
 *
 * season.ts 에도 같은 모양의 캐시가 있다. 지금 하나로 묶으면 이 PR 이
 * 검증된 시즌 코드까지 건드리게 되어 따로 둔다.
 */
const TTL_MS = 10 * 60 * 1000;

let cache: { at: number; stats: StatMap } | null = null;
let inflight: Promise<StatMap> | null = null;

/**
 * 실패하면 null 을 준다. 던지지 않는 이유는, 이 값이 없다고 해서
 * 선수단 화면이 못 뜰 이유가 없기 때문이다.
 */
export async function getPlayerStats(): Promise<StatMap | null> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.stats;

  if (!inflight) {
    inflight = fetchPlayerStats()
      .then((stats) => {
        cache = { at: Date.now(), stats };
        return stats;
      })
      .finally(() => {
        inflight = null;
      });
  }

  try {
    return await inflight;
  } catch {
    // 갱신에 실패하면 만료된 값이라도 내보낸다 — 빈 칸보다 낫다
    return cache?.stats ?? null;
  }
}

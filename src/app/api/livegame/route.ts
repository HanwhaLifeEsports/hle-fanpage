import { getSeason } from '@/lib/season';
import { OUR_TAG } from '@/lib/lck2026';
import { fetchMatch, fetchSnapshot, pickGame, type MatchInfo, type Snapshot } from '@/lib/livestats';

/**
 * 실시간 스코어보드 데이터.
 *
 * 쿼리
 *  - match : 매치 id. 없으면 진행 중인 경기(우리 팀 우선), 그것도 없으면 우리 팀 최근 경기
 *  - game  : 세트 id. 없으면 진행 중인 세트, 없으면 마지막으로 끝난 세트
 *  - clock : 게임 시작으로부터 경과 초. 다시보기 타임라인이 쓴다
 *
 * 화면이 5초마다 물어보기 때문에 서버에서 짧게 뭉쳐 받는다. 시청자가 몇 명이든
 * 피드로 나가는 호출은 그대로다. 특정 시점(clock 지정)은 값이 변할 일이 없어 오래 들고 있는다.
 */
export const dynamic = 'force-dynamic';

const LIVE_TTL = 4_000;
const FIXED_TTL = 10 * 60 * 1000;
const MATCH_TTL = 30_000;

const cache = new Map<string, { at: number; ttl: number; value: unknown }>();

async function memo<T>(key: string, ttl: number, make: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < hit.ttl) return hit.value as T;
  const value = await make();
  cache.set(key, { at: Date.now(), ttl, value });
  // 다시보기 키가 무한정 쌓이지 않게 오래된 것부터 버린다
  if (cache.size > 240) for (const k of [...cache.keys()].slice(0, 80)) cache.delete(k);
  return value;
}

/** 지금 보여줄 매치 — 진행 중인 경기가 있으면 그것(우리 팀 우선), 없으면 우리 팀 최근 경기 */
async function defaultMatchId(): Promise<string | null> {
  const { season } = await getSeason();
  const playing = season.matches.filter((m) => m.state === 'inProgress');
  const ours = (m: (typeof season.matches)[number]) => m.a.code === OUR_TAG || m.b.code === OUR_TAG;
  if (playing.length) return (playing.find(ours) ?? playing[0]).id;

  return (
    season.matches
      .filter((m) => m.state === 'completed' && ours(m))
      .sort((x, y) => y.startTime.localeCompare(x.startTime))[0]?.id ?? null
  );
}

export interface LiveGamePayload {
  snapshot: Snapshot;
  /** 다음 폴링까지 권장 대기(ms). null 이면 더 볼 것이 없다는 뜻 */
  pollMs: number | null;
}

/**
 * 다음 폴링 간격.
 *
 * 진행 중인 세트면 5초. 세트가 막 끝났어도 다음 세트가 남아 있으면 느리게라도
 * 계속 물어야 한다 — 안 그러면 1세트 종료 화면에 멈춘 채 2세트를 놓친다.
 * 사용자가 세트를 직접 고른 경우는 그 세트를 보겠다는 뜻이므로 넘어가지 않는다.
 */
function pollFor(snapshot: Snapshot, pinned: boolean): number | null {
  if (snapshot.live) return 5_000;
  if (pinned) return null;
  const ongoing = snapshot.games.some((g) => g.state === 'inProgress' || g.state === 'unstarted');
  return ongoing ? 30_000 : null;
}

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams;
  const clockRaw = q.get('clock');
  const clock = clockRaw == null ? undefined : Math.max(0, Math.floor(Number(clockRaw)));

  try {
    const matchId = q.get('match') ?? (await defaultMatchId());
    if (!matchId) return fail('보여줄 경기를 찾지 못했습니다', 404);

    const match = await memo(`match:${matchId}`, MATCH_TTL, () => fetchMatch(matchId));
    const pinned = q.get('game');
    const game = pickOne(match, pinned);
    if (!game) return fail('아직 시작한 세트가 없습니다', 404);

    const key = `snap:${game.id}:${clock ?? 'live'}`;
    const snapshot = await memo(key, clock == null ? LIVE_TTL : FIXED_TTL, () =>
      fetchSnapshot(match, game, clock),
    );

    const body: LiveGamePayload = { snapshot, pollMs: pollFor(snapshot, pinned != null) };
    return Response.json(body, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'unknown', 502);
  }
}

function pickOne(match: MatchInfo, id: string | null) {
  if (id) return match.games.find((g) => g.id === id) ?? null;
  return pickGame(match.games);
}

function fail(error: string, status: number) {
  return Response.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } });
}

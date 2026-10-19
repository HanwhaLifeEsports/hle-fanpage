import { call, type MatchRow } from './lolesports';
import { OUR_TAG } from './lck2026';
import { dataDragonVersionForPatch } from './ddragon';
import { getVerifiedBans } from './live-draft';

const WORLDS_LEAGUE_ID = '98767975604431411';
const FEED = 'https://feed.lolesports.com/livestats/v1';
const MAX_CACHE = 100;

const memo = new Map<string, { until: number; value?: unknown; pending?: Promise<unknown> }>();

async function cached<T>(key: string, ttl: number, fn: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const prev = memo.get(key);
  if (prev?.value !== undefined && prev.until > now) return prev.value as T;
  if (prev?.pending) return prev.pending as Promise<T>;
  const pending = fn()
    .then((value) => {
      memo.set(key, { until: Date.now() + ttl, value });
      if (memo.size > MAX_CACHE) {
        const oldest = memo.keys().next().value;
        if (oldest) memo.delete(oldest);
      }
      return value;
    })
    .catch((error) => {
      if (prev?.value !== undefined) {
        memo.set(key, { until: Date.now() + Math.min(ttl, 30_000), value: prev.value });
        return prev.value as T;
      }
      memo.delete(key);
      throw error;
    });
  memo.set(key, { until: now + ttl, pending });
  return pending;
}

type RawTeam = {
  id?: string;
  code?: string;
  name?: string;
  image?: string;
  result?: { outcome?: string; gameWins?: number };
};
type RawGame = {
  id: string;
  number: number;
  state: 'completed' | 'inProgress' | 'unstarted';
  teams?: { id: string; side: string }[];
};
type RawEvent = {
  id?: string;
  state?: string;
  startTime?: string;
  blockName?: string;
  type?: string;
  league?: { id: string; name?: string };
  match?: {
    id: string;
    strategy?: { count: number };
    teams: RawTeam[];
    games?: RawGame[];
  };
};
type RawEvents = {
  data?: {
    schedule?: {
      events?: RawEvent[];
      pages?: { older?: string | null; newer?: string | null };
    };
  };
};
type RawEventDetails = { data?: { event?: RawEvent } };

export type MatchGame = {
  id: string;
  number: number;
  state: RawGame['state'];
};

export interface LivePlayer {
  id: number;
  name: string;
  role: string;
  championId: string;
  kills: number | null;
  deaths: number | null;
  assists: number | null;
  cs: number | null;
  gold: number | null;
  level: number | null;
  items: number[];
}

export interface LiveTeam {
  code: string;
  name: string;
  image: string;
  side: 'blue' | 'red';
  gamesWon: number | null;
  kills: number | null;
  gold: number | null;
  towers: number | null;
  barons: number | null;
  dragons: string[];
  players: LivePlayer[];
  bans: string[] | null;
  fearless: string[];
}

export interface MatchSnapshot {
  matchId: string;
  competition: string;
  gameId: string | null;
  gameNumber: number | null;
  games: MatchGame[];
  state: 'scheduled' | 'inGame' | 'betweenGames' | 'finished';
  sourceUpdatedAt: string | null;
  checkedAt: string;
  stale: boolean;
  patchVersion: string | null;
  assetVersion: string | null;
  blue: LiveTeam | null;
  red: LiveTeam | null;
  draftSource: string | null;
}

function isHle(team: RawTeam): boolean {
  return team.code?.toUpperCase() === OUR_TAG || /hanwha\s*life|한화생명/i.test(team.name || '');
}

function normalizeEvent(row: RawEvent): MatchRow | null {
  if (!row.match?.id || row.match.teams?.length !== 2 || row.type !== 'match') return null;
  const [a, b] = row.match.teams;
  if (!isHle(a) && !isHle(b)) return null;
  const side = (x: RawTeam) => ({
    code: x.code || 'TBD',
    name: x.name || '미정',
    image: x.image || '',
    games: x.result?.gameWins ?? null,
    win: x.result?.outcome ? x.result.outcome === 'win' : null,
  });
  const completed = row.state === 'completed';
  const state = completed ? 'completed' : row.state === 'inProgress' ? 'inProgress' : 'unstarted';
  return {
    id: row.match.id,
    startTime: row.startTime || '',
    state,
    bo: row.match.strategy?.count || 5,
    blockName: row.blockName ? '월즈 · ' + row.blockName : '월드 챔피언십',
    stage: 'other',
    a: side(a),
    b: side(b),
  };
}

/** 2026 국제대회(월즈 포함)의 HLE 경기 목록. 현재 LCK 정규시즌 표를 오염시키지 않는다. */
export async function getWorldsMatches(): Promise<MatchRow[]> {
  return cached('worlds-schedule', 5 * 60_000, async () => {
    const first = await call<RawEvents>('getSchedule?hl=ko-KR&leagueId=' + WORLDS_LEAGUE_ID);
    const schedule = first.data?.schedule;
    const events = [...(schedule?.events || [])];
    // 초기 창이 2025와 2026을 함께 포함할 수 있어 최신 페이지도 확인한다.
    const token = schedule?.pages?.newer;
    if (token) {
      try {
        const next = await call<RawEvents>('getSchedule?hl=ko-KR&leagueId=' + WORLDS_LEAGUE_ID + '&pageToken=' + encodeURIComponent(token));
        events.push(...(next.data?.schedule?.events || []));
      } catch {
        // 첫 페이지가 정상이면 그 기록만으로 운영한다.
      }
    }
    const seen = new Set<string>();
    return events
      .map(normalizeEvent)
      .filter((m): m is MatchRow => !!m && !!m.startTime && !seen.has(m.id) && !!seen.add(m.id))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  });
}

export async function findLiveHleMatch(): Promise<string | null> {
  return cached('hle-live-id', 25_000, async () => {
    const live = await call<RawEvents>('getLive?hl=ko-KR');
    const events = live.data?.schedule?.events || [];
    const hle = events.find((e) => e.match?.teams?.some(isHle));
    return hle?.match?.id || null;
  });
}

async function feedJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(10_000),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('livestats HTTP ' + response.status);
  return (await response.json()) as T;
}

type RawPlayerMeta = {
  participantId: number;
  summonerName?: string;
  championId?: string;
  role?: string;
};
type RawFeedTeam = {
  totalGold?: number;
  totalKills?: number;
  towers?: number;
  barons?: number;
  dragons?: string[];
  participants?: {
    participantId: number;
    totalGold?: number;
    kills?: number;
    deaths?: number;
    assists?: number;
    creepScore?: number;
    level?: number;
  }[];
};
type RawWindow = {
  gameMetadata?: {
    patchVersion?: string;
    blueTeamMetadata?: { esportsTeamId: string; participantMetadata?: RawPlayerMeta[] };
    redTeamMetadata?: { esportsTeamId: string; participantMetadata?: RawPlayerMeta[] };
  };
  frames?: {
    rfc460Timestamp?: string;
    gameState?: string;
    blueTeam?: RawFeedTeam;
    redTeam?: RawFeedTeam;
  }[];
};
type RawDetails = { frames?: { rfc460Timestamp?: string; participants?: { participantId: number; items?: number[] }[] }[] };

function blankTeam(side: 'blue' | 'red', rawTeams: RawTeam[], id?: string): LiveTeam {
  const t = rawTeams.find((team) => team.id === id);
  return {
    code: t?.code || (side === 'blue' ? 'BLUE' : 'RED'),
    name: t?.name || (side === 'blue' ? '블루팀' : '레드팀'),
    image: t?.image || '',
    side,
    gamesWon: t?.result?.gameWins ?? null,
    kills: null,
    gold: null,
    towers: null,
    barons: null,
    dragons: [],
    players: [],
    bans: null,
    fearless: [],
  };
}

function filledTeam(
  side: 'blue' | 'red',
  teams: RawTeam[],
  id: string | undefined,
  meta: RawPlayerMeta[] | undefined,
  raw: RawFeedTeam | undefined,
  detailMap: Map<number, number[]>,
): LiveTeam {
  const team = blankTeam(side, teams, id);
  team.kills = raw?.totalKills ?? null;
  team.gold = raw?.totalGold ?? null;
  team.towers = raw?.towers ?? null;
  team.barons = raw?.barons ?? null;
  team.dragons = raw?.dragons || [];
  const stats = new Map((raw?.participants || []).map((p) => [p.participantId, p]));
  team.players = (meta || []).map((p) => {
    const s = stats.get(p.participantId);
    return {
      id: p.participantId,
      name: p.summonerName || '',
      role: p.role || '',
      championId: p.championId || '',
      kills: s?.kills ?? null,
      deaths: s?.deaths ?? null,
      assists: s?.assists ?? null,
      cs: s?.creepScore ?? null,
      gold: s?.totalGold ?? null,
      level: s?.level ?? null,
      items: detailMap.get(p.participantId) || [],
    };
  });
  return team;
}

function currentGame(games: RawGame[], preferred?: number): RawGame | undefined {
  if (preferred !== undefined) return games.find((g) => g.number === preferred);
  return games.find((g) => g.state === 'inProgress') ||
    [...games].reverse().find((g) => g.state === 'completed');
}

/** 게임 선택이 바뀔 때도 한 프레임의 선수·팀 통계를 함께 전달한다. */
export async function getMatchSnapshot(matchId: string, gameNumber?: number): Promise<MatchSnapshot> {
  const id = String(matchId);
  if (!/^\d{10,22}$/.test(id)) throw new Error('유효하지 않은 경기 ID');
  const cacheKey = 'match-' + id + '-' + (gameNumber ?? 'current');
  return cached(cacheKey, 10_000, async () => {
    const details = await call<RawEventDetails>('getEventDetails?hl=ko-KR&id=' + id);
    const event = details.data?.event;
    if (!event?.match) throw new Error('경기 정보를 찾을 수 없습니다');
    const teams = event.match.teams || [];
    const rawGames = event.match.games || [];
    const games: MatchGame[] = rawGames.map((g) => ({ id: g.id, number: g.number, state: g.state }));
    const selected = currentGame(rawGames, gameNumber);
    const allFinished = rawGames.length > 0 && rawGames.every((g) => g.state === 'completed');
    const empty: MatchSnapshot = {
      matchId: id,
      competition: event.league?.name || 'LoL Esports',
      gameId: selected?.id || null,
      gameNumber: selected?.number || null,
      games,
      state: allFinished ? 'finished' : selected?.state === 'inProgress' ? 'inGame' :
        selected ? 'betweenGames' : 'scheduled',
      sourceUpdatedAt: null,
      checkedAt: new Date().toISOString(),
      stale: false,
      patchVersion: null,
      assetVersion: null,
      blue: null,
      red: null,
      draftSource: null,
    };
    if (!selected) return empty;

    // 과거 경기도 최신 프레임을 받도록 현재 시각을 startingTime 으로 넘긴다.
    // Riot rejects live windows ending <20 seconds before now; use an aligned time 60s back.
    const startingTime = encodeURIComponent(new Date(Math.floor((Date.now() - 60_000) / 10_000) * 10_000).toISOString());
    const urlSuffix = '/' + selected.id + '?startingTime=' + startingTime;
    const [windowResult, detailResult] = await Promise.allSettled([
      feedJson<RawWindow>(FEED + '/window' + urlSuffix),
      feedJson<RawDetails>(FEED + '/details' + urlSuffix),
    ]);
    if (windowResult.status !== 'fulfilled') {
      return { ...empty, stale: true };
    }
    const win = windowResult.value;
    const frame = win.frames?.at(-1);
    const dframe = detailResult.status === 'fulfilled' ? detailResult.value.frames?.at(-1) : null;
    const detailMap = new Map<number, number[]>();
    for (const p of dframe?.participants || []) {
      detailMap.set(p.participantId, Array.isArray(p.items) ? p.items.filter(Number.isFinite) : []);
    }
    const meta = win.gameMetadata;
    if (!meta || !frame) return { ...empty, stale: true };
    const blue = filledTeam(
      'blue', teams, meta.blueTeamMetadata?.esportsTeamId,
      meta.blueTeamMetadata?.participantMetadata, frame.blueTeam, detailMap,
    );
    const red = filledTeam(
      'red', teams, meta.redTeamMetadata?.esportsTeamId,
      meta.redTeamMetadata?.participantMetadata, frame.redTeam, detailMap,
    );
    const historicalPicks = await Promise.all(
      rawGames.filter((g) => g.number < selected.number && g.state === 'completed').map((g) =>
        cached('previous-picks-' + g.id, 30 * 60_000, async () => {
          const past = await feedJson<RawWindow>(FEED + '/window/' + g.id);
          return [
            ...(past.gameMetadata?.blueTeamMetadata?.participantMetadata || []).map((p) => p.championId || ''),
            ...(past.gameMetadata?.redTeamMetadata?.participantMetadata || []).map((p) => p.championId || ''),
          ].filter(Boolean);
        }).catch(() => [] as string[]),
      ),
    );
    const fearless = [...new Set(historicalPicks.flat())];
    blue.fearless = fearless;
    red.fearless = fearless;
    const assetVersion = await dataDragonVersionForPatch(meta.patchVersion);
    if (teams.some(isHle)) {
      const bans = await getVerifiedBans(frame.rfc460Timestamp || null, selected.number, blue, red, meta.patchVersion || null);
      if (bans) { blue.bans = bans.blue; red.bans = bans.red; }
    }
    return {
      ...empty,
      sourceUpdatedAt: frame.rfc460Timestamp || null,
      patchVersion: meta.patchVersion || null,
      assetVersion,
      draftSource: blue.bans && red.bans ? 'Leaguepedia' : null,
      stale: !frame.rfc460Timestamp ||
        (selected.state === 'inProgress' && Date.now() - Date.parse(frame.rfc460Timestamp) > 6 * 60_000),
      blue,
      red,
    };
  });
}

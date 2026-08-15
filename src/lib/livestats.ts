/**
 * LoL Esports 라이브스탯 피드 — 방송 옵저버가 보는 그 데이터.
 *
 * 중계 화면 우하단 스코어보드에 뜨는 값(레벨·KDA·CS·골드·아이템·체력·오브젝트)이
 * 그대로 내려온다. Riot 공식 개발자 포털에는 문서가 없고, lolesports.com 이
 * 자기 중계 페이지에서 쓰는 엔드포인트다.
 *
 * [실측으로 확인한 것 — 2026-08 기준]
 *  - feed.lolesports.com 은 CORS 헤더가 없다. Origin 을 붙이면 403 이 떨어져서
 *    브라우저에서 직접 못 부른다 → 반드시 서버(/api/livegame)를 거쳐야 한다.
 *    esports-api.lolesports.com 쪽은 CORS 가 열려 있는 것과 대조적이다.
 *  - startingTime 은 10초 배수로 반올림해야 한다. 아니면 400.
 *  - startingTime 이 실시간 기준 약 25초 이내로 최근이면 400. 피드가 그만큼 늦다.
 *    시계 오차까지 보고 60초를 물린다.
 *  - 경기 시작 이전 시각을 요청하면 204 (본문 없음).
 *  - 경기 종료 이후 시각을 요청하면 200 + 마지막 프레임을 그대로 준다(클램프).
 *    덕분에 종료 시각을 이분탐색 없이 한 방에 알 수 있다.
 *  - 한 번 호출하면 그 10초 구간의 프레임이 30개쯤 들어온다. 우리는 마지막 것만 쓴다.
 *  - window 는 팀·오브젝트·기본 스탯, details 는 아이템·룬·딜지분을 준다. 둘 다 필요하다.
 *
 * [피드에 없는 것]
 *  - 소환사 주문. 중계 화면에는 있지만 이 피드로는 안 내려온다.
 *  - 미니맵 좌표, 스킬 쿨다운, 마나.
 */

import { call } from './lolesports';

const FEED = 'https://feed.lolesports.com/livestats/v1';

/** 피드가 실시간보다 늦는 폭. 실측 하한은 약 25초 */
const FEED_LAG_MS = 60_000;

export type Side = 'blue' | 'red';
export type Role = 'top' | 'jungle' | 'mid' | 'bottom' | 'support';
export type GameState = 'in_game' | 'paused' | 'finished';
export type DragonType = 'infernal' | 'mountain' | 'ocean' | 'cloud' | 'hextech' | 'chemtech' | 'elder';

const ROLE_ORDER: Role[] = ['top', 'jungle', 'mid', 'bottom', 'support'];

/* ------------------------------------------------------------------ */
/* 원시 응답 타입 (필요한 필드만)                                        */
/* ------------------------------------------------------------------ */

interface RawWindow {
  esportsGameId: string;
  esportsMatchId: string;
  gameMetadata: {
    patchVersion: string;
    blueTeamMetadata: RawTeamMeta;
    redTeamMetadata: RawTeamMeta;
  };
  frames: RawWindowFrame[];
}

interface RawTeamMeta {
  esportsTeamId: string;
  participantMetadata: {
    participantId: number;
    esportsPlayerId: string;
    summonerName: string;
    championId: string;
    role: Role;
  }[];
}

interface RawWindowFrame {
  rfc460Timestamp: string;
  gameState: GameState;
  blueTeam: RawWindowTeam;
  redTeam: RawWindowTeam;
}

interface RawWindowTeam {
  totalGold: number;
  inhibitors: number;
  towers: number;
  barons: number;
  totalKills: number;
  dragons: DragonType[];
  participants: {
    participantId: number;
    totalGold: number;
    level: number;
    kills: number;
    deaths: number;
    assists: number;
    creepScore: number;
    currentHealth: number;
    maxHealth: number;
  }[];
}

interface RawDetails {
  frames: {
    rfc460Timestamp: string;
    participants: {
      participantId: number;
      killParticipation: number;
      championDamageShare: number;
      wardsPlaced: number;
      wardsDestroyed: number;
      items: number[];
      perkMetadata: { styleId: number; subStyleId: number; perks: number[] };
    }[];
  }[];
}

interface RawEventDetails {
  data: {
    event: {
      match: {
        strategy?: { count: number };
        teams: {
          id: string;
          code: string;
          name: string;
          image: string;
          result?: { gameWins: number };
        }[];
        games: {
          id: string;
          number: number;
          state: 'completed' | 'inProgress' | 'unstarted' | 'unneeded';
          teams: { id: string; side: Side }[];
        }[];
      };
    };
  };
}

/* ------------------------------------------------------------------ */
/* 정규화 결과 타입 — 화면이 쓰는 모양                                    */
/* ------------------------------------------------------------------ */

export interface LivePlayer {
  id: number;
  /** 팀 접두어를 뗀 선수명 ("HLE Zeka" → "Zeka") */
  name: string;
  role: Role;
  champion: string;
  championIcon: string;
  level: number;
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  gold: number;
  hp: number;
  hpMax: number;
  /** 6칸 고정. 빈 칸은 null — 자리를 유지해야 줄이 흔들리지 않는다 */
  items: (string | null)[];
  keystone: string | null;
  /** 0~1 */
  damageShare: number;
  killParticipation: number;
  wardsPlaced: number;
  wardsKilled: number;
}

export interface LiveTeam {
  side: Side;
  code: string;
  name: string;
  image: string;
  /** 이 매치에서 딴 세트 수 */
  seriesWins: number;
  gold: number;
  kills: number;
  towers: number;
  inhibitors: number;
  barons: number;
  dragons: DragonType[];
  players: LivePlayer[];
}

export interface GameRef {
  id: string;
  number: number;
  state: 'completed' | 'inProgress' | 'unstarted' | 'unneeded';
}

export interface Snapshot {
  matchId: string;
  gameId: string;
  gameNumber: number;
  bo: number;
  games: GameRef[];
  state: GameState;
  /** 이 프레임이 진행 중 경기의 최신 프레임인가 */
  live: boolean;
  /** 프레임 시각 */
  at: string;
  /** 게임 내 경과 시간(초) */
  clock: number;
  /** 종료된 경기의 총 길이(초). 진행 중이면 null */
  duration: number | null;
  patch: string;
  blue: LiveTeam;
  red: LiveTeam;
}

/* ------------------------------------------------------------------ */
/* 피드 호출                                                            */
/* ------------------------------------------------------------------ */

/** 피드가 받는 형식 — 10초 배수 + 밀리초 없는 ISO */
export function feedTime(ms: number): string {
  return new Date(Math.floor(ms / 10_000) * 10_000).toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/** 지금 요청할 수 있는 가장 최근 시각 */
function latestRequestable(): string {
  return feedTime(Date.now() - FEED_LAG_MS);
}

/** 204(경기 시작 전)는 null. 그 외 실패는 던진다. */
async function feed<T>(path: string): Promise<T | null> {
  const res = await fetch(`${FEED}/${path}`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(12_000),
    cache: 'no-store',
  });
  if (res.status === 204) return null;
  if (!res.ok) throw new Error(`livestats ${path.split('?')[0]} → HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

const at = (t?: string) => (t ? `?startingTime=${t}` : '');

/* ------------------------------------------------------------------ */
/* 캐시                                                                */
/* ------------------------------------------------------------------ */

/** 게임 시작·종료 시각. 한 번 정해지면 안 바뀌므로 무기한 들고 있는다. */
const bounds = new Map<string, { startMs: number; endMs: number | null }>();

/**
 * 경기 시작 시각과, 이미 끝났다면 종료 시각.
 *
 * startingTime 없이 부르면 가장 이른 프레임(=게임 시작)을 준다.
 * 요청 가능한 가장 최근 시각으로 부르면 진행 중이면 그때 프레임을,
 * 이미 끝났으면 마지막 프레임을 클램프해서 준다.
 */
async function gameBounds(gameId: string) {
  const hit = bounds.get(gameId);
  if (hit?.endMs != null) return hit;

  const [head, tail] = await Promise.all([
    hit ? null : feed<RawWindow>(`window/${gameId}`),
    feed<RawWindow>(`window/${gameId}${at(latestRequestable())}`),
  ]);

  const startMs = hit?.startMs ?? (head?.frames.length ? +new Date(head.frames[0].rfc460Timestamp) : null);
  if (startMs == null) throw new Error('아직 시작하지 않은 경기입니다');

  const last = tail?.frames.at(-1);
  const next = {
    startMs,
    endMs: last && last.gameState === 'finished' ? +new Date(last.rfc460Timestamp) : null,
  };
  bounds.set(gameId, next);
  return next;
}

/* ------------------------------------------------------------------ */
/* 매치 · 세트 해석                                                      */
/* ------------------------------------------------------------------ */

export interface MatchInfo {
  matchId: string;
  bo: number;
  games: GameRef[];
  teams: Record<string, { code: string; name: string; image: string; seriesWins: number }>;
  /** 세트별 진영 배치: gameId → { blue: teamId, red: teamId } */
  sides: Record<string, Record<Side, string>>;
}

export async function fetchMatch(matchId: string): Promise<MatchInfo> {
  const d = await call<RawEventDetails>(`getEventDetails?hl=ko-KR&id=${matchId}`);
  const m = d.data.event.match;

  const teams: MatchInfo['teams'] = {};
  for (const t of m.teams) {
    teams[t.id] = {
      code: t.code,
      name: t.name,
      // API 가 http 로 준다. 그대로 두면 https 페이지에서 혼합 콘텐츠로 막힌다
      image: t.image.replace(/^http:/, 'https:'),
      seriesWins: t.result?.gameWins ?? 0,
    };
  }

  const sides: MatchInfo['sides'] = {};
  for (const g of m.games) {
    const map = {} as Record<Side, string>;
    for (const t of g.teams) map[t.side] = t.id;
    sides[g.id] = map;
  }

  return {
    matchId,
    bo: m.strategy?.count ?? 3,
    games: m.games.map((g) => ({ id: g.id, number: g.number, state: g.state })),
    teams,
    sides,
  };
}

/** 매치에서 지금 보여줄 세트 — 진행 중인 것, 없으면 마지막으로 끝난 것 */
export function pickGame(games: GameRef[]): GameRef | null {
  return (
    games.find((g) => g.state === 'inProgress') ??
    [...games].reverse().find((g) => g.state === 'completed') ??
    null
  );
}

/* ------------------------------------------------------------------ */
/* 아이콘                                                              */
/* ------------------------------------------------------------------ */

const DDRAGON = 'https://ddragon.leagueoflegends.com/cdn';

/**
 * 피드의 patchVersion 은 "16.15.800.4844" 처럼 4자리다.
 * Data Dragon 은 "16.15.1" 형태라 앞 두 자리로 맞춰 찾고, 없으면 최신으로 떨어진다.
 */
let versions: { at: number; list: string[] } | null = null;

async function ddragonVersion(patch: string): Promise<string> {
  if (!versions || Date.now() - versions.at > 6 * 60 * 60 * 1000) {
    const res = await fetch('https://ddragon.leagueoflegends.com/api/versions.json', {
      signal: AbortSignal.timeout(8_000),
      next: { revalidate: 21_600 },
    });
    versions = { at: Date.now(), list: (await res.json()) as string[] };
  }
  const [maj, min] = patch.split('.');
  return versions.list.find((v) => v.startsWith(`${maj}.${min}.`)) ?? versions.list[0];
}

/** 룬 id → 아이콘 경로. 패치마다 바뀌지 않으므로 버전별로 한 번만 받는다. */
const runeCache = new Map<string, Map<number, string>>();

async function runeIcons(version: string): Promise<Map<number, string>> {
  const hit = runeCache.get(version);
  if (hit) return hit;

  const map = new Map<number, string>();
  try {
    const res = await fetch(`${DDRAGON}/${version}/data/ko_KR/runesReforged.json`, {
      signal: AbortSignal.timeout(8_000),
      next: { revalidate: 86_400 },
    });
    const styles = (await res.json()) as {
      slots: { runes: { id: number; icon: string }[] }[];
    }[];
    for (const s of styles) for (const slot of s.slots) for (const r of slot.runes) map.set(r.id, r.icon);
  } catch {
    // 룬 아이콘은 있으면 좋은 정보다. 못 받아도 나머지 화면은 그대로 나가야 한다.
  }
  runeCache.set(version, map);
  return map;
}

/* ------------------------------------------------------------------ */
/* 스냅샷                                                              */
/* ------------------------------------------------------------------ */

/**
 * 한 시점의 경기 상태.
 *
 * @param clock 게임 시작으로부터 몇 초 지난 시점을 볼지. 없으면 최신.
 *              범위를 벗어나면 시작·종료(또는 요청 가능한 최신) 시점으로 잘린다.
 */
export async function fetchSnapshot(match: MatchInfo, game: GameRef, clock?: number): Promise<Snapshot> {
  const b = await gameBounds(game.id);

  // 요청 가능한 상한(실시간 - 60초)과 경기 종료 시각 중 이른 쪽을 넘지 않는다
  const ceiling = Math.min(b.endMs ?? Infinity, Date.now() - FEED_LAG_MS);
  const wantMs = Math.min(clock == null ? ceiling : Math.max(b.startMs + clock * 1000, b.startMs), ceiling);
  const t = feedTime(wantMs);

  const [win, det] = await Promise.all([
    feed<RawWindow>(`window/${game.id}${at(t)}`),
    feed<RawDetails>(`details/${game.id}${at(t)}`).catch(() => null),
  ]);
  const frame = win?.frames.at(-1);
  if (!win || !frame) throw new Error('해당 시점의 프레임이 없습니다');

  const version = await ddragonVersion(win.gameMetadata.patchVersion);
  const runes = await runeIcons(version);
  const extra = new Map((det?.frames.at(-1)?.participants ?? []).map((p) => [p.participantId, p]));

  const build = (side: Side): LiveTeam => {
    const meta = side === 'blue' ? win.gameMetadata.blueTeamMetadata : win.gameMetadata.redTeamMetadata;
    const raw = side === 'blue' ? frame.blueTeam : frame.redTeam;
    const team = match.teams[meta.esportsTeamId];
    const stats = new Map(raw.participants.map((p) => [p.participantId, p]));

    const players: LivePlayer[] = meta.participantMetadata
      .map((p) => {
        const s = stats.get(p.participantId);
        const e = extra.get(p.participantId);
        const items = e?.items ?? [];
        return {
          id: p.participantId,
          // "HLE Zeka" 처럼 팀 태그가 붙어 온다. 패널에 팀은 이미 있으니 뗀다.
          name: p.summonerName.replace(/^\S+\s+/, ''),
          role: p.role,
          champion: p.championId,
          championIcon: `${DDRAGON}/${version}/img/champion/${p.championId}.png`,
          level: s?.level ?? 0,
          kills: s?.kills ?? 0,
          deaths: s?.deaths ?? 0,
          assists: s?.assists ?? 0,
          cs: s?.creepScore ?? 0,
          gold: s?.totalGold ?? 0,
          hp: s?.currentHealth ?? 0,
          hpMax: s?.maxHealth ?? 0,
          items: Array.from({ length: 6 }, (_, i) =>
            items[i] ? `${DDRAGON}/${version}/img/item/${items[i]}.png` : null,
          ),
          keystone: keystoneIcon(e?.perkMetadata?.perks?.[0], runes),
          damageShare: e?.championDamageShare ?? 0,
          killParticipation: e?.killParticipation ?? 0,
          wardsPlaced: e?.wardsPlaced ?? 0,
          wardsKilled: e?.wardsDestroyed ?? 0,
        };
      })
      .sort((x, y) => ROLE_ORDER.indexOf(x.role) - ROLE_ORDER.indexOf(y.role));

    return {
      side,
      code: team?.code ?? (side === 'blue' ? 'BLUE' : 'RED'),
      name: team?.name ?? '',
      image: team?.image ?? '',
      seriesWins: team?.seriesWins ?? 0,
      gold: raw.totalGold,
      kills: raw.totalKills,
      towers: raw.towers,
      inhibitors: raw.inhibitors,
      barons: raw.barons,
      dragons: raw.dragons,
      players,
    };
  };

  const frameMs = +new Date(frame.rfc460Timestamp);
  return {
    matchId: match.matchId,
    gameId: game.id,
    gameNumber: game.number,
    bo: match.bo,
    games: match.games,
    state: frame.gameState,
    live: game.state === 'inProgress' && frame.gameState !== 'finished',
    at: frame.rfc460Timestamp,
    // 첫 프레임을 0:00 으로 잡는다. 실제 인게임 타이머와 1~2초 어긋날 수 있다.
    clock: Math.max(0, Math.round((frameMs - b.startMs) / 1000)),
    duration: b.endMs != null ? Math.round((b.endMs - b.startMs) / 1000) : null,
    patch: win.gameMetadata.patchVersion,
    blue: build('blue'),
    red: build('red'),
  };
}

function keystoneIcon(id: number | undefined, runes: Map<number, string>): string | null {
  const icon = id == null ? undefined : runes.get(id);
  return icon ? `${DDRAGON}/img/${icon}` : null;
}

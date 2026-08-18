/**
 * Leaguepedia (lol.fandom.com) Cargo API — 선수별 챔피언 픽과 세트 승패.
 *
 * 왜 여기서 가져오는가:
 *  LoL Esports API 는 세트별 챔피언은 주지만 '누가 이겼는지' 를 말해 주지 않는다.
 *  경기 종료 프레임의 억제기·타워 수로 추론할 수는 있고 실제로 검증했을 때
 *  정답을 아는 14세트에서 전부 맞았지만, 그건 증거지 증명이 아니다.
 *  Leaguepedia 의 ScoreboardPlayers 는 PlayerWin 을 직접 준다. 추론이 없다.
 *
 * 실측으로 확인한 것:
 *  - 익명 요청은 대략 1분에 1회로 제한된다(ratelimited). 로그인하면 풀린다.
 *  - 자격증명이 없으면 익명으로 시도한다. 화면이 못 뜰 이유는 없고,
 *    캐시 덕분에 실제 호출 빈도도 낮다.
 *  - Champion 은 표시명(Jarvan IV)으로 온다. 한글화는 ddragon.ts 가 맡는다.
 *  - Link 는 선수 문서 이름이라 동명이인이면 괄호가 붙는다 (Zeka (Kim Geon-woo)).
 *    그래서 닉네임이 아니라 이 값을 연결 키로 쓴다.
 *
 * [서버 전용]
 * 봇 비밀번호는 진짜 비밀번호다. NEXT_PUBLIC_ 이 아니므로 브라우저 번들에
 * 실리지 않지만, 이 파일을 클라이언트 컴포넌트에서 import 하지 않도록 주의한다.
 * 화면이 필요로 하는 타입은 champions.ts 에 따로 두었다.
 */

import { championLocalizer } from './ddragon';
import { foldPicks, gameMinutes, type ChampionMap, type PickRow } from './champions';
import { PLAYERS, STAFF } from './lck2026';

const API = 'https://lol.fandom.com/api.php';

/** 위키가 요구하는 식별. 연락처를 넣어 두면 문제가 생겼을 때 우리에게 먼저 온다 */
const UA = 'hle-fanpage/1.0 (fan site; protect@gumayu.si)';

const TEAM = 'Hanwha Life Esports';

/**
 * 정규시즌 1~4라운드 전체를 본다 (Rounds 1-2 + Rounds 3-4).
 *
 * 같은 2026 시즌 아래 컵 대회(LCK/2026 Season/Cup)와 MSI 선발전
 * (Road to MSI)도 있지만 섞지 않는다. 프로필의 다른 기록(POM·KDA)이
 * 정규시즌 기준이라, 챔피언만 범위가 다르면 같은 화면에서 숫자가 어긋나 보인다.
 *
 * 화면에는 "2026 LCK 챔피언 픽" 으로 적고 각주에 "정규시즌 1~4라운드" 를 붙인다.
 * 대회 이름만 적으면 컵과 선발전까지 센 것처럼 읽힌다.
 */
const TOURNAMENTS = ['LCK/2026 Season/Rounds 1-2', 'LCK/2026 Season/Rounds 3-4'];

/* ------------------------------------------------------------------ */
/* MediaWiki 세션                                                      */
/* ------------------------------------------------------------------ */

/** fetch 는 쿠키를 자동으로 들고 다니지 않는다. 로그인 세션을 직접 보관한다 */
let jar: Record<string, string> = {};

function absorb(res: Response) {
  for (const c of res.headers.getSetCookie?.() ?? []) {
    const [kv] = c.split(';');
    const i = kv.indexOf('=');
    if (i > 0) jar[kv.slice(0, i).trim()] = kv.slice(i + 1).trim();
  }
}

async function call(params: Record<string, string>, method: 'GET' | 'POST' = 'GET') {
  const body = new URLSearchParams({ format: 'json', ...params });
  const headers: Record<string, string> = { 'User-Agent': UA };
  const cookie = Object.entries(jar)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
  if (cookie) headers.Cookie = cookie;

  const res =
    method === 'POST'
      ? await fetch(API, {
          method: 'POST',
          body,
          headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' },
          signal: AbortSignal.timeout(15_000),
          cache: 'no-store',
        })
      : await fetch(`${API}?${body}`, {
          headers,
          signal: AbortSignal.timeout(15_000),
          cache: 'no-store',
        });

  absorb(res);
  if (!res.ok) throw new Error(`leaguepedia → HTTP ${res.status}`);
  return res.json();
}

let loggedIn = false;
let loggingIn: Promise<void> | null = null;

/** 봇 비밀번호가 없으면 조용히 익명으로 간다 */
async function login(): Promise<void> {
  const user = process.env.LEAGUEPEDIA_USER;
  const pass = process.env.LEAGUEPEDIA_PASSWORD;
  if (!user || !pass || loggedIn) return;

  loggingIn ??= (async () => {
    jar = {};
    const tok = await call({ action: 'query', meta: 'tokens', type: 'login' });
    const lgtoken = tok?.query?.tokens?.logintoken;
    if (!lgtoken) throw new Error('로그인 토큰을 받지 못했습니다');

    const r = await call(
      { action: 'login', lgname: user, lgpassword: pass, lgtoken },
      'POST',
    );
    if (r?.login?.result !== 'Success') {
      throw new Error(`로그인 실패: ${r?.login?.result ?? '알 수 없음'}`);
    }
    loggedIn = true;
  })().finally(() => {
    loggingIn = null;
  });

  await loggingIn;
}

/* ------------------------------------------------------------------ */
/* 수집                                                                */
/* ------------------------------------------------------------------ */

interface RawRow {
  Link: string;
  Champion: string;
  PlayerWin: string;
  Kills: string;
  Deaths: string;
  Assists: string;
  CS: string;
  DamageToChampions: string;
  TeamKills: string;
  /** ScoreboardGames 쪽 값. "38:51" */
  Gamelength: string;
}

/** 인용부호를 넣으면 쿼리가 깨진다. 대회 이름은 우리가 정한 상수뿐이지만 습관을 지킨다 */
const quote = (s: string) => `'${s.replace(/'/g, "''")}'`;

export async function fetchChampionStats(): Promise<ChampionMap> {
  await login();

  const where =
    `SP.Team=${quote(TEAM)} AND SG.OverviewPage IN (${TOURNAMENTS.map(quote).join(',')})`;

  const res = await call({
    action: 'cargoquery',
    limit: '500',
    tables: 'ScoreboardPlayers=SP,ScoreboardGames=SG',
    join_on: 'SP.GameId=SG.GameId',
    fields:
      'SP.Link,SP.Champion,SP.PlayerWin,SP.Kills,SP.Deaths,SP.Assists,SP.CS,' +
      'SP.DamageToChampions,SP.TeamKills,SG.Gamelength',
    where,
  });

  if (res.error) throw new Error(`leaguepedia ${res.error.code}: ${res.error.info}`);

  /** 숫자 칸이 빈 문자열로 오는 판이 있다. 0 으로 읽으면 평균이 내려가므로 구분한다 */
  const num = (v: string | undefined) => {
    const n = Number(v);
    return v !== undefined && v !== '' && Number.isFinite(n) ? n : null;
  };

  const rows: PickRow[] = (res.cargoquery ?? []).map((row: { title: RawRow }) => {
    const r = row.title;
    return {
      link: r.Link,
      champion: r.Champion,
      win: r.PlayerWin === 'Yes',
      kills: num(r.Kills) ?? 0,
      deaths: num(r.Deaths) ?? 0,
      assists: num(r.Assists) ?? 0,
      cs: num(r.CS) ?? 0,
      damage: num(r.DamageToChampions) ?? 0,
      teamKills: num(r.TeamKills),
      minutes: gameMinutes(r.Gamelength),
    };
  });

  const linkToId: Record<string, string> = {};
  for (const p of PLAYERS) linkToId[p.lpName] = p.id;

  const localize = await championLocalizer();
  return foldPicks(rows, linkToId, localize);
}

/* ------------------------------------------------------------------ */
/* 계약 만료일                                                          */
/* ------------------------------------------------------------------ */

/**
 * 선수·코칭스태프의 계약 만료일. 우리 id -> 'YYYY-MM-DD'.
 *
 * '계약기간' 이라 부르지 않는다. 기간은 시작과 끝이 있어야 하는데 시작일을 모른다.
 *
 * Contracts 표는 만료일만 관리한다. 시작일은 어디에도 없다.
 * 팀 합류일로 대신할 수 있을 것 같지만 그러면 안 된다 — 재계약하면 합류일과
 * 계약 시작일이 달라져서, 있지도 않은 기간을 지어내는 셈이 된다.
 * 아는 것만 적는다.
 *
 * 한 사람에게 행이 여러 개 있다 (계약을 갱신할 때마다 쌓인다).
 * 가장 늦은 종료일이 현재 계약이다.
 */
export type ContractMap = Record<string, string>;

interface RawContract {
  Player: string;
  ContractEnd: string;
  IsRemoval: string;
}

export async function fetchContracts(): Promise<ContractMap> {
  await login();

  const res = await call({
    action: 'cargoquery',
    limit: '200',
    tables: 'Contracts',
    fields: 'Contracts.Player,Contracts.ContractEnd,Contracts.IsRemoval',
    where: `Contracts.Team=${quote(TEAM)}`,
  });
  if (res.error) throw new Error(`leaguepedia ${res.error.code}: ${res.error.info}`);

  const linkToId: Record<string, string> = {};
  for (const p of PLAYERS) linkToId[p.lpName] = p.id;
  for (const s of STAFF) linkToId[s.lpName] = s.id;

  const out: ContractMap = {};
  for (const row of (res.cargoquery ?? []) as { title: RawContract }[]) {
    const r = row.title;
    // 방출 기록은 계약이 아니다
    if (r.IsRemoval === '1') continue;
    const id = linkToId[r.Player];
    if (!id || !r.ContractEnd) continue;
    if (!out[id] || r.ContractEnd > out[id]) out[id] = r.ContractEnd;
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* 캐시                                                                */
/* ------------------------------------------------------------------ */

/**
 * 챔피언 전적은 경기가 끝나고 위키에 기록이 올라와야 바뀐다. 30분이면 충분하고,
 * 남의 위키를 방문자 수만큼 두드리지 않는 편이 예의에도 맞다. 익명으로 도는
 * 환경에서는 이 캐시가 rate limit 을 넘기지 않는 유일한 장치이기도 하다.
 */
const TTL_MS = 30 * 60 * 1000;

let cache: { at: number; map: ChampionMap } | null = null;
let inflight: Promise<ChampionMap> | null = null;

/** 계약은 오프시즌에만 바뀐다. 같은 TTL 로 충분하다 */
let cCache: { at: number; map: ContractMap } | null = null;
let cInflight: Promise<ContractMap> | null = null;

/** 실패하면 null. 계약 정보가 없다고 프로필이 못 뜰 이유는 없다 */
export async function getContracts(): Promise<ContractMap | null> {
  if (cCache && Date.now() - cCache.at < TTL_MS) return cCache.map;
  cInflight ??= fetchContracts()
    .then((map) => {
      cCache = { at: Date.now(), map };
      return map;
    })
    .finally(() => {
      cInflight = null;
    });
  try {
    return await cInflight;
  } catch {
    loggedIn = false;
    return cCache?.map ?? null;
  }
}

/** 실패하면 null. 챔피언을 못 가져왔다고 프로필이 못 뜰 이유는 없다 */
export async function getChampionStats(): Promise<ChampionMap | null> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.map;

  inflight ??= fetchChampionStats()
    .then((map) => {
      cache = { at: Date.now(), map };
      return map;
    })
    .finally(() => {
      inflight = null;
    });

  try {
    return await inflight;
  } catch {
    // 로그인이 풀렸을 수 있으니 다음 시도에서 다시 붙는다
    loggedIn = false;
    return cache?.map ?? null;
  }
}

/**
 * LoL Esports API 클라이언트
 *
 * 실측으로 확인한 것:
 *  - access-control-allow-origin: *  → 브라우저에서도 호출 가능하지만,
 *    스플릿 병합 + 전체 일정 페이징이 무거워서 서버에서 모아 캐싱한다.
 *  - getStandingsV3 는 승-패만 준다. columns/scores 가 빈 배열이라
 *    세트 득실은 getSchedule 의 match.teams[].result.gameWins 로 직접 집계해야 한다.
 *  - 2026 시즌은 스플릿이 분리된 별개 토너먼트로 내려온다. 정규 순위는
 *    스플릿2(1~2라운드) + 스플릿3(3~4라운드 그룹)을 합쳐야 실제 순위가 된다.
 *  - 정규 순위에 반영되는 경기는 blockName 이 "N주 차" 인 것뿐이다.
 *    플레이-인 · 플레이오프 · 결승 · 토너먼트 스테이지는 제외.
 */

const API = 'https://esports-api.lolesports.com/persisted/gw';

/** 공개 클라이언트 키 (lolesports.com 웹이 그대로 노출해 쓰는 값) */
const KEY = process.env.LOLESPORTS_API_KEY ?? '0TvQnueqKa5mxJntVWt0w4LpLfEkrV1Ta8rQBb9Z';

export const LCK_LEAGUE_ID = '98767991310872058';

/** 2026 시즌 스플릿 — getTournamentsForLeague 로 확인 */
export const TOURNAMENTS = {
  split2: '115548128960088078', // 정규 1~2라운드 (3/31~6/14)
  split3: '115548147890329817', // 3~4라운드 그룹 + PO (7/28~9/13)
} as const;

export type GroupId = 'legend' | 'rise';
export type MatchStage = 'regular' | 'playin' | 'playoff' | 'final' | 'other';

export interface TeamSide {
  code: string;
  name: string;
  image: string;
  /** 획득 세트 수. 미시작 경기는 null */
  games: number | null;
  win: boolean | null;
}

export interface MatchRow {
  id: string;
  startTime: string;
  state: 'completed' | 'unstarted' | 'inProgress';
  blockName: string;
  bo: number;
  stage: MatchStage;
  a: TeamSide;
  b: TeamSide;
}

export interface TeamRow {
  code: string;
  name: string;
  image: string;
  group: GroupId;
  rank: number;
  /** 통합(스플릿2+3) 경기 승패 */
  w: number;
  l: number;
  /** 통합 세트 승패 */
  setW: number;
  setL: number;
  diff: number;
  split2: { w: number; l: number };
  split3: { w: number; l: number };
  /** 상대 코드별 맞대결 승수 — 동률 시 승자승 판정에 쓴다 */
  h2h: Record<string, number>;
}

export interface Season {
  updatedAt: string;
  tournamentName: string;
  legend: TeamRow[];
  rise: TeamRow[];
  matches: MatchRow[];
}

/** persisted/gw 호출. 라이브스탯(src/lib/livestats.ts)도 경기 정보를 여기서 받아 쓴다. */
export async function call<T>(path: string): Promise<T> {
  const res = await fetch(`${API}/${path}`, {
    headers: { 'x-api-key': KEY, Accept: 'application/json' },
    signal: AbortSignal.timeout(12_000),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`lolesports ${path.split('?')[0]} → HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

/* ------------------------------------------------------------------ */
/* 원시 응답 타입 (필요한 필드만)                                        */
/* ------------------------------------------------------------------ */

interface RawStandings {
  data: {
    standings: {
      name: string;
      stages: {
        slug: string;
        sections: {
          name: string;
          rankings: {
            ordinal: number;
            teams: {
              code: string;
              name: string;
              image: string;
              record?: { wins: number; losses: number };
            }[];
          }[];
        }[];
      }[];
    }[];
  };
}

interface RawSchedule {
  data: {
    schedule: {
      pages: { older: string | null; newer: string | null };
      events: {
        startTime: string;
        state: MatchRow['state'];
        type: string;
        blockName?: string;
        match?: {
          id: string;
          strategy?: { count: number };
          teams: {
            code?: string;
            name: string;
            image: string;
            result?: { outcome: 'win' | 'loss'; gameWins: number };
          }[];
        };
      }[];
    };
  };
}

/* ------------------------------------------------------------------ */
/* 수집                                                                */
/* ------------------------------------------------------------------ */

/** 정규 순위에 반영되는 경기인가 — blockName 이 "N주 차" 인 것만 */
const REGULAR_BLOCK = /^\d+주\s*차$/;

function stageOf(blockName: string): MatchStage {
  if (REGULAR_BLOCK.test(blockName)) return 'regular';
  if (blockName.includes('플레이-인')) return 'playin';
  if (blockName.includes('결승')) return 'final';
  if (blockName.includes('플레이오프')) return 'playoff';
  return 'other';
}

/** 전체 일정을 커서 페이징으로 수집. 2026-03-01 이전까지 내려가면 멈춘다. */
export async function fetchSchedule(): Promise<MatchRow[]> {
  const rows: MatchRow[] = [];
  const seen = new Set<string>();
  let token: string | null = null;

  for (let page = 0; page < 6; page++) {
    const q: string = `getSchedule?hl=ko-KR&leagueId=${LCK_LEAGUE_ID}${token ? `&pageToken=${token}` : ''}`;
    const d: RawSchedule = await call<RawSchedule>(q);
    const events = d.data.schedule.events ?? [];

    for (const e of events) {
      const m = e.match;
      if (e.type !== 'match' || !m || m.teams?.length !== 2) continue;
      if (seen.has(m.id)) continue;
      seen.add(m.id);
      const [a, b] = m.teams;
      const block = e.blockName ?? '';
      const side = (t: (typeof m.teams)[number]): TeamSide => ({
        code: t.code ?? 'TBD',
        name: t.name,
        image: t.image,
        games: t.result?.gameWins ?? null,
        win: t.result ? t.result.outcome === 'win' : null,
      });
      rows.push({
        id: m.id,
        startTime: e.startTime,
        state: e.state,
        blockName: block,
        bo: m.strategy?.count ?? 3,
        stage: stageOf(block),
        a: side(a),
        b: side(b),
      });
    }

    token = d.data.schedule.pages?.older ?? null;
    const earliest = events.reduce((min, e) => (e.startTime < min ? e.startTime : min), '9999');
    if (!token || earliest < '2026-03-01') break;
  }

  return rows.sort((x, y) => x.startTime.localeCompare(y.startTime));
}

/** 스플릿의 승-패 + 그룹 소속. 그룹명은 하드코딩하지 않고 응답에서 읽는다. */
export async function fetchStandings(tournamentId: string) {
  const d = await call<RawStandings>(`getStandingsV3?hl=ko-KR&tournamentId=${tournamentId}`);
  const st = d.data.standings[0];
  const out = new Map<string, { name: string; image: string; w: number; l: number; group?: GroupId }>();

  for (const stage of st.stages) {
    for (const sec of stage.sections) {
      const group: GroupId | undefined = sec.name.includes('레전드')
        ? 'legend'
        : sec.name.includes('라이즈')
          ? 'rise'
          : undefined;
      for (const r of sec.rankings) {
        for (const t of r.teams) {
          if (!t.record) continue;
          out.set(t.code, {
            name: t.name,
            image: t.image,
            w: t.record.wins,
            l: t.record.losses,
            group,
          });
        }
      }
    }
  }
  return { name: st.name, teams: out };
}

/* ------------------------------------------------------------------ */
/* 병합 + 순위                                                          */
/* ------------------------------------------------------------------ */

/**
 * LCK 동률 처리: 승-패 → 승자승(동률 팀들끼리의 맞대결) → 세트 득실.
 * 그래도 갈리지 않으면 실제로는 타이브레이커 경기를 치른다.
 */
export function rankGroup(teams: TeamRow[]): TeamRow[] {
  const sorted = [...teams].sort((x, y) => y.w - x.w || y.diff - x.diff);

  // 승수가 같은 묶음 안에서만 승자승을 적용한다
  const out: TeamRow[] = [];
  let i = 0;
  while (i < sorted.length) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1].w === sorted[i].w) j++;
    const block = sorted.slice(i, j + 1);
    if (block.length > 1) {
      const h2hWins = (t: TeamRow) =>
        block.reduce((n, o) => (o.code === t.code ? n : n + (t.h2h[o.code] ?? 0)), 0);
      block.sort((x, y) => h2hWins(y) - h2hWins(x) || y.diff - x.diff);
    }
    out.push(...block);
    i = j + 1;
  }
  return out.map((t, idx) => ({ ...t, rank: idx + 1 }));
}

export function buildSeason(
  s2: Awaited<ReturnType<typeof fetchStandings>>,
  s3: Awaited<ReturnType<typeof fetchStandings>>,
  matches: MatchRow[],
): Season {
  // 세트 득실 + 맞대결은 정규 경기(N주 차)에서만 집계한다
  const sets = new Map<string, { sw: number; sl: number }>();
  const h2h = new Map<string, Record<string, number>>();

  for (const m of matches) {
    if (m.stage !== 'regular' || m.state !== 'completed') continue;
    if (m.a.games == null || m.b.games == null) continue;
    for (const [me, foe] of [
      [m.a, m.b],
      [m.b, m.a],
    ] as const) {
      const s = sets.get(me.code) ?? { sw: 0, sl: 0 };
      s.sw += me.games!;
      s.sl += foe.games!;
      sets.set(me.code, s);
      if (me.win) {
        const h = h2h.get(me.code) ?? {};
        h[foe.code] = (h[foe.code] ?? 0) + 1;
        h2h.set(me.code, h);
      }
    }
  }

  const rows: TeamRow[] = [];
  for (const [code, a] of s3.teams) {
    const b = s2.teams.get(code);
    const s = sets.get(code) ?? { sw: 0, sl: 0 };
    rows.push({
      code,
      name: a.name,
      image: a.image,
      group: a.group ?? 'rise',
      rank: 0,
      w: a.w + (b?.w ?? 0),
      l: a.l + (b?.l ?? 0),
      setW: s.sw,
      setL: s.sl,
      diff: s.sw - s.sl,
      split2: { w: b?.w ?? 0, l: b?.l ?? 0 },
      split3: { w: a.w, l: a.l },
      h2h: h2h.get(code) ?? {},
    });
  }

  return {
    updatedAt: new Date().toISOString(),
    tournamentName: s3.name,
    legend: rankGroup(rows.filter((t) => t.group === 'legend')),
    rise: rankGroup(rows.filter((t) => t.group === 'rise')),
    matches,
  };
}

export async function fetchSeason(): Promise<Season> {
  const [s2, s3, matches] = await Promise.all([
    fetchStandings(TOURNAMENTS.split2),
    fetchStandings(TOURNAMENTS.split3),
    fetchSchedule(),
  ]);
  return buildSeason(s2, s3, matches);
}

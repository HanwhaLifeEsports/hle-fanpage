import type { MatchRow, TeamRow } from './lolesports';

/**
 * 플레이오프 경우의 수 — 남은 그룹 경기를 전수 전개한다.
 *
 * BO3 한 경기의 결과는 2-0 / 2-1 / 1-2 / 0-2 네 가지다. 세트 득실이 동률
 * 판정에 쓰이므로 승패만 보는 2가지 전개로는 답이 갈리지 않는다.
 * 그래서 경기당 4가지, 총 4^n 을 돌린다.
 *
 * 동률 처리는 LCK 방식대로 승-패 → 승자승 → 세트 득실 순.
 */

/**
 * 월즈 진출 여부.
 *
 * HLE 는 2026 MSI 우승팀이라 **플레이오프에 오르기만 하면 월즈 진출이 확정**된다.
 * 플레이인은 통과해야 플레이오프로 올라가므로 확정이 아니라 가능이다.
 */
export type WorldsStatus = 'confirmed' | 'possible' | 'none';

/**
 * 순위 → 결과 구간.
 *
 * 순위를 하나씩 문자열로 매핑하면 "3~4위" 같은 실제 판정 단위가 코드에서 사라진다.
 * 확률을 구간별로 합산해야 하는 곳이 여럿이라 구간을 1급 개념으로 둔다.
 */
export interface OutcomeBand {
  label: string;
  /** 이 구간에 해당하는 순위들 (1부터) */
  ranks: number[];
  worlds: WorldsStatus;
}

/** 레전드 그룹 진출 규정 (2026 스플릿 3) */
export const LEGEND_BANDS: OutcomeBand[] = [
  { label: '플레이오프 2라운드 직행', ranks: [1, 2], worlds: 'confirmed' },
  { label: '플레이오프 1라운드', ranks: [3, 4], worlds: 'confirmed' },
  { label: '플레이인', ranks: [5], worlds: 'possible' },
];

export const RISE_BANDS: OutcomeBand[] = [
  { label: '플레이인', ranks: [1, 2, 3], worlds: 'possible' },
  { label: '시즌 종료', ranks: [4, 5], worlds: 'none' },
];

const toMap = (bands: OutcomeBand[]): Record<number, string> =>
  Object.fromEntries(bands.flatMap((b) => b.ranks.map((r) => [r, b.label])));

export const LEGEND_OUTCOME = toMap(LEGEND_BANDS);
export const RISE_OUTCOME = toMap(RISE_BANDS);

/** 순위별 경우의 수 배열에서 구간 합을 낸다. rank[0] 이 1위다. */
export function countIn(rank: number[], ranks: number[]): number {
  return ranks.reduce((sum, r) => sum + (rank[r - 1] ?? 0), 0);
}

/** 월즈 진출이 확정되는 순위들 */
export function worldsRanks(bands: OutcomeBand[]): number[] {
  return bands.filter((b) => b.worlds === 'confirmed').flatMap((b) => b.ranks);
}

export interface RemainingMatch {
  id: string;
  startTime: string;
  a: string;
  b: string;
}

export interface WinsBreakdown {
  wins: number;
  total: number;
  /** rank[0] = 1위 경우의 수 */
  rank: number[];
  best: number;
  worst: number;
}

export interface Leverage {
  id: string;
  startTime: string;
  a: string;
  b: string;
  /** a 가 이겼을 때 target 이 상위 seed 를 잡을 확률(%) */
  ifA: number;
  ifB: number;
}

export interface ScenarioResult {
  target: string;
  /** 상위 시드 기준선 — 레전드는 2위(PO 직행) */
  seedCut: number;
  remaining: RemainingMatch[];
  total: number;
  exhaustive: boolean;
  rank: number[];
  byOwnWins: WinsBreakdown[];
  leverage: Leverage[];
}

const OUTCOMES: [number, number][] = [
  [2, 0],
  [2, 1],
  [1, 2],
  [0, 2],
];

/** 그룹에 속한 미시작 정규 경기만 추린다 */
export function remainingFor(group: TeamRow[], matches: MatchRow[]): RemainingMatch[] {
  const codes = new Set(group.map((t) => t.code));
  return matches
    .filter(
      (m) =>
        m.stage === 'regular' &&
        m.state !== 'completed' &&
        codes.has(m.a.code) &&
        codes.has(m.b.code),
    )
    .map((m) => ({ id: m.id, startTime: m.startTime, a: m.a.code, b: m.b.code }));
}

export function computeScenarios(
  group: TeamRow[],
  matches: MatchRow[],
  target: string,
  seedCut = 2,
): ScenarioResult {
  const rem = remainingFor(group, matches);
  const codes = group.map((t) => t.code);
  const T = codes.length;
  const idx = new Map(codes.map((c, i) => [c, i]));
  const me = idx.get(target) ?? 0;
  const n = rem.length;

  const baseW = new Int32Array(T);
  const baseDiff = new Int32Array(T);
  const baseH = new Int32Array(T * T);
  group.forEach((t, i) => {
    baseW[i] = t.w;
    baseDiff[i] = t.diff;
    for (const [opp, wins] of Object.entries(t.h2h)) {
      const j = idx.get(opp);
      if (j !== undefined) baseH[i * T + j] = wins;
    }
  });

  const ai = rem.map((m) => idx.get(m.a)!);
  const bi = rem.map((m) => idx.get(m.b)!);
  const myMatches = rem.map((_, k) => ai[k] === me || bi[k] === me);

  // 시즌 종료 시점의 팀별 총 경기 수. 팀마다 다를 수 있어서 패수를 승수로 유추할 수 없다.
  // 전개마다 승수만 바뀌므로 패수 = 총경기 - 승수로 구한다.
  const totalGames = new Int32Array(T);
  group.forEach((t, i) => {
    totalGames[i] = t.w + t.l;
  });
  for (let k = 0; k < n; k++) {
    totalGames[ai[k]]++;
    totalGames[bi[k]]++;
  }

  // 4^n 이 너무 크면 표본으로 내려간다 (현재 LCK 규모에선 발생하지 않는다)
  const exhaustive = n <= 11;
  const total = exhaustive ? 4 ** n : 400_000;

  const rank = new Array(T).fill(0);
  const byWins: WinsBreakdown[] = Array.from({ length: n + 1 }, (_, w) => ({
    wins: w,
    total: 0,
    rank: new Array(T).fill(0),
    best: T,
    worst: 1,
  }));
  const lev = rem.map((m) => ({ ...m, aTot: 0, aTop: 0, bTot: 0, bTop: 0 }));

  const w = new Int32Array(T);
  const diff = new Int32Array(T);
  const h = new Int32Array(T * T);
  const order = new Int32Array(T);
  const pick = new Int32Array(n);

  for (let it = 0; it < total; it++) {
    if (exhaustive) {
      let v = it;
      for (let k = 0; k < n; k++) {
        pick[k] = v & 3;
        v >>= 2;
      }
    } else {
      for (let k = 0; k < n; k++) pick[k] = (Math.random() * 4) | 0;
    }

    w.set(baseW);
    diff.set(baseDiff);
    h.set(baseH);
    let myWins = 0;

    for (let k = 0; k < n; k++) {
      const [ga, gb] = OUTCOMES[pick[k]];
      const A = ai[k];
      const B = bi[k];
      diff[A] += ga - gb;
      diff[B] += gb - ga;
      const winner = ga > gb ? A : B;
      w[winner]++;
      h[winner * T + (winner === A ? B : A)]++;
      if (myMatches[k] && winner === me) myWins++;
    }

    for (let i = 0; i < T; i++) order[i] = i;
    // 승-패 → 승자승(전적이 완전히 같은 묶음 안) → 세트 득실.
    // 승수만 같고 패수가 다르면 동률이 아니므로 승자승을 적용하지 않는다.
    const loss = (t: number) => totalGames[t] - w[t];
    const arr = Array.from(order);
    arr.sort((x, y) => w[y] - w[x] || loss(x) - loss(y) || diff[y] - diff[x]);
    let s = 0;
    while (s < T) {
      let e = s;
      while (e + 1 < T && w[arr[e + 1]] === w[arr[s]] && loss(arr[e + 1]) === loss(arr[s])) e++;
      if (e > s) {
        const blockIds = arr.slice(s, e + 1);
        const h2hIn = (t: number) => blockIds.reduce((acc, o) => (o === t ? acc : acc + h[t * T + o]), 0);
        blockIds.sort((x, y) => h2hIn(y) - h2hIn(x) || diff[y] - diff[x]);
        for (let q = 0; q < blockIds.length; q++) arr[s + q] = blockIds[q];
      }
      s = e + 1;
    }

    const r = arr.indexOf(me) + 1;
    rank[r - 1]++;
    const bw = byWins[myWins];
    bw.total++;
    bw.rank[r - 1]++;
    if (r < bw.best) bw.best = r;
    if (r > bw.worst) bw.worst = r;

    const top = r <= seedCut;
    for (let k = 0; k < n; k++) {
      const [ga, gb] = OUTCOMES[pick[k]];
      if (ga > gb) {
        lev[k].aTot++;
        if (top) lev[k].aTop++;
      } else {
        lev[k].bTot++;
        if (top) lev[k].bTop++;
      }
    }
  }

  return {
    target,
    seedCut,
    remaining: rem,
    total,
    exhaustive,
    rank,
    byOwnWins: byWins.filter((b) => b.total > 0),
    leverage: lev.map((m) => ({
      id: m.id,
      startTime: m.startTime,
      a: m.a,
      b: m.b,
      ifA: m.aTot ? (m.aTop / m.aTot) * 100 : 0,
      ifB: m.bTot ? (m.bTop / m.bTot) * 100 : 0,
    })),
  };
}

/**
 * 포스트시즌 대진표.
 *
 * 나무위키 같은 정리 문서를 긁을 필요가 없다. getStandingsV3 가 대진표를 통째로
 * 준다 — 열(column) · 칸(cell) · 경기 · 팀 · 결과까지. 아직 팀이 정해지지 않은
 * 자리는 code 가 'TBD' 로 내려오므로, 진출이 확정되기 전에도 뼈대를 그릴 수 있다.
 *
 * 실측으로 확인한 것 (2026 스플릿 3):
 *  - 스테이지가 play_ins(플레이인)와 regional_championship(지역별 챔피언십) 둘이다.
 *    2025 는 뒤쪽 slug 가 playoffs 였다 — 해마다 바뀌므로 하드코딩하지 않고
 *    응답에 있는 이름을 그대로 쓴다.
 *  - 대진 경기 13개가 전부 getSchedule 에도 있고 id 가 같다. 날짜는 거기서 붙인다.
 *    대진표 응답에는 시각이 없다.
 *  - 각 자리에 origin 이 있다. 2025 완료 데이터로 slot 의 뜻을 확정했다:
 *      type='match'         slot 1 = 승자 (12/12), slot 2 = 패자 (6/6) — 18개 전부 일치
 *      type='decisionPoint' slot 은 순위가 아니라 대진표상의 자리다.
 *                           2025 본선에서 slot 5·6 이 정규 1·2위였다.
 *    그래서 승자/패자 연결만 자리마다 쓰고, 시드는 자리가 아니라 '칸' 단위로 적는다.
 *    어느 자리가 3위이고 어느 자리가 4위인지는 응답으로 알 수 없다.
 */

import type { MatchRow } from './lolesports';
import { SEASON } from './lck2026';

export interface BracketTeam {
  code: string;
  name: string;
  image: string;
  /** 획득 세트 수. 안 끝났으면 null */
  games: number | null;
  win: boolean | null;
  /** 아직 정해지지 않은 자리 */
  tbd: boolean;
  /** 미정 자리에 무엇이 들어오는가 — "1라운드 승자". 모르면 null */
  from: string | null;
}

export interface BracketMatch {
  id: string;
  state: 'unstarted' | 'inProgress' | 'completed';
  /** getSchedule 에서 붙인 시각. 못 찾으면 null */
  startTime: string | null;
  teams: [BracketTeam, BracketTeam];
  /** 이기면 어디로 가는가. 결승이면 null */
  winTo: string | null;
  /** 지면 어디로 가는가. 탈락이면 null */
  lossTo: string | null;
  /** 공지된 경기장. 모르면 null */
  venue: string | null;
}

/** 승자조 / 패자조. 화면에서 위아래 두 줄로 갈라 놓는다 */
export type Band = 'upper' | 'lower';

export interface BracketCell {
  name: string;
  slug: string;
  /**
   * 몇 번째 열인가 (0부터). 응답의 열 번호가 아니라 의존 관계로 직접 계산한다.
   * 원본은 승자조 결승을 5열, 결승을 7열에 두는데 실제로는 각각 2열·5열이면
   * 충분하다 — 그대로 쓰면 가로로 두 열만큼 더 길어진다.
   */
  col: number;
  band: Band;
  matches: BracketMatch[];
}

export interface BracketStage {
  slug: string;
  name: string;
  /** 열 개수. 화면이 격자를 짤 때 쓴다 */
  cols: number;
  cells: BracketCell[];
}

/* ------------------------------------------------------------------ */
/* 원시 응답 (필요한 필드만)                                             */
/* ------------------------------------------------------------------ */

export interface RawBracketStage {
  slug: string;
  name: string;
  sections: {
    name: string;
    type: string;
    columns?: {
      cells?: {
        name: string;
        slug: string;
        matches?: {
          id: string;
          structuralId?: string;
          state: BracketMatch['state'];
          teams?: (RawTeam | null)[];
        }[];
      }[];
    }[];
  }[];
}

/**
 * 패자조인가.
 *
 * slug 가 한 대회 안에서도 섞여 온다 — 2026 응답에 lower_bracket_round_1 과
 * losers_bracket_round_3 이 함께 있다. 둘 다 같은 조다.
 */
const isLower = (slug: string) => slug.startsWith('lower_bracket') || slug.startsWith('losers_bracket');

/**
 * 칸 이름.
 *
 * 응답의 이름을 그대로 쓰지 않는다. 두 가지 문제가 있다.
 *  - 같은 패자조를 어떤 칸은 "하위권 대진 - 2라운드", 어떤 칸은 "패자 대진 -
 *    3라운드" 로 부른다 (slug 가 lower_bracket / losers_bracket 으로 갈리는 탓).
 *    화면에서 한 조가 두 이름으로 불리면 다른 조로 읽힌다
 *  - 조 이름은 화면의 띠가 이미 말해 주므로 칸에서는 라운드만 있으면 된다
 *
 * 이름은 LCK 가 부르는 대로 맞춘다. 세 자리가 셋 다 '결승' 으로 불리면 한
 * 대진표에 같은 이름이 셋 생긴다.
 *   승자조 결승 -> 승자조 3라운드
 *   패자조 결승 -> 결승 진출전  (공식 영문 Finals Qualifier)
 *   결승        -> Grand Finals
 * 마지막만 영문인 것은 바로 옆 칸이 '결승 진출전' 이어서다. 둘 다 한글이면
 * 두 글자 차이로 갈려 눈이 미끄러진다.
 */
export function cellLabel(slug: string, name: string, stageSlug?: string): string {
  // 플레이인의 마지막 경기는 진출자를 가리는 자리다. '2라운드' 보다 뜻이 분명하다
  if (stageSlug === 'play_ins' && slug === 'round_2') return '최종전';
  if (slug === 'finals') return 'Grand Finals';
  if (slug === 'upper_bracket_finals') return '3라운드';
  if (slug.endsWith('_finals')) return '결승 진출전';
  const round = slug.match(/round_(\d+)$/);
  if (round) return `${round[1]}라운드`;
  return name.replace('패자 대진', '하위권 대진').replace(/^(상위권|하위권) 대진 - /, '');
}

/**
 * 다른 칸에서 이 칸을 가리킬 때 쓰는 이름.
 *
 * 머리글과 다르다. 머리글은 화면의 띠와 열이 어느 조인지 이미 말해 주지만,
 * "→ 1라운드" 라고만 적힌 자리에서는 그 단서가 없다. 라운드에는 조를 붙인다.
 *
 * 결승 진출전과 Grand Finals 는 한 대진표에 하나뿐이라 그대로 쓴다.
 */
export function refLabel(slug: string, name: string, stageSlug?: string): string {
  const base = cellLabel(slug, name, stageSlug);
  if (stageSlug === 'play_ins') return base;
  if (/round_\d+$/.test(slug)) return `${isLower(slug) ? '패자조' : '승자조'} ${base}`;
  // 승자조 마지막 칸도 머리글에서는 '3라운드' 다. 승자조 열이 1·2·3라운드로
  // 이어져야 한 줄로 읽힌다. 다만 패자조에도 3라운드가 있어 가리킬 때는 갈라야 한다
  if (slug === 'upper_bracket_finals') return `승자조 ${base}`;
  return base;
}

/**
 * 스테이지 이름 정규화.
 *
 * 2026 응답은 본선을 "지역별 챔피언십" 이라 부른다(2025 는 "플레이오프"). 앞 스테이지는
 * "플레이-인" 으로 온다. 사이트의 다른 곳(경우의 수, 순위 안내)은 플레이오프·플레이인
 * 이라고 쓴다. 한 사이트에서 같은 대회를 두 이름으로 부르면 다른 것으로 읽힌다.
 */
const stageName = (name: string) =>
  name.includes('지역별') ? '플레이오프' : name.replace('플레이-인', '플레이인');

/**
 * 미정 자리에 어느 순위가 들어오는가.
 *
 * API 로는 알 수 없다. decisionPoint 의 slot 은 순위가 아니라 대진표상의 자리다 —
 * 2025 본선에서 slot 6 이 1위(GEN), slot 5 가 2위(HLE)로 번호와 순위가 반대였다.
 *
 * 대신 두 가지를 근거로 삼는다.
 *  1) LCK 포맷. lck2026.ts 의 SEASON 에 적어 둔 그대로다
 *  2) 2025 완료 대진과 최종 순위를 맞춰 본 결과. 본선 1라운드는 각 경기가
 *     '그룹 시드 + 플레이인 통과' 한 쌍이었고(T1+DK, KT+BFX), 상위권 2라운드에는
 *     상위 두 팀이 앉아 있었다(HLE, GEN). 높은 시드가 앞자리에 놓이는 통상 배치다
 *
 * 한동안 '3~4위' 처럼 범위로 적었다. 응답만으로는 한 칸 안에서 어느 쪽이 3위인지
 * 알 수 없어 범위가 안전했다. 2026 대진이 확정되면서 경기별 순위를 알게 돼
 * 정확한 값으로 바꿨다.
 *
 * 포맷에서 온 값이라, 리그가 배치를 바꾸면 이 표기도 함께 고쳐야 한다.
 */
export function slotSeed(
  stageSlug: string,
  cellSlug: string,
  matchIndex: number,
  teamIndex: number,
): string | null {
  if (stageSlug === 'play_ins') {
    if (cellSlug !== 'round_1') return null;
    // 2026 공개 대진 기준. 1경기는 그룹을 가로질러, 2경기는 라이즈끼리 붙는다.
    // 2025 는 [레전드5+라이즈3], [라이즈2+라이즈1] 로 배치가 달랐다 —
    // 시즌마다 바뀌므로 새 시즌 대진이 나오면 여기를 다시 확인해야 한다.
    const PLAY_IN = [
      ['레전드 그룹 5위', '라이즈 그룹 1위'],
      ['라이즈 그룹 2위', '라이즈 그룹 3위'],
    ];
    return PLAY_IN[matchIndex]?.[teamIndex] ?? null;
  }
  // 경기별로 어느 순위가 앉는지가 확정됐다. 한 칸 안에서 3위와 4위를 가릴 수
  // 없어 범위로 적던 것을 정확한 순위로 바꾼다
  const SEEDS: Record<string, string[]> = {
    round_1: ['레전드 그룹 3위', '레전드 그룹 4위'],
    upper_bracket_round_2: ['레전드 그룹 1위', '레전드 그룹 2위'],
  };
  // 남은 한 자리는 지명으로 정해진다. 규칙은 pickSeat 한 곳에만 둔다
  if (cellSlug === 'round_1')
    return teamIndex === 0
      ? (SEEDS.round_1[matchIndex] ?? null)
      : pickSeat(stageSlug, cellSlug, matchIndex, teamIndex);
  if (cellSlug === 'upper_bracket_round_2' && teamIndex === 0)
    return SEEDS.upper_bracket_round_2[matchIndex] ?? null;
  // 승자조 2라운드에서 내려오는 자리. 응답의 origin 이 비어 있어 여기서 적는다
  return formatDropIn(cellSlug, teamIndex);
}

/**
 * 공지로 따로 알려진 경기 정보.
 *
 * 응답은 13경기의 시각을 전부 17:00 으로 준다. 자리표시자다 — 실제로 그 시각인
 * 경기가 대부분이라 티가 잘 안 나지만, 결승 주간 두 경기는 14:00 이다.
 *
 * 경기장도 응답에 없다. 결승 주간만 공지에 나와 있어 그 둘에만 적는다.
 * 모르는 경기에 짐작으로 채우면, 적혀 있다는 사실 자체가 확인된 정보처럼 읽힌다.
 *
 * 출처: LCK 공식 'FINALS TICKET INFO' (2026-08). 공지가 바뀌면 여기도 고쳐야 한다.
 */
const ANNOUNCED_MATCH: Record<string, { hourKst: number; venue: string }> = {
  lower_bracket_finals: { hourKst: 14, venue: 'KSPO DOME (올림픽공원)' },
  finals: { hourKst: 14, venue: 'KSPO DOME (올림픽공원)' },
};

/**
 * 그 경기가 열리는 한국 날짜의 지정 시각으로 옮긴다.
 *
 * 날짜는 응답을 믿고 시각만 바꾼다. 날짜까지 손으로 적으면 일정이 밀렸을 때
 * 우리 화면만 옛날 날짜에 머문다.
 */
function atKstHour(iso: string, hour: number): string {
  const KST = 9 * 3600_000;
  const DAY = 86400_000;
  const day = Math.floor((new Date(iso).getTime() + KST) / DAY);
  return new Date(day * DAY - KST + hour * 3600_000).toISOString();
}

/**
 * 승자조 2라운드 패자가 내려가는 곳.
 *
 * 경기 번호로 정해지지 않는다. 두 패자의 시드를 견줘 높은 쪽이 패자조 3라운드,
 * 낮은 쪽이 2라운드로 간다.
 *
 * 그래서 경기가 끝나기 전에는 어느 쪽인지 적을 수 없다. 1경기는 '레전드 1위 vs
 * 승자조 1-1라운드 승자' 인데, 레전드 1위가 이기면 그 경기의 패자는 시드가 낮은
 * 쪽이 되어 2라운드로 내려간다. 경기 번호로 못 박으면 그 경우에 틀린다.
 *
 * 한쪽으로 찍는 대신 기준을 적는다. 반은 맞고 반은 틀린 표기보다, 무엇으로
 * 갈리는지 말해 주는 편이 낫다.
 *
 * 칸 이름이 lower_ 와 losers_ 로 갈려 있는 것은 응답 그대로다.
 */
const WB_R2_DROP = [
  { cell: 'losers_bracket_round_3', seed: '상위 시드' },
  { cell: 'lower_bracket_round_2', seed: '하위 시드' },
] as const;

/**
 * 지면 어디로 가는가 — 응답에 없는 연결.
 *
 * 승자조 2라운드의 패자 자리는 어느 경기의 origin 으로도 잡히지 않아 도착지가
 * 비었다. 그대로 두면 '탈락' 으로 떨어지는데, 실제로는 패자조로 내려가 한 번
 * 더 싸운다. 진 팀이 끝난 것처럼 보이는 것은 대진표가 할 수 있는 가장 큰
 * 거짓말이다.
 *
 * 두 경기의 도착지가 같게 적힌다. 시드로 갈리므로 경기만 보고는 어느 라운드로
 * 가는지 알 수 없기 때문이다.
 *
 * 포맷에서 온 값이라 리그가 대진을 바꾸면 여기도 함께 고쳐야 한다.
 * 응답이 연결을 주기 시작하면 그쪽이 이긴다 — 이 함수는 빈 자리만 채운다.
 */
/**
 * 지명으로 채워지는 자리.
 *
 * 승자조은 두 라운드 모두 상위 시드가 상대를 고른다.
 *   1라운드  레전드 3위가 플레이인 통과 두 팀 중 고르고, 남은 팀이 4위와 붙는다
 *   2라운드  레전드 1위가 1라운드 승자 두 팀 중 고르고, 남은 팀이 2위와 붙는다
 *
 * 그래서 "1경기 승자는 2라운드 1경기로" 가 성립하지 않는다. 응답은 그렇게 못
 * 박아 두지만 그건 대진표의 자리 번호일 뿐, 실제로는 지명이 끝나야 정해진다.
 * 응답을 그대로 쓰면 아직 아무도 모르는 것을 아는 것처럼 적게 된다.
 *
 * 두 자리를 다르게 적는다. 둘 다 '플레이인 통과' 라고만 하면 왜 두 칸으로
 * 갈리는지 알 수 없다 — 하나는 고르는 쪽이고 하나는 남는 쪽이다.
 *
 * 두 라운드를 한 곳에 둔다. 같은 규칙이 두 군데 흩어져 있으면 포맷이 바뀔 때
 * 한쪽만 고쳐진다.
 *
 * 팀이 정해지면 이 글자는 쓰이지 않는다. 빈 자리에만 붙기 때문이다.
 */
function pickSeat(
  stageSlug: string,
  cellSlug: string,
  matchIndex: number,
  teamIndex: number,
): string | null {
  if (stageSlug === 'play_ins') return null;
  // 0번 자리는 시드(레전드 1~4위)다. 지명 대상은 상대 자리뿐이다
  if (teamIndex !== 1) return null;
  const PICK: Record<string, [string, string]> = {
    round_1: ['플레이인 통과 팀 중 지명', '남은 플레이인 통과 팀'],
    upper_bracket_round_2: ['승자조 1라운드 승자 중 지명', '남은 승자조 1라운드 승자'],
  };
  return PICK[cellSlug]?.[matchIndex] ?? null;
}

export function formatLossTo(cellSlug: string): string | null {
  if (cellSlug === 'round_1') return '패자조 1라운드';
  if (cellSlug === 'upper_bracket_round_2') return '패자조 2·3라운드 (시드순)';
  return null;
}

/** 승자조 2라운드에서 내려오는 자리를 반대 방향으로 읽는다 */
export function formatDropIn(cellSlug: string, teamIndex: number): string | null {
  if (teamIndex !== 0) return null;
  const d = WB_R2_DROP.find((x) => x.cell === cellSlug);
  return d ? `승자조 2라운드 패자 (${d.seed})` : null;
}

/**
 * 출발지 이름 — "승자조 2-1라운드".
 *
 * 도착지(칸 머리글)보다 자세하다. 머리글은 화면의 띠와 열이 이미 어느 조인지
 * 말해 주지만, 패자조 자리에 적히는 "1라운드 패자" 는 어느 조의 1라운드인지도,
 * 두 경기 중 어느 쪽인지도 알려주지 않는다. 그 자리에서는 글자가 전부다.
 *
 * 경기 번호는 라운드 번호에 붙여 "1-2라운드" 로 적는다. 이 글자는 팀 이름이
 * 앉을 자리에 대신 들어가므로 짧아야 한다. 칸 머리글은 줄이지 않는다 —
 * 거기는 자리가 있고, 줄인 표기는 읽는 사람이 한 번 배워야 하는 것이라
 * 꼭 필요한 곳에서만 쓴다.
 *
 * 한 칸에 경기가 둘 이상일 때만 붙인다. 하나뿐인 칸에 번호를 달면 어딘가에
 * 다른 경기가 있다는 뜻이 된다.
 */
function originLabel(
  slug: string,
  name: string,
  stageSlug: string,
  matchIndex: number,
  matchCount: number,
): string {
  // 조 이름은 refLabel 이 붙인다. 여기서는 경기 번호만 얹는다
  const base = refLabel(slug, name, stageSlug);
  return matchCount > 1 ? base.replace(/(\d+)라운드/, `$1-${matchIndex + 1}라운드`) : base;
}

/** 라운드 전체에 무엇이 들어오는지. 자리마다 적을 수 없는 칸에 쓴다 */
export function seedNote(): string | null {
  // 지금은 자리마다 적을 수 있어 쓰이지 않는다. 포맷이 바뀌어 자리를 특정할 수
  // 없게 되면 다시 칸 단위 안내가 필요하다
  return null;
}

const tbdTeam = (from: string | null): BracketTeam => ({
  code: 'TBD',
  name: '미정',
  image: '',
  games: null,
  win: null,
  tbd: true,
  from,
});

interface RawTeam {
  code?: string;
  name?: string;
  image?: string;
  result?: { outcome: 'win' | 'loss'; gameWins: number } | null;
  origin?: { structuralId: string; type: string; slot: number } | null;
}

/** 빈 자리는 teams 가 아예 없거나 code 가 'TBD' 로 온다. 둘 다 미정으로 본다 */
function toTeam(
  t: RawTeam | null | undefined,
  cellOf: Map<string, string>,
  seat: { stage: string; cell: string; match: number; index: number },
): BracketTeam {
  if (!t || !t.code || t.code === 'TBD') {
    const o = t?.origin;
    let from: string | null = null;
    // 지명으로 정해지는 자리는 응답보다 먼저 본다. 응답은 '1경기 승자 -> 2라운드
    // 1경기' 로 못 박아 두는데 실제로는 고르기 전까지 정해지지 않는다
    const picked = pickSeat(seat.stage, seat.cell, seat.match, seat.index);
    if (picked) {
      from = picked;
    } else if (o?.type === 'match') {
      const src = cellOf.get(o.structuralId);
      // slot 1 = 승자, 2 = 패자. 2025 데이터 18건으로 확인했다
      if (src) from = `${src} ${o.slot === 1 ? '승자' : '패자'}`;
    } else {
      from = slotSeed(seat.stage, seat.cell, seat.match, seat.index);
    }
    return tbdTeam(from);
  }
  return {
    code: t.code,
    name: t.name ?? t.code,
    image: t.image ?? '',
    games: t.result?.gameWins ?? null,
    win: t.result ? t.result.outcome === 'win' : null,
    tbd: false,
    from: null,
  };
}

/**
 * 대진표를 화면이 쓸 모양으로 옮긴다. 날짜는 일정에서 붙인다.
 *
 * 열/칸 중첩 구조를 평평하게 펴서 (열 번호, 조) 좌표를 붙인다. 화면이 격자로
 * 배치하려면 좌표가 필요하고, 원본의 columns[] 안에는 승자조와 패자조 칸이
 * 섞여 들어 있어 그대로 쓰면 두 조가 같은 세로줄에 겹친다.
 *
 * 빈 스테이지(칸이 하나도 없는 것)는 버린다. 시즌 초에는 뼈대조차 없이
 * 이름만 내려오는 스테이지가 있어서, 그대로 두면 빈 제목만 화면에 남는다.
 */
export function buildBracket(stages: RawBracketStage[], matches: MatchRow[]): BracketStage[] {
  const when = new Map(matches.map((m) => [m.id, m.startTime]));

  // structuralId -> 그 경기가 속한 칸 이름. 승자/패자가 어디서 오는지 적을 때 쓴다
  const cellOf = new Map<string, string>();
  // structuralId -> 그 경기의 승자·패자가 가는 칸. 위와 반대 방향이다
  const dest = new Map<string, { win?: string; loss?: string }>();

  for (const st of stages) {
    for (const sec of st.sections ?? []) {
      for (const col of sec.columns ?? []) {
        for (const cell of col.cells ?? []) {
          (cell.matches ?? []).forEach((m, mi) => {
            if (m.structuralId)
              cellOf.set(
                m.structuralId,
                originLabel(cell.slug, cell.name, st.slug, mi, (cell.matches ?? []).length),
              );
          });
        }
      }
    }
  }
  for (const st of stages) {
    for (const sec of st.sections ?? []) {
      for (const col of sec.columns ?? []) {
        for (const cell of col.cells ?? []) {
          for (const m of cell.matches ?? []) {
            for (const t of m.teams ?? []) {
              const o = t?.origin;
              if (o?.type !== 'match') continue;
              const d = dest.get(o.structuralId) ?? {};
              // slot 1 = 승자, 2 = 패자 (2025 데이터 18건으로 확인)
              if (o.slot === 1) d.win = refLabel(cell.slug, cell.name, st.slug);
              else d.loss = refLabel(cell.slug, cell.name, st.slug);
              dest.set(o.structuralId, d);
            }
          }
        }
      }
    }
  }

  // structuralId -> 그 경기가 속한 칸의 고유 키. 이름은 조마다 겹치므로("1라운드")
  // 스테이지와 slug 를 붙여 쓴다
  const keyOf = new Map<string, string>();
  for (const st of stages) {
    for (const sec of st.sections ?? []) {
      for (const col of sec.columns ?? []) {
        for (const cell of col.cells ?? []) {
          for (const m of cell.matches ?? []) {
            if (m.structuralId) keyOf.set(m.structuralId, `${st.slug}|${cell.slug}`);
          }
        }
      }
    }
  }

  /**
   * 칸이 어느 칸 다음에 오는가. 여기서 열 번호를 계산한다.
   *
   * 응답의 columns[] 순서를 그대로 쓰면 대진표가 필요 이상으로 넓어진다.
   * 실제 제약은 "앞선 경기가 끝나야 이 경기가 성립한다" 뿐이므로, 그 관계만
   * 지키면서 왼쪽으로 최대한 당긴다.
   */
  const deps = new Map<string, Set<string>>();
  for (const st of stages) {
    for (const sec of st.sections ?? []) {
      for (const col of sec.columns ?? []) {
        for (const cell of col.cells ?? []) {
          const key = `${st.slug}|${cell.slug}`;
          const set = deps.get(key) ?? new Set<string>();
          for (const m of cell.matches ?? []) {
            for (const t of m.teams ?? []) {
              const o = t?.origin;
              if (o?.type !== 'match') continue;
              const src = keyOf.get(o.structuralId);
              if (src && src !== key) set.add(src);
            }
          }
          deps.set(key, set);
        }
      }
    }
  }

  const colCache = new Map<string, number>();
  const colOf = (key: string, seen = new Set<string>()): number => {
    const hit = colCache.get(key);
    if (hit !== undefined) return hit;
    // 순환은 있을 수 없지만, 있어도 무한히 돌지 않게 막는다
    if (seen.has(key)) return 0;
    seen.add(key);
    let n = 0;
    for (const d of deps.get(key) ?? []) n = Math.max(n, colOf(d, seen) + 1);
    colCache.set(key, n);
    return n;
  };

  return stages
    .map((st) => {
      const cells: BracketCell[] = [];
      for (const sec of st.sections ?? []) {
        if (sec.type !== 'bracket') continue;
        (sec.columns ?? []).forEach((col) => {
          for (const cell of col.cells ?? []) {
            cells.push({
              name: cellLabel(cell.slug, cell.name, st.slug),
              slug: cell.slug,
              col: colOf(`${st.slug}|${cell.slug}`),
              band: isLower(cell.slug) ? 'lower' : 'upper',
              matches: (cell.matches ?? []).map((m, mi) => {
                const d = (m.structuralId && dest.get(m.structuralId)) || {};
                const fixed = ANNOUNCED_MATCH[cell.slug];
                const raw = when.get(m.id) ?? null;
                return {
                  id: m.id,
                  state: m.state,
                  startTime: raw && fixed ? atKstHour(raw, fixed.hourKst) : raw,
                  venue: fixed?.venue ?? null,
                  teams: [
                    toTeam(m.teams?.[0], cellOf, { stage: st.slug, cell: cell.slug, match: mi, index: 0 }),
                    toTeam(m.teams?.[1], cellOf, { stage: st.slug, cell: cell.slug, match: mi, index: 1 }),
                  ] as [BracketTeam, BracketTeam],
                  // 다음 경기가 없는 자리는 빈칸으로 두지 않고 무슨 뜻인지 적는다.
                  // 플레이인 승자는 스테이지를 벗어나므로 응답에 도착지가 없다 —
                  // 다음 스테이지의 decisionPoint 로 들어가기 때문이다.
                  winTo:
                    d.win ??
                    (cell.slug === 'finals'
                      ? `${SEASON.year} LCK 우승`
                      : st.slug === 'play_ins'
                        ? '플레이오프 진출'
                        : null),
                  lossTo:
                    d.loss ??
                    formatLossTo(cell.slug) ??
                    (cell.slug === 'finals' ? '준우승' : '탈락'),
                };
              }),
            });
          }
        });
      }
      return {
        slug: st.slug,
        name: stageName(st.name),
        cols: cells.reduce((n, c) => Math.max(n, c.col + 1), 0),
        cells,
      };
    })
    .filter((st) => st.cells.length > 0);
}

/** 대진이 하나라도 확정됐는가 — 아직이면 화면에서 확률을 대신 보여준다 */
export function hasConfirmedTeams(stages: BracketStage[]): boolean {
  return stages.some((st) => st.cells.some((c) => c.matches.some((m) => m.teams.some((t) => !t.tbd))));
}

/** 우리 팀이 대진표 어딘가에 올라와 있는가 */
export function teamInBracket(stages: BracketStage[], code: string): boolean {
  return stages.some((st) => st.cells.some((c) => c.matches.some((m) => m.teams.some((t) => t.code === code))));
}

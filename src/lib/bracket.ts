/**
 * 포스트시즌 대진표.
 *
 * 나무위키 같은 정리 문서를 긁을 필요가 없다. getStandingsV3 가 대진표를 통째로
 * 준다 — 열(column) · 칸(cell) · 경기 · 팀 · 결과까지. 아직 팀이 정해지지 않은
 * 자리는 code 가 'TBD' 로 내려오므로, 진출이 확정되기 전에도 뼈대를 그릴 수 있다.
 *
 * 실측으로 확인한 것 (2026 스플릿 3):
 *  - 스테이지가 play_ins(플레이-인)와 regional_championship(지역별 챔피언십) 둘이다.
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
}

export interface BracketCell {
  name: string;
  slug: string;
  matches: BracketMatch[];
}

/** 한 열은 같은 시점의 라운드들이다. 열 안에 상위권·하위권 칸이 함께 들어간다 */
export interface BracketColumn {
  cells: BracketCell[];
}

export interface BracketStage {
  slug: string;
  name: string;
  columns: BracketColumn[];
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
function toTeam(t: RawTeam | null | undefined, cellOf: Map<string, string>): BracketTeam {
  if (!t || !t.code || t.code === 'TBD') {
    const o = t?.origin;
    let from: string | null = null;
    if (o?.type === 'match') {
      const src = cellOf.get(o.structuralId);
      // slot 1 = 승자, 2 = 패자. 2025 데이터 18건으로 확인했다
      if (src) from = `${src} ${o.slot === 1 ? '승자' : '패자'}`;
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
 * 빈 스테이지(칸이 하나도 없는 것)는 버린다. 시즌 초에는 뼈대조차 없이
 * 이름만 내려오는 스테이지가 있어서, 그대로 두면 빈 제목만 화면에 남는다.
 */
export function buildBracket(stages: RawBracketStage[], matches: MatchRow[]): BracketStage[] {
  const when = new Map(matches.map((m) => [m.id, m.startTime]));

  // structuralId -> 그 경기가 속한 칸 이름. 승자/패자가 어디서 오는지 적을 때 쓴다
  const cellOf = new Map<string, string>();
  for (const st of stages) {
    for (const sec of st.sections ?? []) {
      for (const col of sec.columns ?? []) {
        for (const cell of col.cells ?? []) {
          for (const m of cell.matches ?? []) {
            if (m.structuralId) cellOf.set(m.structuralId, cell.name);
          }
        }
      }
    }
  }

  return stages
    .map((st) => ({
      slug: st.slug,
      name: st.name,
      columns: (st.sections ?? [])
        .filter((sec) => sec.type === 'bracket')
        .flatMap((sec) => sec.columns ?? [])
        .map((col) => ({
          cells: (col.cells ?? []).map((cell) => ({
            name: cell.name,
            slug: cell.slug,
            matches: (cell.matches ?? []).map((m) => ({
              id: m.id,
              state: m.state,
              startTime: when.get(m.id) ?? null,
              teams: [toTeam(m.teams?.[0], cellOf), toTeam(m.teams?.[1], cellOf)] as [
                BracketTeam,
                BracketTeam,
              ],
            })),
          })),
        }))
        .filter((col) => col.cells.length > 0),
    }))
    .filter((st) => st.columns.length > 0);
}

/**
 * 각 라운드에 어느 순위가 들어오는가.
 *
 * 이 값은 API 가 주지 않는다. decisionPoint 의 slot 은 순위가 아니라 자리 번호라
 * 거기서 읽어낼 수 없다. 대신 LCK 포맷은 우리가 이미 알고 있고 lck2026.ts 의
 * SEASON 에 적어 두었다 — 그 지식을 칸 이름에 붙인다.
 *
 * 2025 완료 데이터와 대조해 맞는 것을 확인했다: 상위권 2라운드에 정규 1·2위가
 * 있었고(HLE, GEN), 1라운드에는 3·4위와 플레이-인 통과 팀이 있었다.
 *
 * 자리마다 "3위" "4위" 를 박지 않는 이유: 한 칸 안에서 어느 쪽이 3위인지는
 * 응답으로 알 수 없다. 칸 단위로만 적는다.
 *
 * 포맷이 바뀌면 여기와 SEASON 을 함께 고쳐야 한다.
 */
export function seedNote(stageSlug: string, cellSlug: string): string | null {
  if (stageSlug === 'play_ins') {
    if (cellSlug === 'round_1') return '레전드 5위 · 라이즈 1~3위';
    return null;
  }
  // 본선. slug 는 해마다 바뀌지만(playoffs / regional_championship) 칸 이름은 같다
  if (cellSlug === 'round_1') return '레전드 3~4위 · 플레이-인 통과';
  if (cellSlug === 'upper_bracket_round_2') return '레전드 1~2위 직행';
  return null;
}

/** 대진이 하나라도 확정됐는가 — 아직이면 화면에서 확률을 대신 보여준다 */
export function hasConfirmedTeams(stages: BracketStage[]): boolean {
  return stages.some((st) =>
    st.columns.some((c) => c.cells.some((cell) => cell.matches.some((m) => m.teams.some((t) => !t.tbd)))),
  );
}

/** 우리 팀이 대진표 어딘가에 올라와 있는가 */
export function teamInBracket(stages: BracketStage[], code: string): boolean {
  return stages.some((st) =>
    st.columns.some((c) => c.cells.some((cell) => cell.matches.some((m) => m.teams.some((t) => t.code === code)))),
  );
}

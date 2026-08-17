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
 *  - 각 자리에 origin 이 있어 "정규 몇 번 시드" 인지 "어느 경기 승자" 인지 알 수
 *    있지만, slot 번호가 무엇을 뜻하는지는 응답만으로 확정할 수 없어 쓰지 않는다.
 *    지어낸 시드 표기를 띄우느니 미정으로 두는 편이 낫다.
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
          state: BracketMatch['state'];
          teams?: ({
            code?: string;
            name?: string;
            image?: string;
            result?: { outcome: 'win' | 'loss'; gameWins: number } | null;
          } | null)[];
        }[];
      }[];
    }[];
  }[];
}

const TBD: BracketTeam = {
  code: 'TBD',
  name: '미정',
  image: '',
  games: null,
  win: null,
  tbd: true,
};

interface RawTeam {
  code?: string;
  name?: string;
  image?: string;
  result?: { outcome: 'win' | 'loss'; gameWins: number } | null;
}

/** 빈 자리는 teams 가 아예 없거나 code 가 'TBD' 로 온다. 둘 다 미정으로 본다 */
function toTeam(t: RawTeam | null | undefined): BracketTeam {
  if (!t || !t.code || t.code === 'TBD') return TBD;
  return {
    code: t.code,
    name: t.name ?? t.code,
    image: t.image ?? '',
    games: t.result?.gameWins ?? null,
    win: t.result ? t.result.outcome === 'win' : null,
    tbd: false,
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
              teams: [toTeam(m.teams?.[0]), toTeam(m.teams?.[1])] as [BracketTeam, BracketTeam],
            })),
          })),
        }))
        .filter((col) => col.cells.length > 0),
    }))
    .filter((st) => st.columns.length > 0);
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

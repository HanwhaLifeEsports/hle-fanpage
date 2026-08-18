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
}

/** 승자조 / 패자조. 화면에서 위아래 두 줄로 갈라 놓는다 */
export type Band = 'upper' | 'lower';

export interface BracketCell {
  name: string;
  slug: string;
  /** 몇 번째 열인가 (0부터). 라운드가 진행될수록 오른쪽으로 간다 */
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
 * 칸 이름 정규화.
 *
 * 위 slug 불일치가 이름에도 그대로 나타나서, 같은 패자조를 어떤 칸은
 * "하위권 대진 - 2라운드", 어떤 칸은 "패자 대진 - 3라운드" 로 부른다.
 * 화면에서 한 조가 두 이름으로 불리면 다른 조로 읽힌다. 많이 쓰인 쪽으로 맞춘다.
 */
const cellName = (name: string) => name.replace('패자 대진', '하위권 대진');

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
 * 순위를 하나로 콕 집지 않고 범위로 적는다. 한 칸 안에서 어느 쪽이 3위이고
 * 어느 쪽이 4위인지는 응답으로 알 수 없다. 범위는 어느 배치에서도 참이다.
 *
 * 근거 2가 한 시즌 표본이라, 리그가 배치를 바꾸면 이 표기도 함께 고쳐야 한다.
 */
export function slotSeed(stageSlug: string, cellSlug: string, teamIndex: number): string | null {
  // 2025 플레이인 배치는 [레전드5위+라이즈3위], [라이즈2위+라이즈1위] 로 규칙성이
  // 없었다. 자리마다 적을 근거가 없어 칸 단위로만 남긴다
  if (stageSlug === 'play_ins') return null;
  if (cellSlug === 'round_1') return teamIndex === 0 ? '레전드 그룹 3~4위' : '플레이인 통과';
  if (cellSlug === 'upper_bracket_round_2' && teamIndex === 0) return '레전드 그룹 1~2위';
  return null;
}

/** 라운드 전체에 무엇이 들어오는지. 자리마다 적을 수 없는 칸에 쓴다 */
export function seedNote(stageSlug: string, cellSlug: string): string | null {
  if (stageSlug === 'play_ins' && cellSlug === 'round_1') return '레전드 그룹 5위 · 라이즈 그룹 1~3위';
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
  seat: { stage: string; cell: string; index: number },
): BracketTeam {
  if (!t || !t.code || t.code === 'TBD') {
    const o = t?.origin;
    let from: string | null = null;
    if (o?.type === 'match') {
      const src = cellOf.get(o.structuralId);
      // slot 1 = 승자, 2 = 패자. 2025 데이터 18건으로 확인했다
      if (src) from = `${src} ${o.slot === 1 ? '승자' : '패자'}`;
    } else {
      from = slotSeed(seat.stage, seat.cell, seat.index);
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
          for (const m of cell.matches ?? []) {
            if (m.structuralId) cellOf.set(m.structuralId, cellName(cell.name));
          }
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
              if (o.slot === 1) d.win = cellName(cell.name);
              else d.loss = cellName(cell.name);
              dest.set(o.structuralId, d);
            }
          }
        }
      }
    }
  }

  return stages
    .map((st) => {
      const cells: BracketCell[] = [];
      for (const sec of st.sections ?? []) {
        if (sec.type !== 'bracket') continue;
        (sec.columns ?? []).forEach((col, ci) => {
          for (const cell of col.cells ?? []) {
            cells.push({
              name: cellName(cell.name),
              slug: cell.slug,
              col: ci,
              band: isLower(cell.slug) ? 'lower' : 'upper',
              matches: (cell.matches ?? []).map((m) => {
                const d = (m.structuralId && dest.get(m.structuralId)) || {};
                return {
                  id: m.id,
                  state: m.state,
                  startTime: when.get(m.id) ?? null,
                  teams: [
                    toTeam(m.teams?.[0], cellOf, { stage: st.slug, cell: cell.slug, index: 0 }),
                    toTeam(m.teams?.[1], cellOf, { stage: st.slug, cell: cell.slug, index: 1 }),
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
                  lossTo: d.loss ?? (cell.slug === 'finals' ? '준우승' : '탈락'),
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

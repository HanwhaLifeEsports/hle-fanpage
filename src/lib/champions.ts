/**
 * 선수별 챔피언 전적 — 타입과 집계.
 *
 * 네트워크와 자격증명은 여기 없다 (leaguepedia.ts, ddragon.ts). 이 파일은
 * 화면도 함께 가져다 쓰므로, 서버 전용 코드가 섞이면 브라우저 번들에 딸려간다.
 */

export interface ChampionRecord {
  /** Leaguepedia 표기 (Jarvan IV). 한글 이름을 못 찾았을 때 그대로 보여준다 */
  key: string;
  /** 화면에 쓸 이름. 한글이 있으면 한글, 없으면 key */
  name: string;
  wins: number;
  losses: number;
}

/** 우리 선수 id → 챔피언 전적 (픽 많은 순) */
export type ChampionMap = Record<string, ChampionRecord[]>;

/** 한 세트에서 한 선수가 무엇을 골라 이겼는가 */
export interface PickRow {
  /** Leaguepedia 선수 문서 이름 */
  link: string;
  champion: string;
  win: boolean;
}

/**
 * 세트 단위 기록을 선수별 챔피언 전적으로 접는다.
 *
 * 정렬은 픽 수 → 승수 → 이름 순이다. 픽 수를 앞에 두는 이유: "대표 챔피언" 은
 * 잘 하는 픽이 아니라 자주 고르는 픽이다. 한 번 나와서 이긴 챔피언이
 * 열 번 나온 챔피언보다 위에 오면 대표라는 말이 무색해진다.
 */
export function foldPicks(
  rows: PickRow[],
  /** Leaguepedia 선수 문서 이름 → 우리 선수 id */
  linkToId: Record<string, string>,
  /** 챔피언 이름 현지화. 못 찾으면 원래 이름을 그대로 쓴다 */
  localize: (champion: string) => string,
): ChampionMap {
  const tally: Record<string, Record<string, ChampionRecord>> = {};

  for (const r of rows) {
    const id = linkToId[r.link];
    if (!id) continue; // 우리 로스터에 없는 선수 (교체 선수, 이적자)
    const byChamp = (tally[id] ??= {});
    const rec = (byChamp[r.champion] ??= {
      key: r.champion,
      name: localize(r.champion),
      wins: 0,
      losses: 0,
    });
    if (r.win) rec.wins++;
    else rec.losses++;
  }

  const out: ChampionMap = {};
  for (const [id, byChamp] of Object.entries(tally)) {
    out[id] = Object.values(byChamp).sort(
      (a, b) =>
        b.wins + b.losses - (a.wins + a.losses) || b.wins - a.wins || a.name.localeCompare(b.name),
    );
  }
  return out;
}

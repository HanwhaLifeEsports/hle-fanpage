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
  /** (킬+어시) / 데스. 데스가 0이면 나누지 않고 킬+어시를 그대로 쓴다 */
  kda: number;
  kills: number;
  deaths: number;
  assists: number;
  /** 팀 킬 중 관여한 비율 0~1. 팀 킬을 못 읽은 판은 빼고 센다 */
  killShare: number | null;
  /** 분당 CS. 경기 시간을 못 읽은 판은 빼고 센다 */
  csPerMin: number | null;
  /** 분당 챔피언 딜량 */
  dpm: number | null;
  /**
   * 한 판에서 낸 가장 좋은 값.
   *
   * 평균은 그 챔피언을 얼마나 안정적으로 다루는지를, 최고는 얼마나 터뜨릴 수
   * 있는지를 말한다. 둘이 크게 벌어지는 픽이 실제로 있어서 함께 둔다.
   */
  bestKda: number;
  bestDpm: number | null;
}

/** 우리 선수 id → 챔피언 전적 (픽 많은 순) */
export type ChampionMap = Record<string, ChampionRecord[]>;

/** 한 세트에서 한 선수가 무엇을 골라 어떻게 했는가 */
export interface PickRow {
  /** Leaguepedia 선수 문서 이름 */
  link: string;
  champion: string;
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  damage: number;
  /** 그 판의 팀 전체 킬. 못 읽었으면 null */
  teamKills: number | null;
  /** 그 판의 길이(분). 못 읽었으면 null */
  minutes: number | null;
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
  /** 평균을 내려면 합계와 '셀 수 있었던 판 수' 를 따로 들고 있어야 한다 */
  interface Acc {
    rec: ChampionRecord;
    teamKills: number;
    teamKillGames: number;
    cs: number;
    damage: number;
    minutes: number;
    timedGames: number;
  }
  const tally: Record<string, Record<string, Acc>> = {};

  for (const r of rows) {
    const id = linkToId[r.link];
    if (!id) continue; // 우리 로스터에 없는 선수 (교체 선수, 이적자)
    const byChamp = (tally[id] ??= {});
    const a = (byChamp[r.champion] ??= {
      rec: {
        key: r.champion,
        name: localize(r.champion),
        wins: 0,
        losses: 0,
        kda: 0,
        kills: 0,
        deaths: 0,
        assists: 0,
        killShare: null,
        csPerMin: null,
        dpm: null,
        bestKda: 0,
        bestDpm: null,
      },
      teamKills: 0,
      teamKillGames: 0,
      cs: 0,
      damage: 0,
      minutes: 0,
      timedGames: 0,
    });

    if (r.win) a.rec.wins++;
    else a.rec.losses++;
    a.rec.kills += r.kills;
    a.rec.deaths += r.deaths;
    a.rec.assists += r.assists;

    // 그 판 하나의 KDA. 데스가 0이면 나누지 않고 킬+어시를 그대로 본다
    const gameKda = r.deaths === 0 ? r.kills + r.assists : (r.kills + r.assists) / r.deaths;
    if (gameKda > a.rec.bestKda) a.rec.bestKda = gameKda;
    if (r.minutes !== null && r.minutes > 0) {
      const gameDpm = r.damage / r.minutes;
      if (a.rec.bestDpm === null || gameDpm > a.rec.bestDpm) a.rec.bestDpm = gameDpm;
    }

    if (r.teamKills !== null) {
      a.teamKills += r.teamKills;
      a.teamKillGames++;
    }
    if (r.minutes !== null && r.minutes > 0) {
      a.cs += r.cs;
      a.damage += r.damage;
      a.minutes += r.minutes;
      a.timedGames++;
    }
  }

  const out: ChampionMap = {};
  for (const [id, byChamp] of Object.entries(tally)) {
    out[id] = Object.values(byChamp)
      .map((a) => {
        const { rec } = a;
        // 데스가 0이면 나눌 수 없다. 흔히 쓰는 대로 킬+어시를 그대로 KDA 로 본다
        rec.kda = rec.deaths === 0 ? rec.kills + rec.assists : (rec.kills + rec.assists) / rec.deaths;
        rec.killShare = a.teamKills > 0 ? (rec.kills + rec.assists) / a.teamKills : null;
        rec.csPerMin = a.timedGames > 0 ? a.cs / a.minutes : null;
        rec.dpm = a.timedGames > 0 ? a.damage / a.minutes : null;
        return rec;
      })
      .sort(
        (a, b) =>
          b.wins + b.losses - (a.wins + a.losses) || b.wins - a.wins || a.name.localeCompare(b.name),
      );
  }
  return out;
}

/** "38:51" -> 38.85 (분). 형식이 다르면 null */
export function gameMinutes(len: string | undefined): number | null {
  const m = /^(\d+):(\d{1,2})$/.exec((len ?? '').trim());
  if (!m) return null;
  return Number(m[1]) + Number(m[2]) / 60;
}

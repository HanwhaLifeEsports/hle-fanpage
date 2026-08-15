/**
 * 가짜 관전 데이터.
 *
 * 롤을 켜지 않고 오버레이 배치·아이콘·킬 피드를 확인하기 위한 것이다.
 * 모양은 Live Client Data API 의 /liveclientdata/allgamedata 를 그대로 따랐다.
 * ?mock=1 일 때만 쓰인다.
 *
 * 실제 관전 응답으로 한 번 검증한 뒤에는 이 파일의 필드명이 맞는지 다시 볼 것.
 */

/** 목데이터용 아이템 가격 (실제 값에 가깝게) */
const PRICE = {
  3068: 3200, 3047: 1100, 3075: 2700, 1028: 400, 6673: 3300, 3111: 1100, 6333: 3100,
  1037: 900, 3134: 1300, 3115: 2800, 3020: 1100, 4645: 2900, 1058: 1250, 3153: 3200,
  3006: 1100, 3031: 3400, 1038: 1300, 3877: 2200, 3067: 1300, 2055: 75, 3364: 0,
  6631: 3300, 3053: 3200, 6672: 3200, 3116: 2500, 1052: 850, 6656: 3000, 3869: 400,
  3109: 2200,
};

const ROLES = ['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY'];
let seat = 0;

const P = (team, name, champRaw, champKo, sp1, sp2, keystone, lv, k, d, a, cs, items, dead = 0) => ({
  team,
  position: ROLES[seat++ % 5],
  summonerName: name,
  riotIdGameName: name,
  riotIdTagLine: 'KR1',
  championName: champKo,
  rawChampionName: `game_character_displayname_${champRaw}`,
  level: lv,
  isDead: dead > 0,
  respawnTimer: dead,
  scores: { kills: k, deaths: d, assists: a, creepScore: cs, wardScore: 12.4 },
  // 실제 응답에는 price 가 온다 — 장비 가치 계산이 여기에 달려 있으므로 목데이터에도 넣는다
  items: items.map((itemID, slot) => ({ itemID, slot, count: 1, price: PRICE[itemID] ?? 1000 })),
  runes: { keystone: { id: keystone }, secondaryRuneTree: { id: 8300 } },
  summonerSpells: {
    summonerSpellOne: { rawDisplayName: `GeneratedTip_SummonerSpell_${sp1}_DisplayName` },
    summonerSpellTwo: { rawDisplayName: `GeneratedTip_SummonerSpell_${sp2}_DisplayName` },
  },
});

const PLAYERS = [
  P('ORDER', 'Zeus', 'Gnar', '나르', 'SummonerFlash', 'SummonerTeleport', 8437, 14, 3, 1, 4, 187, [3068, 3047, 3075, 1028]),
  P('ORDER', 'Kanavi', 'Viego', '비에고', 'SummonerFlash', 'SummonerSmite', 8010, 13, 6, 2, 7, 142, [6673, 3111, 6333, 1037, 3134]),
  P('ORDER', 'Zeka', 'Azir', '아지르', 'SummonerFlash', 'SummonerTeleport', 8214, 15, 4, 3, 6, 213, [3115, 3020, 4645, 1058], 8),
  P('ORDER', 'Gumayusi', 'Jinx', '징크스', 'SummonerFlash', 'SummonerHeal', 8008, 13, 8, 1, 5, 224, [3153, 3006, 3031, 1038]),
  P('ORDER', 'Delight', 'Nautilus', '노틸러스', 'SummonerFlash', 'SummonerExhaust', 8465, 11, 0, 4, 14, 31, [3877, 3047, 3067, 2055, 3364]),
  P('CHAOS', 'Doran', 'Ambessa', '암베사', 'SummonerFlash', 'SummonerTeleport', 8010, 14, 2, 4, 3, 195, [6631, 3047, 3053, 1028]),
  P('CHAOS', 'Peanut', 'Nocturne', '녹턴', 'SummonerFlash', 'SummonerSmite', 8008, 12, 3, 3, 5, 128, [6672, 3006, 3153, 1037]),
  P('CHAOS', 'Chovy', 'Cassiopeia', '카시오페아', 'SummonerFlash', 'SummonerDot', 8229, 14, 5, 2, 4, 208, [3115, 3020, 3116, 1058, 1052]),
  P('CHAOS', 'Ruler', 'Seraphine', '세라핀', 'SummonerFlash', 'SummonerBarrier', 8214, 12, 2, 5, 8, 196, [6656, 3020, 3116, 1052]),
  P('CHAOS', 'Duro', 'Alistar', '알리스타', 'SummonerFlash', 'SummonerExhaust', 8437, 10, 0, 5, 11, 24, [3869, 3047, 3109, 2055, 3364], 14),
];

const EVENTS = [
  { EventID: 0, EventName: 'GameStart', EventTime: 0 },
  { EventID: 1, EventName: 'FirstBlood', EventTime: 214, Recipient: 'Kanavi' },
  { EventID: 2, EventName: 'TurretKilled', EventTime: 612, TurretKilled: 'Turret_T2_L_03_A' },
  { EventID: 3, EventName: 'DragonKill', EventTime: 730, KillerName: 'Kanavi', DragonType: 'Fire' },
  { EventID: 4, EventName: 'DragonKill', EventTime: 1042, KillerName: 'Peanut', DragonType: 'Water' },
  { EventID: 5, EventName: 'TurretKilled', EventTime: 1180, TurretKilled: 'Turret_T1_C_05_A' },
  { EventID: 6, EventName: 'DragonKill', EventTime: 1355, KillerName: 'Kanavi', DragonType: 'Hextech' },
  { EventID: 7, EventName: 'BaronKill', EventTime: 1490, KillerName: 'Kanavi' },
  { EventID: 8, EventName: 'ChampionKill', EventTime: 1502, KillerName: 'Gumayusi', VictimName: 'Duro' },
  { EventID: 9, EventName: 'ChampionKill', EventTime: 1508, KillerName: 'Chovy', VictimName: 'Zeka' },
];

/* 화면이 살아 있는지 보려면 시계가 흘러야 한다. 킬 피드도 30초마다 하나씩 새로 밀어 넣는다. */
const T0 = Date.now();
let extra = 100;

export function MOCK() {
  const elapsed = (Date.now() - T0) / 1000;
  const events = [...EVENTS];
  const n = Math.floor(elapsed / 30);
  for (let i = 0; i < n; i++) {
    events.push({
      EventID: extra + i,
      EventName: 'ChampionKill',
      EventTime: 1520 + i * 30,
      KillerName: i % 2 ? 'Chovy' : 'Kanavi',
      VictimName: i % 2 ? 'Zeka' : 'Ruler',
    });
  }
  const gameTime = 1500 + elapsed;

  // 버프 표시를 확인하려고 바론(블루)·장로(레드)를 현재 시각 근처에 심는다.
  // 지속시간이 지나면 알아서 사라지고, 다시 주기적으로 붙는다.
  const cycle = elapsed % 240;
  if (cycle < 170) {
    events.push({ EventID: 900, EventName: 'BaronKill', EventTime: gameTime - cycle, KillerName: 'Kanavi' });
  }
  if (cycle > 60 && cycle < 200) {
    events.push({
      EventID: 901, EventName: 'DragonKill', DragonType: 'Elder',
      EventTime: gameTime - (cycle - 60), KillerName: 'Chovy',
    });
  }

  return {
    allPlayers: PLAYERS,
    events: { Events: events },
    gameData: { gameMode: 'CLASSIC', gameTime, mapName: 'Map11' },
  };
}

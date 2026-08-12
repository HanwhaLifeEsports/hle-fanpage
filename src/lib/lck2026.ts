/**
 * 2026 LCK 시즌 데이터
 *
 * [실제 확인된 사실]
 *  - 참가 10개 팀 및 태그
 *  - 한화생명e스포츠 2026 로스터 / 코칭스태프
 *  - 시즌 포맷 (정규 4라운드, 1~2R 후 레전드/라이즈 그룹 분할, 상위 5팀 PO 직행)
 *  - 시즌 일정 (2026-04-01 개막 ~ 2026-09-13 결승)
 *  - 중계권: 2026~2030 네이버(치지직) + SOOP 국내 독점.
 *    유튜브는 국내 정규시즌 생중계 없음(국제 대회만), 디즈니+는 비시즌 컵 대회.
 *
 * 순위·일정·전적은 LoL Esports API 에서 실시간으로 가져온다 (src/lib/lolesports.ts).
 */

export type PlatformId = 'chzzk' | 'soop' | 'youtube' | 'disney';

/** 대회 구분 — 어느 플랫폼으로 송출되는지가 여기서 갈린다 */
export type Competition = 'lck' | 'intl' | 'cup';

export interface Platform {
  id: PlatformId;
  name: string;
  /** iframe 삽입 가능 여부. 디즈니+는 DRM(Widevine) + 로그인 필수라 플레이어 임베드가 존재하지 않는다 */
  embeddable: boolean;
  /** 서버에서 라이브 여부를 실제로 판정할 수 있는가 */
  detectable: boolean;
  color: string;
  channelUrl: string;
  note?: string;
}

export const PLATFORMS: Record<PlatformId, Platform> = {
  chzzk: {
    id: 'chzzk',
    name: '치지직',
    // 치지직은 '클립'만 iframe 임베드를 지원한다 (/embed/clip/{id}).
    // 라이브 플레이어 임베드 라우트는 없고, /embed/live/{id} 는 404 페이지로 떨어진다.
    embeddable: false,
    detectable: true,
    color: '#00FFA3',
    channelUrl: 'https://chzzk.naver.com/live/9381e7d6816e6d915a44a13c0195b202',
    note: '라이브 플레이어 임베드 미지원 (클립만 가능) — 앱/웹으로 이동',
  },
  soop: {
    id: 'soop',
    name: 'SOOP',
    embeddable: true,
    detectable: true,
    color: '#3B82F6',
    channelUrl: 'https://play.sooplive.co.kr/aflol',
    note: '공식 임베드 플레이어 제공 — 방송 중일 때만 화면이 나온다',
  },
  youtube: {
    id: 'youtube',
    name: 'YouTube',
    embeddable: true,
    detectable: false, // Data API 키가 있어야 판정 가능. 임베드가 스스로 라이브를 찾아가므로 판정 없이 붙인다
    color: '#FF0033',
    channelUrl: 'https://www.youtube.com/@LCK',
    note: '2026년부터 국내 LCK 생중계 없음 — 국제 대회만',
  },
  disney: {
    id: 'disney',
    name: 'Disney+',
    embeddable: false, // ← 임베드 불가. 딥링크만 가능
    detectable: false,
    color: '#0E63BE',
    channelUrl: 'https://www.disneyplus.com/',
    note: 'DRM + 로그인 필수 → 플레이어 임베드 불가, 앱 딥링크만',
  },
};

/** 치지직·SOOP·유튜브 채널 식별자 (실측 확인) */
export const CHANNELS = {
  chzzk: '9381e7d6816e6d915a44a13c0195b202', // LCK 공식, 팔로워 41.5만, 인증 채널
  soop: 'aflol', // LCK_KR
  youtube: 'UCw1DsweY9b2AKGjV4kGJP1A', // LCK
  youtubeGlobal: 'UCKVlixycWmapnGQ_wht4cHQ', // LCK Global
} as const;

export type SlotRole = '생중계' | '하이라이트·다시보기';
export interface BroadcastSlot {
  platform: PlatformId;
  role: SlotRole;
}

/** 대회 종류별 송출 채널 — 하드코딩이 아니라 여기서 파생시킨다 */
export function broadcastsFor(competition: Competition): BroadcastSlot[] {
  switch (competition) {
    case 'lck':
      // 국내 정규시즌 = 치지직·SOOP 동시 생중계. 유튜브는 하이라이트/다시보기 전용.
      return [
        { platform: 'chzzk', role: '생중계' },
        { platform: 'soop', role: '생중계' },
        { platform: 'youtube', role: '하이라이트·다시보기' },
      ];
    case 'intl':
      // First Stand / MSI / Worlds — 유튜브도 생중계에 합류
      return [
        { platform: 'chzzk', role: '생중계' },
        { platform: 'soop', role: '생중계' },
        { platform: 'youtube', role: '생중계' },
      ];
    case 'cup':
      return [{ platform: 'disney', role: '생중계' }]; // KeSPA CUP 등 비시즌 컵 대회
  }
}

/* ------------------------------------------------------------------ */
/* 팀 · 시즌 메타                                                       */
/* ------------------------------------------------------------------ */

export const OUR_TAG = 'HLE';

/** 순위·일정·전적은 전부 LoL Esports API 에서 온다 (src/lib/lolesports.ts).
 *  샘플 테이블을 두지 않는 이유: 사실이 두 곳에 있으면 반드시 어긋난다. */
export const SEASON = {
  year: 2026,
  finalsAt: '2026-09-13',
  /** 스플릿2(정규 1~2R) + 스플릿3(3~4R 그룹)을 합친 것이 실제 정규 순위다 */
  format:
    '정규 1~2라운드 성적으로 레전드·라이즈 그룹을 나누고, 3~4라운드는 그룹 안에서 치른다. 순위는 두 구간 합산.',
  legend: { label: '레전드 그룹', note: '1~2위 플레이오프 2라운드 직행 · 3~4위 1라운드 · 5위 플레이-인' },
  rise: { label: '라이즈 그룹', note: '1~3위 플레이-인 · 4~5위 시즌 종료' },
} as const;

/* ------------------------------------------------------------------ */
/* 선수 — 2026 한화생명e스포츠 (실제 로스터)                            */
/* ------------------------------------------------------------------ */

export interface Player {
  id: string;
  nm: string;
  ko: string;
  pos: 'TOP' | 'JGL' | 'MID' | 'BOT' | 'SUP';
  no: string;
  /** 대표 챔피언 — 2026 시즌 경기에서 반복해 고른 픽 */
  champs: string[];
  /** 2026 시즌 합류 여부 */
  joined2026?: boolean;
}

export const PLAYERS: Player[] = [
  { id: 'zeus', nm: 'Zeus', ko: '최우제', pos: 'TOP', no: '01', champs: ['잭스', '그웬', '케넨'] },
  { id: 'kanavi', nm: 'Kanavi', ko: '서진혁', pos: 'JGL', no: '02', champs: ['비에고', '자르반 4세', '리 신'], joined2026: true },
  { id: 'zeka', nm: 'Zeka', ko: '김건우', pos: 'MID', no: '03', champs: ['아지르', '오리아나', '실라스'] },
  { id: 'gumayusi', nm: 'Gumayusi', ko: '이민형', pos: 'BOT', no: '04', champs: ['징크스', '제리', '칼리스타'], joined2026: true },
  { id: 'delight', nm: 'Delight', ko: '유환중', pos: 'SUP', no: '05', champs: ['노틸러스', '레나타', '알리스타'] },
];

export const STAFF = [
  { role: '감독', nm: 'Homme', ko: '윤성영' },
  { role: '코치', nm: 'Mowgli', ko: '이재하' },
  { role: '코치', nm: 'Sin', ko: '연형모' },
];

/* ------------------------------------------------------------------ */
/* 라이브 창                                                            */
/* ------------------------------------------------------------------ */

/** 킥오프 10분 전 ~ 4시간 후를 "경기 시간대"로 본다.
 *  실제 LIVE 판정은 이 창 안에서 서버가 치지직·SOOP 를 폴링해 내린다. */
export const LIVE_WINDOW = { beforeMs: 10 * 60 * 1000, afterMs: 4 * 60 * 60 * 1000 };

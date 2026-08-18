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
    note: '치지직에서 시청할 수 있습니다',
  },
  soop: {
    id: 'soop',
    name: 'SOOP',
    embeddable: true,
    detectable: true,
    color: '#3B82F6',
    channelUrl: 'https://play.sooplive.co.kr/aflol',
    note: 'SOOP에서 시청할 수 있습니다',
  },
  youtube: {
    id: 'youtube',
    name: 'YouTube',
    embeddable: true,
    detectable: false, // Data API 키가 있어야 판정 가능. 임베드가 스스로 라이브를 찾아가므로 판정 없이 붙인다
    color: '#FF0033',
    channelUrl: 'https://www.youtube.com/@LCK',
    note: '국내 정규시즌은 하이라이트·다시보기만 올라옵니다',
  },
  disney: {
    id: 'disney',
    name: 'Disney+',
    embeddable: false, // ← 임베드 불가. 딥링크만 가능
    detectable: false,
    color: '#0E63BE',
    channelUrl: 'https://www.disneyplus.com/',
    note: '디즈니+ 앱에서 시청할 수 있습니다',
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
  legend: { label: '레전드 그룹', note: '1~2위 플레이오프 2라운드 직행 · 3~4위 1라운드 · 5위 플레이인' },
  rise: { label: '라이즈 그룹', note: '1~3위 플레이인 · 4~5위 시즌 종료' },
} as const;

/* ------------------------------------------------------------------ */
/* 선수 — 2026 한화생명e스포츠 (실제 로스터)                            */
/* ------------------------------------------------------------------ */

/**
 * 선수 사진.
 *
 * 이 사이트에서 가장 조심해야 하는 자산이다. 촬영자의 저작권과 선수의 초상권이
 * 겹쳐 있고, 구단 2차 창작 가이드라인은 영상만 다루고 사진은 다루지 않는다.
 * 그래서 파일 경로만 두지 않고 "어디서 왔고 무슨 근거로 쓰는지"를 같이 적는다.
 * 근거를 적을 수 없는 사진은 넣지 않는다.
 *
 * 파일 목록과 출처는 public/players/README.md 에도 표로 남긴다.
 *
 * [현재 등록된 사진 없음]
 * 처음 넣었던 사진은 basis 를 'self'(운영자 직접 촬영)로 적었는데 실제 경위가
 * 그와 달라 내렸다. 근거가 확실하지 않은 사진은 싣지 않는다는 것이 이 타입의
 * 존재 이유이고, 그 타입이 실제로 걸러낸 첫 사례다.
 * 지금은 팬 사진(src/lib/photos)만 뜬다.
 */
export interface PlayerPhoto {
  src: string;
  /** next/image 가 로딩 전에 자리를 잡으려면 원본 크기가 필요하다 */
  width: number;
  height: number;
  /**
   * 무슨 근거로 쓰는가.
   *  self        직접 촬영. 저작권은 우리에게 있고 초상권만 남는다
   *  permission  촬영자 또는 구단에게 사용 허락을 받았다
   *  unverified  아직 확인하지 못했다 — 배포 전에 반드시 해소할 것
   */
  basis: 'self' | 'permission' | 'unverified';
  /** 화면과 문서에 표시할 출처 문구 */
  credit: string;
  /** 근거를 확인한 날짜 */
  checkedAt: string;
}

export interface Player {
  id: string;
  nm: string;
  ko: string;
  pos: 'TOP' | 'JGL' | 'MID' | 'BOT' | 'SUP';
  /** 실제 등번호 */
  no: string;
  /**
   * 네이버 e스포츠 선수 id — POM 포인트와 기록을 붙이는 연결 키 (src/lib/naver.ts).
   *
   * 닉네임으로 맞추지 않는 이유: 표기가 바뀌면(대소문자, 개명) 조용히 어긋나고
   * 화면에서는 그냥 기록이 없는 선수로 보인다. id 는 바뀌지 않는다.
   * 값은 /service/v1/ranking/lck_2026/player 응답의 playerId 에서 확인한다.
   */
  naverId: string;
  /**
   * Leaguepedia 선수 문서 이름 — 챔피언 전적을 붙이는 연결 키 (src/lib/leaguepedia.ts).
   *
   * 닉네임과 다를 수 있다. 동명이인이 있으면 문서 이름에 괄호가 붙는다
   * (Zeka -> "Zeka (Kim Geon-woo)"). 값은 ScoreboardPlayers.Link 에서 확인한다.
   */
  lpName: string;
  photo?: PlayerPhoto;
  /** 2026 시즌 합류 여부 */
  joined2026?: boolean;
}

export const PLAYERS: Player[] = [
  // 등번호는 실제 값. naverId 와 lpName 은 각 API 응답에서 확인했다 (2026-08-18)
  { id: 'zeus', nm: 'Zeus', ko: '최우제', pos: 'TOP', no: '10', naverId: '10485', lpName: 'Zeus' },
  { id: 'kanavi', nm: 'Kanavi', ko: '서진혁', pos: 'JGL', no: '01', naverId: '2875', lpName: 'Kanavi', joined2026: true },
  { id: 'zeka', nm: 'Zeka', ko: '김건우', pos: 'MID', no: '07', naverId: '10557', lpName: 'Zeka (Kim Geon-woo)' },
  { id: 'gumayusi', nm: 'Gumayusi', ko: '이민형', pos: 'BOT', no: '98', naverId: '10320', lpName: 'Gumayusi', joined2026: true },
  { id: 'delight', nm: 'Delight', ko: '유환중', pos: 'SUP', no: '25', naverId: '10494', lpName: 'Delight' },
];

export interface Staff {
  id: string;
  role: string;
  nm: string;
  ko: string;
  /** Leaguepedia 문서 이름 — 계약 종료일을 붙이는 연결 키 */
  lpName: string;
}

export const STAFF: Staff[] = [
  { id: 'homme', role: '감독', nm: 'Homme', ko: '윤성영', lpName: 'Homme' },
  { id: 'mowgli', role: '코치', nm: 'Mowgli', ko: '이재하', lpName: 'Mowgli' },
  { id: 'sin', role: '코치', nm: 'Sin', ko: '연형모', lpName: 'Sin (Yeon Hyeong-mo)' },
];

/* ------------------------------------------------------------------ */
/* 라이브 창                                                            */
/* ------------------------------------------------------------------ */

/** 킥오프 10분 전 ~ 4시간 후를 "경기 시간대"로 본다.
 *  실제 LIVE 판정은 이 창 안에서 서버가 치지직·SOOP 를 폴링해 내린다. */
export const LIVE_WINDOW = { beforeMs: 10 * 60 * 1000, afterMs: 4 * 60 * 60 * 1000 };

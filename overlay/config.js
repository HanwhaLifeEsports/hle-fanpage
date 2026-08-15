/**
 * 오버레이 설정 — 여기만 고치면 된다.
 */

/**
 * 강조할 선수의 라이엇 ID.
 *
 * 게임 안에서 오는 값(riotIdGameName)과 대소문자 무시하고 비교한다.
 * 태그(#KR1)는 붙여도 되고 빼도 된다.
 *
 * ⚠️ 반드시 본인이 확인한 계정만 넣을 것. 추측으로 넣으면 방송에
 *    엉뚱한 일반인의 플레이가 "선수" 로 표시된다.
 */
export const TRACKED = [
  // 'Zeus#KR1',
  // 'Kanavi#KR1',
];

/** 관전 대기 화면에 띄울 문구 */
export const WAITING = {
  title: '관전 대기 중',
  body: '롤 클라이언트에서 관전을 시작하면 자동으로 뜹니다.',
};

/** 킬 피드에 남겨둘 시간(ms) */
export const FEED_MS = 9000;

/** 게임 API 폴링 주기(ms) */
export const POLL_MS = 500;

/**
 * 버프 지속시간.
 *
 * 관전 API 는 버프를 안 준다. BaronKill / DragonKill(Elder) 이벤트 시각에 이 값을 더해
 * 만료를 계산한다. 패치로 바뀌면 여기만 고치면 된다.
 */
export const BARON_MS = 180_000;   // 바론 3분
export const ELDER_MS = 150_000;   // 장로 2분 30초

/**
 * 오브젝트 스폰 스케줄 (초).
 *
 * ⚠️ 패치마다 바뀝니다. 아래는 2026-08 기준 값이고, 확신할 수 없는 값이라
 *    화면에도 추정치임을 표시합니다. 틀렸다 싶으면 여기만 고치세요.
 *
 * first   : 게임 시작 후 첫 등장 시각
 * respawn : 처치된 뒤 다시 나오기까지. null 이면 다시 안 나옴
 */
export const SPAWN = {
  // 상단 강 — 유충 → 전령 → 바론 순서로 자리를 물려받는다. until 은 사라지는 시각.
  grubs:  { ko: '공허 유충', first: 360,  respawn: null, until: 840,  river: 'top' },
  herald: { ko: '전령',      first: 840,  respawn: null, until: 1500, river: 'top' },
  baron:  { ko: '바론',      first: 1500, respawn: 360,  until: null, river: 'top' },
  // 하단 강 — 계속 리스폰된다
  dragon: { ko: '드래곤',    first: 300,  respawn: 300,  until: null, river: 'bot' },
};

/**
 * CS 1개당 골드 환산값 — **추정치입니다.**
 *
 * creepScore 는 라인 미니언과 정글 몹을 합친 숫자 하나라 무엇을 몇 개 먹었는지 알 수 없습니다.
 * 미니언만 해도 근접 21g · 원거리 14g · 공성 60~90g 로 제각각이라 정확한 환산은 불가능합니다.
 * 그래서 평균 단가로 근사하고, 화면에는 "추정" 을 답니다.
 */
export const CS_GOLD = 21;

/**
 * 연속 처치별 현상금 — **추정치입니다.**
 *
 * API 에 현상금 필드가 없어서, 폴링하며 연속 처치를 직접 세어 여기에 대응시킵니다.
 * 라이엇 공식 공식과 정확히 같지 않고, 관전 시작 전에 쌓인 연속 처치는 알 수 없습니다.
 */
export const BOUNTY = [0, 0, 450, 600, 750, 900, 1000];

/** 상단 강 오브젝트가 자리를 물려받는 순서 */
export const TOP_RIVER = ['grubs', 'herald', 'baron'];

/** 용 종류별 색 — 팬페이지 스코어보드와 같은 값 */
export const DRAKE = {
  Fire: { ko: '화염', color: '#E5484D' },
  Earth: { ko: '대지', color: '#C08A4A' },
  Water: { ko: '바다', color: '#3FA9E0' },
  Air: { ko: '바람', color: '#9FD8CE' },
  Hextech: { ko: '마공', color: '#7FD3F5' },
  Chemtech: { ko: '화학공학', color: '#7FBF3F' },
  Elder: { ko: '장로', color: '#B9A6FF' },
};

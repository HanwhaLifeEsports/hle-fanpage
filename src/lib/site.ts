/** 배포 도메인. Vercel 은 VERCEL_PROJECT_PRODUCTION_URL 을 자동으로 넣어준다. */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'http://localhost:3000');

export const SITE_NAME = 'HLE FAN';

/**
 * 권리 침해 신고를 받는 곳.
 *
 * 저작권법 제103조 제4항은 복제·전송 중단 요구를 받을 "수령인" 을 지정하고
 * 이용자가 쉽게 알 수 있도록 공지할 것을 요구한다. 정보통신망법 제44조의2 의
 * 삭제 요청과 초상권에 따른 삭제 요청도 같은 창구로 받는다.
 *
 * 환경변수가 아니라 여기 상수로 둔다. 법이 요구하는 공지가 배포 설정 하나를
 * 빠뜨렸다고 조용히 약한 창구(저장소 이슈)로 내려앉으면 안 된다. 저장소 이슈는
 * 공개된 자리라 권리자가 신원을 드러내지 않고 요청하기 어렵다.
 *
 * 주소가 바뀌면 이 값을 고치고 배포한다.
 */
export const ABUSE_EMAIL = 'protect@gumayu.si';
export const REPO_URL = 'https://github.com/HanwhaLifeEsports/hle-fanpage';

export const ABUSE_CONTACT = { label: ABUSE_EMAIL, href: `mailto:${ABUSE_EMAIL}` };
export const SITE_DESC =
  '2026 LCK 한화생명e스포츠 비공식 팬페이지. 경기 알림 · 치지직·SOOP 중계 · 통합 순위 · 플레이오프 경우의 수.';

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
 * 삭제 요청도 같은 창구로 받는다.
 *
 * 지금은 저장소 이슈다. 다만 이슈는 공개된 자리라, 권리자가 자기 신원을 드러내지
 * 않고 요청하기 어렵다. 전용 메일 주소를 정해 NEXT_PUBLIC_ABUSE_EMAIL 로 넣으면
 * 그쪽이 앞선다.
 */
const ABUSE_EMAIL = process.env.NEXT_PUBLIC_ABUSE_EMAIL;
export const REPO_URL = 'https://github.com/HanwhaLifeEsports/hle-fanpage';

export const ABUSE_CONTACT = ABUSE_EMAIL
  ? { label: ABUSE_EMAIL, href: `mailto:${ABUSE_EMAIL}` }
  : { label: '저장소 이슈', href: `${REPO_URL}/issues/new` };
export const SITE_DESC =
  '2026 LCK 한화생명e스포츠 비공식 팬페이지. 경기 알림 · 치지직·SOOP 중계 · 통합 순위 · 플레이오프 경우의 수.';

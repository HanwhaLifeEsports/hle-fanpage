/** 배포 도메인. Vercel 은 VERCEL_PROJECT_PRODUCTION_URL 을 자동으로 넣어준다. */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'http://localhost:3000');

export const SITE_NAME = 'HLE FAN';
export const SITE_DESC =
  '2026 LCK 한화생명e스포츠 비공식 팬페이지. 경기 알림 · 치지직·SOOP 중계 · 통합 순위 · 플레이오프 경우의 수.';

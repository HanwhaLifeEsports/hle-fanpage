import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import { Anton } from 'next/font/google';
import './globals.css';
import { AppBar, BottomTabs } from '@/components/Chrome';
import { Toasts } from '@/components/Shared';
import RegisterSW from '@/components/RegisterSW';
import Reveal from '@/components/Reveal';
import { Analytics } from '@vercel/analytics/next';
import { ABUSE_CONTACT, SITE_DESC, SITE_NAME, SITE_URL } from '@/lib/site';

// 라틴 초대형 디스플레이 전용. 한글은 자체 호스팅한 Freesentation (globals.css)
const anton = Anton({ weight: '400', subsets: ['latin'], variable: '--font-anton', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME} — 한화생명e스포츠 팬페이지`, template: `%s · ${SITE_NAME}` },
  description: SITE_DESC,
  applicationName: SITE_NAME,
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: SITE_NAME, statusBarStyle: 'black-translucent' },
  icons: {
    icon: [{ url: '/favicon.png', type: 'image/png' }],
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    locale: 'ko_KR',
    title: `${SITE_NAME} — 한화생명e스포츠 팬페이지`,
    description: SITE_DESC,
    images: [{ url: '/og.png', width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: { card: 'summary_large_image', title: SITE_NAME, description: SITE_DESC, images: ['/og.png'] },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  // 주소창 색은 테마를 따라간다. 다크 캔버스(#08090A)와 라이트 캔버스(#F7F7F8).
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#08090A' },
    { media: '(prefers-color-scheme: light)', color: '#F7F7F8' },
  ],
  viewportFit: 'cover',
  colorScheme: 'dark light',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    /* suppressHydrationWarning 은 아래 FOUC 방지 스크립트 때문이다. 그 스크립트가
       하이드레이션 전에 <html> 에 data-theme 을 붙이는데, 서버가 그린 HTML 에는
       그 속성이 없어 React 가 불일치로 잡는다. 의도된 차이이고 이 요소의 속성에만
       적용되므로 자식 트리의 진짜 불일치는 그대로 잡힌다. */
    <html lang="ko" className={anton.variable} suppressHydrationWarning>
      <head>
        {/* 본문 서체는 첫 화면에 바로 필요하다 */}
        <link rel="preload" href="/fonts/freesentation-400.woff2" as="font" type="font/woff2" crossOrigin="" />
        <link rel="preload" href="/fonts/freesentation-900.woff2" as="font" type="font/woff2" crossOrigin="" />
        {/* 저장된 테마 선택을 첫 페인트 '전에' 붙인다. 이 스크립트가 없으면 라이트를
            고른 사용자에게 서버가 그린 다크 화면이 한 번 번쩍인다(FOUC). 고른 적이
            없으면 아무것도 하지 않고 CSS 의 prefers-color-scheme 에 맡긴다. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('hle-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`,
          }}
        />
        {/* 자바스크립트가 꺼져 있으면 등장 효과를 걸 사람이 없어 화면이 통째로 빈다.
            기본을 '효과 없음' 으로 두고 스크립트가 돌 때만 켠다 */}
        <noscript>
          <style>{`.rv{opacity:1!important;transform:none!important}`}</style>
        </noscript>
      </head>
      <body>
        <Toasts />
        <RegisterSW />
        <Reveal />
        <AppBar />
        <main>{children}</main>
        <footer>
          <div className="wrap foot">
            <div>
              <b>{SITE_NAME}</b>
              {/* 비영리 명시는 구단 2차 창작 가이드라인이 "반드시 명시"를 요구한 항목이다.
                  라이엇 필수 고지 문구는 넣지 않는다 — 게임 아트·로고를 쓰는 프로젝트용이고,
                  이 사이트는 LCK 명칭·챔피언 이름 텍스트·공개 데이터만 쓴다. */}
              <span>
                한화생명e스포츠를 응원하는 팬이 만든 비공식 페이지입니다. 한화생명e스포츠 · 라이엇 게임즈 ·
                LCK 어느 곳과도 제휴하거나 후원받지 않으며, 광고 · 후원 · 판매 등 어떠한 방식으로도 수익을
                만들지 않습니다.
              </span>
              {/* 저작권법 제103조 제4항은 중단 요구를 받을 수령인을 "이용자가 쉽게 알 수 있도록"
                  공지할 것을 요구한다. 처리방침 안쪽에만 두면 쉽게 알 수 있다고 보기 어려워
                  모든 화면에 걸리는 푸터에도 적는다. */}
              <span>
                일정과 순위는 LCK 공식 기록을 실시간으로 반영합니다. 권리자의 요청이 있을 경우 해당 콘텐츠를
                즉시 삭제합니다. 저작권 · 초상권 관련 요청은{' '}
                <a href={ABUSE_CONTACT.href}>{ABUSE_CONTACT.label}</a> 로 받습니다.
              </span>
            </div>
            <nav>
              <Link href="/board">커뮤니티</Link>
              <Link href="/privacy">개인정보 처리방침</Link>
              <a href="https://github.com/HanwhaLifeEsports/hle-fanpage" target="_blank" rel="noopener noreferrer">
                소스 저장소
              </a>
            </nav>
          </div>
        </footer>
        <BottomTabs />
        {/* 방문 수만 센다. 쿠키를 쓰지 않고 사람을 가로질러 따라다니지 않는다.
            개인정보 처리방침 5항에 무엇을 켰는지 적어 두었다 — 문서와 코드가
            어긋나면 문서 쪽이 거짓말이 된다 */}
        <Analytics />
      </body>
    </html>
  );
}

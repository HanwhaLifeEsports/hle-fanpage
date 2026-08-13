import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import { Anton } from 'next/font/google';
import './globals.css';
import { AppBar, BottomTabs } from '@/components/Chrome';
import { Toasts } from '@/components/Shared';
import RegisterSW from '@/components/RegisterSW';
import { SITE_DESC, SITE_NAME, SITE_URL } from '@/lib/site';

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
    <html lang="ko" className={anton.variable}>
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
      </head>
      <body>
        <Toasts />
        <RegisterSW />
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
              <span>
                일정과 순위는 LCK 공식 기록을 실시간으로 반영합니다. 권리자의 요청이 있을 경우 해당 콘텐츠를
                즉시 삭제합니다.
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
      </body>
    </html>
  );
}

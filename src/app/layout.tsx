import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import { Anton } from 'next/font/google';
import './globals.css';
import IconSprite from '@/components/IconSprite';
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
  themeColor: '#08090A',
  viewportFit: 'cover',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="ko" className={anton.variable}>
      <head>
        {/* 본문 서체는 첫 화면에 바로 필요하다 */}
        <link rel="preload" href="/fonts/freesentation-400.woff2" as="font" type="font/woff2" crossOrigin="" />
        <link rel="preload" href="/fonts/freesentation-900.woff2" as="font" type="font/woff2" crossOrigin="" />
      </head>
      <body>
        <IconSprite />
        <Toasts />
        <RegisterSW />
        <AppBar />
        <main>{children}</main>
        <footer>
          <div className="wrap foot">
            <div>
              <b>{SITE_NAME}</b>
              <span>
                팬이 운영하는 비공식 사이트입니다. 한화생명e스포츠 · 라이엇 게임즈와 관계가 없습니다.
              </span>
              <span>일정 · 순위 · 경기 결과는 LoL Esports 공개 API에서 실시간으로 가져옵니다.</span>
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

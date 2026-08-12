import type { Metadata, Viewport } from 'next';
import { Anton } from 'next/font/google';
import './globals.css';
import IconSprite from '@/components/IconSprite';
import { AppBar, BottomTabs } from '@/components/Chrome';
import { Toasts } from '@/components/Shared';

// 라틴 초대형 디스플레이 전용. 한글은 Freesentation 900 (globals.css 의 @font-face)
const anton = Anton({ weight: '400', subsets: ['latin'], variable: '--font-anton', display: 'swap' });

export const metadata: Metadata = {
  title: 'HLE FAN — 한화생명e스포츠 팬페이지',
  description:
    '2026 LCK 한화생명e스포츠 비공식 팬페이지. 경기 알림, 라이브 중계, 커뮤니티, 승부예측.',
};

export const viewport: Viewport = {
  themeColor: '#08090A',
  viewportFit: 'cover',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="ko" className={anton.variable}>
      <body>
        <IconSprite />
        <Toasts />
        <AppBar />
        {children}
        <footer>
          <div
            className="wrap"
            style={{ display: 'flex', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}
          >
            <span>HLE FAN · 2026 LCK</span>
            <span>
              팬이 운영하는 비공식 사이트입니다. 로스터·팀·중계 정보는 실제 확인분이며, 전적·순위·개인 스탯은
              샘플입니다.
            </span>
          </div>
        </footer>
        <BottomTabs />
      </body>
    </html>
  );
}

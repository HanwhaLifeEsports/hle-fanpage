import type { Metadata, Viewport } from 'next';
import { Anton } from 'next/font/google';
import './globals.css';
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
        <Toasts />
        <AppBar />
        {children}
        <footer>
          <div className="wrap">
            <div className="frow">
              <span>HLE FAN · 2026 LCK</span>
              <span>
                팬이 운영하는 비공식 사이트입니다. 로스터·팀·중계 정보는 실제 확인분이며, 전적·순위·개인 스탯은
                샘플입니다.
              </span>
            </div>
            <div className="legal">
              <p>
                한화생명e스포츠를 응원하는 팬이 만든 비공식 페이지입니다. 한화생명e스포츠, 라이엇 게임즈, LCK
                어느 곳과도 제휴하거나 후원받지 않으며, 광고·후원·판매 등 어떠한 방식으로도 수익을 만들지
                않습니다.
              </p>
              <p>
                경기 일정·순위·전적은 LoL Esports 공개 데이터를 사용합니다. 권리자의 요청이 있을 경우 해당
                콘텐츠를 즉시 삭제합니다.
              </p>
            </div>
          </div>
        </footer>
        <BottomTabs />
      </body>
    </html>
  );
}

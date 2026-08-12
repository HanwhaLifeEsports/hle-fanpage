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
                한화생명e스포츠, 라이엇 게임즈, LCK와 아무런 제휴 관계가 없는 팬 제작물이며, 광고, 후원, 판매 등
                어떠한 방식으로도 수익을 창출하지 않습니다.
              </p>
              <p>
                HLE FAN은 라이엇 게임즈의 &lsquo;지식재산 이용 정책&rsquo;에 따라 라이엇 게임즈 소유의 자산을
                이용하여 제작되었습니다. 라이엇 게임즈는 이 프로젝트를 지지하거나 후원하지 않습니다.
              </p>
              <p>권리자의 요청이 있을 경우 해당 콘텐츠를 즉시 삭제합니다.</p>
            </div>
          </div>
        </footer>
        <BottomTabs />
      </body>
    </html>
  );
}

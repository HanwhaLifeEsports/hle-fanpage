'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bell,
  BellOff,
  BellRing,
  CalendarDays,
  House,
  MessagesSquare,
  MonitorPlay,
  Moon,
  Sun,
  UserRound,
} from 'lucide-react';
import { useNotify } from '@/lib/useAppState';
import { useTheme } from '@/lib/useTheme';
import TeamLogo from './TeamLogo';

/** 상단 캡슐의 HLE 로고 (LoL Esports 공식 이미지) */
export const HLE_LOGO = 'https://static.lolesports.com/teams/1631819564399_hle-2021-worlds.png';

/** 앱과 같은 다섯 탭. 선수·예측·멀티뷰는 홈과 MY 에서 들어간다 */
const TABS = [
  { href: '/', label: '홈', Icon: House },
  { href: '/schedule', label: '일정', Icon: CalendarDays },
  { href: '/live', label: '중계', Icon: MonitorPlay },
  { href: '/board', label: '게시판', Icon: MessagesSquare },
  { href: '/me', label: 'MY', Icon: UserRound },
];

const isOn = (path: string, href: string) => (href === '/' ? path === '/' : path.startsWith(href));

/**
 * 위쪽 유리 캡슐. 홈은 진한 주황 면 위라 흰 글자, 하위 화면은 옅은 면 위라 본문 색.
 * 하위 화면 표시는 body 에 붙여서 CSS(.ui-sub)가 배경 높이·글자 색을 바꾸게 한다.
 */
export function AppBar() {
  const path = usePathname();
  const { permission, ask } = useNotify();

  useEffect(() => {
    document.body.classList.toggle('ui-sub', path !== '/');
    // 중계·승부예측은 앱처럼 늘 어두운 톤
    document.body.classList.toggle('ui-live', path.startsWith('/live') || path.startsWith('/predict'));
  }, [path]);

  return (
    <header className="ui-top">
      <Link href="/" className="ui-brand glass" aria-label="HLE FAN 홈">
        <TeamLogo image={HLE_LOGO} size={32} />
        <b>HLE FAN</b>
        <span>비공식</span>
      </Link>
      <div className="ui-top-act">
        <ThemeToggle />
        <NotifyButton permission={permission} onAsk={ask} />
      </div>
    </header>
  );
}

/** 네 가지 상태를 각각 다르게 보여준다. granted 가 아니라고 전부 "켜기"로 두면,
 *  차단·미지원처럼 눌러도 켤 수 없는 상태를 켤 수 있는 것처럼 말하게 된다. */
/** 지금 테마의 반대로 넘어가는 버튼. 아이콘은 '누르면 가는 곳'을 가리킨다. */
function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const toLight = theme === 'dark';
  return (
    <button
      className="ui-iconbtn glass"
      onClick={toggle}
      aria-label={toLight ? '라이트 모드로 전환' : '다크 모드로 전환'}
      title={toLight ? '라이트 모드로 전환' : '다크 모드로 전환'}
    >
      {toLight ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}

const NOTIFY_VIEW: Record<string, { Icon: typeof Bell; label: string; on: boolean }> = {
  granted: { Icon: BellRing, label: '알림 켜짐', on: true },
  denied: { Icon: BellOff, label: '알림 차단됨', on: false },
  unsupported: { Icon: BellOff, label: '알림 미지원', on: false },
  default: { Icon: Bell, label: '알림 켜기', on: false },
};

const NOTIFY_HINT: Record<string, string> = {
  granted: '알림 항목은 설정에서 변경할 수 있습니다.',
  denied: '브라우저 사이트 설정에서 알림을 허용해 주세요.',
  unsupported: '이 브라우저는 웹 알림을 지원하지 않습니다.',
};

/**
 * 권한을 요청할 수 있을 때만 버튼이고, 나머지는 상태 표시다.
 *
 * 브라우저는 한 번 허용한 알림 권한을 사이트가 되돌리는 수단을 주지 않는다
 * (requestPermission 만 있고 해제가 없다). 차단·미지원도 마찬가지로 여기서
 * 할 수 있는 일이 없다. 할 일이 없는데 버튼 모양으로 두면 눌러도 아무 일이
 * 없는 버튼이 되므로, 그 세 상태는 .livestat 상태 표시로 내린다.
 * 알림 설정으로 가는 길은 상단 네비·하단 탭·홈 CTA 에 이미 있다.
 */
function NotifyButton({ permission, onAsk }: { permission: string; onAsk: () => void }) {
  const { Icon, label } = NOTIFY_VIEW[permission] ?? NOTIFY_VIEW.default;
  // 요청할 수 있을 때만 권한을 묻고, 나머지 상태는 알림 설정 화면으로 보낸다
  if (permission === 'default') {
    return (
      <button className="ui-iconbtn glass" onClick={onAsk} aria-label={label} title={label}>
        <Icon size={18} />
      </button>
    );
  }
  return (
    <Link className="ui-iconbtn glass" href="/me" aria-label={label} title={NOTIFY_HINT[permission] ?? label}>
      <Icon size={18} />
    </Link>
  );
}

/** 아래에 떠 있는 유리 탭바 (iOS 26 탭바와 같은 모양) */
export function BottomTabs() {
  const path = usePathname();
  return (
    <nav className="ui-tabs glass-bar" aria-label="주 메뉴">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} className={isOn(path, t.href) ? 'on' : undefined} aria-current={isOn(path, t.href) ? 'page' : undefined}>
          <t.Icon />
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

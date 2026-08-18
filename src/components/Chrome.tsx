'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bell,
  BellOff,
  BellRing,
  CalendarDays,
  ChartColumn,
  House,
  MonitorPlay,
  Moon,
  Sun,
  UserRound,
} from 'lucide-react';
import { useNotify } from '@/lib/useAppState';
import { useTheme } from '@/lib/useTheme';

const NAV = [
  { href: '/', label: '홈' },
  { href: '/schedule', label: '일정' },
  { href: '/multi', label: '멀티뷰' },
  { href: '/scenarios', label: '경우의 수' },
  { href: '/roster', label: '선수' },
  { href: '/predict', label: '예측' },
  { href: '/me', label: 'MY' },
];

const TABS = [
  { href: '/', label: '홈', Icon: House },
  { href: '/schedule', label: '일정', Icon: CalendarDays },
  { href: '/multi', label: '멀티뷰', Icon: MonitorPlay },
  { href: '/scenarios', label: '경우의 수', Icon: ChartColumn },
  { href: '/me', label: 'MY', Icon: UserRound },
];

const isOn = (path: string, href: string) => (href === '/' ? path === '/' : path.startsWith(href));

export function AppBar() {
  const path = usePathname();
  const { permission, ask } = useNotify();
  return (
    <header className="appbar">
      <div className="hbar">
        <Link href="/" className="brand">
          <div className="mark">
            <i /><i /><i /><i />
          </div>
          <div className="wordmark">HLE FAN</div>
        </Link>
        <nav className="topnav">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={isOn(path, n.href) ? 'on' : undefined}>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="hbar-act">
          <ThemeToggle />
          <NotifyButton permission={permission} onAsk={ask} />
        </div>
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
      className="tmode"
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
  granted: '받을 항목은 알림 설정에서 고를 수 있습니다. 전체 차단은 브라우저 사이트 설정에서 합니다.',
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
  const { Icon, label, on } = NOTIFY_VIEW[permission] ?? NOTIFY_VIEW.default;

  if (permission === 'default') {
    return (
      <button className="btn btn-ghost btn-sm" onClick={onAsk}>
        <Icon size={15} />
        {label}
      </button>
    );
  }
  return (
    <span className={`livestat${on ? ' on' : ''}`} title={NOTIFY_HINT[permission]}>
      <Icon size={15} />
      {label}
    </span>
  );
}

export function BottomTabs() {
  const path = usePathname();
  const idx = TABS.findIndex((t) => isOn(path, t.href));

  /* 탭이 바뀌는 동안만 빛줄기를 늘여 준다. 늘어났다 돌아오는 움직임이 있어야
     "이동" 이 아니라 "흘러갔다" 로 보인다. 전환 시간과 같은 길이로 되돌린다. */
  const [moving, setMoving] = useState(false);
  useEffect(() => {
    if (idx < 0) return;
    setMoving(true);
    const t = setTimeout(() => setMoving(false), 500);
    return () => clearTimeout(t);
  }, [idx]);

  return (
    <nav className="tabs">
      {/* 지금 탭이 목록에 없는 화면(선수단 등)에서는 아무 칸도 가리키지 않으므로
          빛줄기를 걸지 않는다 */}
      {idx >= 0 && (
        <span
          className={`tabglow${moving ? ' move' : ''}`}
          style={{ '--i': idx } as React.CSSProperties}
          aria-hidden
        />
      )}
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} className={isOn(path, t.href) ? 'on' : undefined}>
          <t.Icon />
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

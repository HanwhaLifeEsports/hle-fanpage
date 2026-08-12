'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, BellOff, BellRing, CalendarDays, ChartColumn, House, MessageSquare, UserRound } from 'lucide-react';
import { useNotify } from '@/lib/useDemoState';

const NAV = [
  { href: '/', label: '홈' },
  { href: '/schedule', label: '일정' },
  { href: '/scenarios', label: '경우의 수' },
  { href: '/roster', label: '선수' },
  { href: '/board', label: '커뮤니티' },
  { href: '/predict', label: '예측' },
  { href: '/me', label: 'MY' },
];

const TABS = [
  { href: '/', label: '홈', Icon: House },
  { href: '/schedule', label: '일정', Icon: CalendarDays },
  { href: '/board', label: '커뮤니티', Icon: MessageSquare },
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
        <NotifyButton permission={permission} onAsk={ask} />
      </div>
    </header>
  );
}

/** 네 가지 상태를 각각 다르게 보여준다. granted 가 아니라고 전부 "켜기"로 두면,
 *  차단·미지원처럼 눌러도 켤 수 없는 상태를 켤 수 있는 것처럼 말하게 된다. */
const NOTIFY_VIEW: Record<string, { Icon: typeof Bell; label: string; on: boolean }> = {
  granted: { Icon: BellRing, label: '알림 켜짐', on: true },
  denied: { Icon: BellOff, label: '알림 차단됨', on: false },
  unsupported: { Icon: BellOff, label: '알림 미지원', on: false },
  default: { Icon: Bell, label: '알림 켜기', on: false },
};

function NotifyButton({ permission, onAsk }: { permission: string; onAsk: () => void }) {
  const { Icon, label, on } = NOTIFY_VIEW[permission] ?? NOTIFY_VIEW.default;
  return (
    <button className={`btn btn-ghost btn-sm${on ? ' on' : ''}`} onClick={onAsk} aria-pressed={on}>
      <Icon size={15} />
      {label}
    </button>
  );
}

export function BottomTabs() {
  const path = usePathname();
  return (
    <nav className="tabs">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} className={isOn(path, t.href) ? 'on' : undefined}>
          <t.Icon />
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useNotify } from '@/lib/useAppState';

const NAV = [
  { href: '/', label: '홈' },
  { href: '/schedule', label: '일정' },
  { href: '/scenarios', label: '경우의 수' },
  { href: '/roster', label: '선수' },
  { href: '/predict', label: '예측' },
  { href: '/me', label: 'MY' },
];

const TABS = [
  { href: '/', label: '홈', d: 'M3 10.5 12 3l9 7.5V21H3z' },
  { href: '/schedule', label: '일정', d: 'M3 5h18v16H3zM3 10h18M8 3v4M16 3v4' },
  { href: '/roster', label: '선수', d: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 20v-1a5 5 0 0 1 5-5h6a5 5 0 0 1 5 5v1' },
  { href: '/scenarios', label: '경우의 수', d: 'M4 20V10M10 20V4M16 20v-7M22 20H2' },
  { href: '/me', label: 'MY', d: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 3.6-6 8-6s8 2 8 6' },
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
        <button className="btn btn-ghost btn-sm" onClick={ask}>
          {permission === 'granted' ? '알림 켜짐' : '알림 켜기'}
        </button>
      </div>
    </header>
  );
}

export function BottomTabs() {
  const path = usePathname();
  return (
    <nav className="tabs">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} className={isOn(path, t.href) ? 'on' : undefined}>
          <svg viewBox="0 0 24 24">
            <path d={t.d} />
          </svg>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

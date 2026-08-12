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
  const cls = `btn btn-ghost btn-sm${on ? ' on' : ''}`;

  // 브라우저는 한 번 허용한 알림 권한을 사이트가 되돌리는 수단을 주지 않는다
  // (requestPermission 만 있고 해제가 없다). 그래서 켜진 뒤에는 스위치가 아니라,
  // 항목별로 끌 수 있는 알림 설정으로 가는 입구가 된다. aria-pressed 를 붙이면
  // 스크린리더에 토글이라고 알리게 되므로 쓰지 않는다.
  if (on) {
    return (
      <Link className={cls} href="/me" title="받을 알림 항목은 알림 설정에서 고를 수 있습니다">
        <Icon size={15} />
        {label}
      </Link>
    );
  }
  return (
    <button className={cls} onClick={onAsk}>
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

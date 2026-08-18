'use client';

import { useEffect, useRef, useState } from 'react';
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

/**
 * 상단 내비게이션의 빛줄기.
 *
 * 하단 탭은 5칸 균등 그리드라 20% 씩 밀면 되지만, 여기는 글자 길이가 제각각이라
 * 실제 위치를 재야 한다. 폭까지 함께 전환해야 다음 항목에 정확히 맞는다.
 *
 * 다시 재는 때가 세 번이다 — 경로가 바뀔 때, 창 크기가 바뀔 때, 그리고 서체가
 * 늦게 붙을 때. 서체가 바뀌면 글자 폭이 달라져 빛줄기가 어긋난 채로 남는다.
 */
function useNavLight(path: string) {
  const ref = useRef<HTMLElement | null>(null);
  const [box, setBox] = useState<{ x: number; w: number } | null>(null);
  const [off, setOff] = useState(false);

  useEffect(() => {
    const nav = ref.current;
    if (!nav) return;

    const measure = () => {
      const el = nav.querySelector<HTMLElement>('a.on');
      // 목록에 없는 화면이면 마지막 자리를 그대로 두고 흐리게만 바꾼다
      if (!el) {
        setOff(true);
        return;
      }
      setOff(false);
      setBox({ x: el.offsetLeft, w: el.offsetWidth });
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(nav);
    document.fonts?.ready.then(measure).catch(() => {});
    return () => ro.disconnect();
  }, [path]);

  return { ref, box, off };
}

export function AppBar() {
  const path = usePathname();
  const { permission, ask } = useNotify();
  const light = useNavLight(path);

  /* 자리를 옮기는 동안만 늘인다. 하단 탭과 같은 방식이다 */
  const [moving, setMoving] = useState(false);
  useEffect(() => {
    if (!light.box || light.off) return;
    setMoving(true);
    const t = setTimeout(() => setMoving(false), 500);
    return () => clearTimeout(t);
  }, [light.box, light.off]);

  return (
    <header className="appbar">
      <div className="hbar">
        <Link href="/" className="brand">
          <div className="mark">
            <i /><i /><i /><i />
          </div>
          <div className="wordmark">HLE FAN</div>
        </Link>
        <nav className="topnav" ref={light.ref}>
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={isOn(path, n.href) ? 'on' : undefined}>
              {n.label}
            </Link>
          ))}
          {/* 재기 전에는 그리지 않는다. 0 에서 제자리로 날아오는 것처럼 보인다 */}
          {light.box && (
            <span
              className={`navlight navglow${moving ? ' move' : ''}${light.off ? ' dim' : ''}`}
              style={
                { '--x': `${light.box.x}px`, '--w': `${light.box.w}px` } as React.CSSProperties
              }
              aria-hidden
            />
          )}
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

  /* 탭 목록에 없는 화면(선수단 등)에서는 마지막으로 있던 자리에 흐리게 남긴다.
     그냥 사라지면 어디서 왔는지가 함께 사라져 갑작스럽다.
     처음부터 그런 화면으로 들어온 경우에는 남길 자리가 없으므로 걸지 않는다. */
  const [lastIdx, setLastIdx] = useState<number | null>(idx >= 0 ? idx : null);
  useEffect(() => {
    if (idx >= 0) setLastIdx(idx);
  }, [idx]);

  const shown = idx >= 0 ? idx : lastIdx;
  const dim = idx < 0;

  /* 탭이 바뀌는 동안만 빛줄기를 늘여 준다. 늘어났다 돌아오는 움직임이 있어야
     "이동" 이 아니라 "흘러갔다" 로 보인다. 전환 시간과 같은 길이로 되돌린다. */
  const [moving, setMoving] = useState(false);
  useEffect(() => {
    if (shown === null || dim) return;
    setMoving(true);
    const t = setTimeout(() => setMoving(false), 500);
    return () => clearTimeout(t);
  }, [shown, dim]);

  return (
    <nav className="tabs">
      {shown !== null && (
        <span
          className={`navlight tabglow${moving ? ' move' : ''}${dim ? ' dim' : ''}`}
          style={{ '--i': shown } as React.CSSProperties}
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

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/lib/useAppState';
import TeamLogo, { logoSrc } from './TeamLogo';

/** 앱 홈과 같은 카운트다운 — 칸마다 유리 한 장, 한글 단위 */
export function HeroCountdown({ target }: { target: string }) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setLeft(Math.max(0, Math.floor((Date.parse(target) - Date.now()) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [target]);

  const pad = (n: number) => String(n).padStart(2, '0');
  const cells: [string, string][] =
    left === null
      ? [['--', '일'], ['--', '시간'], ['--', '분'], ['--', '초']]
      : [
          [pad(Math.floor(left / 86400)), '일'],
          [pad(Math.floor((left % 86400) / 3600)), '시간'],
          [pad(Math.floor((left % 3600) / 60)), '분'],
          [pad(left % 60), '초'],
        ];
  return (
    <div className="ui-cd" role="timer" aria-label="경기까지 남은 시간">
      {cells.map(([v, l]) => (
        <div className="glass" key={l}>
          <b>{v}</b>
          <span>{l}</span>
        </div>
      ))}
    </div>
  );
}

export interface RecentItem {
  id: string;
  date: string;
  opponentImage: string | null;
  opponentCode: string;
  us: number;
  them: number;
}

/** 지난 경기 세 칸. 스포일러 차단이 켜져 있으면 스코어를 가린다 (웹 설정과 같은 키) */
export function RecentTiles({ items }: { items: RecentItem[] }) {
  const { prefs, revealed } = useApp();
  return (
    <div className="ui-tiles">
      {items.map((m) => {
        const hide = prefs.spoiler && !revealed[m.id];
        const won = m.us > m.them;
        return (
          <Link key={m.id} href={`/match/${m.id}`} className={`ui-tile${won && !hide ? ' win' : ''}`}>
            <TeamLogo image={m.opponentImage} size={44} label={m.opponentCode} />
            <b>{hide ? '–:–' : `${m.us}:${m.them}`}</b>
            <span className={!hide && !won ? 'loss' : undefined}>{hide ? m.date : `${won ? '승' : '패'} · ${m.date}`}</span>
          </Link>
        );
      })}
    </div>
  );
}

/** 승부예측 칩 안의 작은 로고 (받침 없이) */
export function PickLogo({ image }: { image: string | null }) {
  const src = logoSrc(image);
  // eslint-disable-next-line @next/next/no-img-element -- 작은 로고, /api/logo 가 잘라 캐시한다
  return src ? <img src={src} alt="" /> : null;
}

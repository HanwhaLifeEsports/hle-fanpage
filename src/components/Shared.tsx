'use client';

import { useEffect, useState } from 'react';
import { dismissToast, useDemo, useToasts } from '@/lib/useDemoState';
import { teamOf, type Match } from '@/lib/lck2026';

import { fmtDate, pad } from '@/lib/format';

/* ---------------- 카운트다운 ---------------- */

export function Countdown({ target }: { target: string }) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setLeft(Math.max(0, Math.floor((+new Date(target) - Date.now()) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [target]);

  const cells: [string, string][] =
    left === null
      ? [['--', 'Days'], ['--', 'Hours'], ['--', 'Min'], ['--', 'Sec']]
      : [
          [pad(Math.floor(left / 86400)), 'Days'],
          [pad(Math.floor((left % 86400) / 3600)), 'Hours'],
          [pad(Math.floor((left % 3600) / 60)), 'Min'],
          [pad(left % 60), 'Sec'],
        ];

  return (
    <div className="cd">
      {cells.map(([v, l]) => (
        <div key={l}>
          <b>{v}</b>
          <span>{l}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------------- 경기 카드 ---------------- */

export function MatchCard({ m }: { m: Match }) {
  const { prefs, revealed, reveal } = useDemo();
  const opp = teamOf(m.opponent);
  const d = new Date(m.kickoff);

  if (m.status === 'upcoming') {
    return (
      <div className="match">
        <div className="top">
          <span className="badge b-soon">예정</span>
          <span className="when">{fmtDate(m.kickoff)}</span>
        </div>
        <div className="sc" style={{ fontSize: 22, fontWeight: 600, letterSpacing: 0 }}>
          BO{m.bo}
        </div>
        <div className="opp">vs {opp?.name ?? m.opponent}</div>
      </div>
    );
  }

  const win = (m.us ?? 0) > (m.them ?? 0);
  const hide = prefs.spoiler && !revealed[m.id];

  return (
    <div
      className={`match spoil${hide ? ' hid' : ''}`}
      onClick={hide ? () => reveal(m.id) : undefined}
      role={hide ? 'button' : undefined}
    >
      <div className="top">
        <span className={`badge ${win ? 'b-win' : 'b-loss'}`}>{win ? 'WIN' : 'LOSS'}</span>
        <span className="when">
          {d.getMonth() + 1}.{pad(d.getDate())}
        </span>
      </div>
      <div className="sc">
        <span className={win ? 'w' : 'lo'}>{m.us}</span>
        <span className="lo">:</span>
        <span className={win ? 'lo' : 'l'}>{m.them}</span>
      </div>
      <div className="opp">vs {opp?.name ?? m.opponent}</div>
    </div>
  );
}

/* ---------------- 토스트 ---------------- */

export function Toasts() {
  const list = useToasts();
  if (!list.length) return null;
  return (
    <div className="toasts">
      {list.map((t) => (
        <div className="toast" key={t.id} onClick={() => dismissToast(t.id)}>
          <div className="ic">H</div>
          <div>
            <b>{t.title}</b>
            <p>{t.body}</p>
            <em>{t.meta}</em>
          </div>
        </div>
      ))}
    </div>
  );
}

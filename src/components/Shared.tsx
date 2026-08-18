'use client';

import { useEffect, useState } from 'react';
import TicketLine from './Ticket';
import { dismissToast, useApp, useToasts } from '@/lib/useAppState';
import { fmtDate, pad } from '@/lib/format';
import { sidesOf } from '@/lib/pick';
import type { MatchRow } from '@/lib/lolesports';

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
      ? [
          ['--', 'Days'],
          ['--', 'Hours'],
          ['--', 'Min'],
          ['--', 'Sec'],
        ]
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



export function MatchCard({ m }: { m: MatchRow }) {
  const { prefs, revealed, reveal } = useApp();
  const { us, them, mine } = sidesOf(m);
  const d = new Date(m.startTime);

  if (m.state !== 'completed') {
    return (
      <div className="match rv">
        <div className="top">
          <span className="badge b-soon">{m.blockName || '예정'}</span>
          <span className="when">{fmtDate(m.startTime)}</span>
        </div>
        <div className="sc" style={{ fontSize: 22, fontWeight: 600, letterSpacing: 0 }}>
          BO{m.bo}
        </div>
        <div className="opp">{mine ? `vs ${them.name}` : `${m.a.code} vs ${m.b.code}`}</div>
        <TicketLine startTime={m.startTime} />
      </div>
    );
  }

  const win = us.win === true;
  const hide = prefs.spoiler && !revealed[m.id];

  return (
    <div
      className={`match spoil rv${hide ? ' hid' : ''}`}
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
        <span className={win ? 'w' : 'lo'}>{us.games}</span>
        <span className="lo">:</span>
        <span className={win ? 'lo' : 'l'}>{them.games}</span>
      </div>
      <div className="opp">{mine ? `vs ${them.name}` : `${m.a.code} vs ${m.b.code}`}</div>
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

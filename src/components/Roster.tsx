'use client';

import { useState } from 'react';
import { PLAYERS, type Player } from '@/lib/lck2026';
import { Ki } from './IconSprite';
import { patchState, toast, useApp } from '@/lib/useAppState';

function Card({ p, onOpen, fav }: { p: Player; onOpen: () => void; fav: boolean }) {
  return (
    <button className="pcard" onClick={onOpen}>
      <div className="ph">
        <span className="pos">{p.pos}</span>
        <div className="tags">
          {fav && <span className="badge b-flame">최애</span>}
          {p.joined2026 && <span className="badge b-new">NEW</span>}
        </div>
        <span className="no">{p.no}</span>
        <span className="nm">{p.nm}</span>
      </div>
      <div className="mt">
        <span className="cap">{p.ko}</span>
        <span className="kda">#{p.no}</span>
      </div>
    </button>
  );
}

export default function RosterRail() {
  const { fav } = useApp();
  const [open, setOpen] = useState<Player | null>(null);

  const toggleFav = (id: string) => {
    const next = fav === id ? null : id;
    patchState({ fav: next });
    setOpen(null);
    const p = PLAYERS.find((x) => x.id === id)!;
    toast(
      next ? '최애 선수 지정' : '최애 선수 해제',
      next ? `${p.nm} 관련 알림을 받습니다.` : '선수 알림을 끕니다.',
    );
  };

  return (
    <>
      <div className="rail">
        {PLAYERS.map((p) => (
          <Card key={p.id} p={p} fav={fav === p.id} onOpen={() => setOpen(p)} />
        ))}
      </div>

      {open && (
        <div className="ov" onClick={(e) => e.target === e.currentTarget && setOpen(null)}>
          <div className="modal">
            <div className="modal-h">
              <b style={{ fontSize: 18 }}>
                {open.nm}{' '}
                <span style={{ color: 'var(--mute)', fontWeight: 400, fontSize: 14 }}>{open.ko}</span>
              </b>
              <button className="x" onClick={() => setOpen(null)} aria-label="닫기">
                <Ki n="close" size={15} />
              </button>
            </div>
            <div className="modal-b">
              <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                <span className="badge b-flame">{open.pos}</span>
                <span className="badge b-soon">#{open.no}</span>
                {open.joined2026 && <span className="badge b-new">2026 합류</span>}
              </div>
              <h3 className="grouphead">대표 챔피언</h3>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
                {open.champs.map((c) => (
                  <span className="chip" key={c}>
                    {c}
                  </span>
                ))}
              </div>
              <button
                className={`btn ${fav === open.id ? 'btn-ghost' : 'btn-primary'} btn-block`}
                onClick={() => toggleFav(open.id)}
              >
                {fav === open.id ? '최애 선수 해제' : '최애 선수로 지정'}
              </button>
              <div className="note">
                최애로 지정하면 이 선수 관련 알림만 따로 받습니다. 선수별 세부 지표(KDA·분당 딜량)는 공개 API
                에서 제공하지 않아 아직 싣지 않았습니다.
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

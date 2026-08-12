'use client';

import { useState } from 'react';
import { PLAYERS, type Player } from '@/lib/lck2026';
import { patchState, toast, useDemo } from '@/lib/useDemoState';

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
        <span className="kda">KDA {p.kda}</span>
      </div>
    </button>
  );
}

export default function RosterRail() {
  const { fav } = useDemo();
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
              <button className="x" onClick={() => setOpen(null)}>
                ✕
              </button>
            </div>
            <div className="modal-b">
              <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                <span className="badge b-flame">{open.pos}</span>
                <span className="badge b-soon">#{open.no}</span>
                {open.joined2026 && <span className="badge b-new">2026 합류</span>}
              </div>
              <div className="statgrid" style={{ marginBottom: 18 }}>
                {(
                  [
                    ['KDA', open.kda],
                    ['분당 딜량', open.dpm],
                    ['출전', `${open.games}경기`],
                  ] as const
                ).map(([k, v]) => (
                  <div className="card" style={{ padding: 14 }} key={k}>
                    <div className="kicker-mute" style={{ fontSize: 9 }}>
                      {k}
                    </div>
                    <div className="num" style={{ fontSize: 24, marginTop: 4 }}>
                      {v}
                    </div>
                  </div>
                ))}
              </div>
              <div className="kicker-mute" style={{ marginBottom: 8 }}>
                시그니처 챔피언
              </div>
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
                최애로 지정하면 이 선수 관련 알림(<b>player.{open.id}</b>)만 따로 켜집니다. 개인 스탯은 샘플
                데이터입니다.
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

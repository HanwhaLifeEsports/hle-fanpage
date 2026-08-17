'use client';

import { useState } from 'react';
import { PLAYERS, type Player } from '@/lib/lck2026';
import { Star, X } from 'lucide-react';
import { patchState, toast, useApp } from '@/lib/useAppState';
import type { PlayerStat, StatMap } from '@/lib/naver';

function Card({
  p,
  st,
  onOpen,
  fav,
}: {
  p: Player;
  st?: PlayerStat;
  onOpen: () => void;
  fav: boolean;
}) {
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
        {/* 기록을 못 가져오면 등번호로 되돌아간다. 0 으로 채우면 'POM 을 한 번도
            못 받았다'는 사실과 구분되지 않는다 */}
        <span className="fig">{st ? `POM ${st.pom}` : `#${p.no}`}</span>
      </div>
    </button>
  );
}

export default function RosterRail({ stats }: { stats?: StatMap | null }) {
  const { fav } = useApp();
  const [open, setOpen] = useState<Player | null>(null);
  const openStat = open ? stats?.[open.naverId] : undefined;

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
          <Card
            key={p.id}
            p={p}
            st={stats?.[p.naverId]}
            fav={fav === p.id}
            onOpen={() => setOpen(p)}
          />
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
                <X size={15} />
              </button>
            </div>
            <div className="modal-b">
              <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                <span className="badge b-flame">{open.pos}</span>
                <span className="badge b-soon">#{open.no}</span>
                {open.joined2026 && <span className="badge b-new">2026 합류</span>}
              </div>
              {openStat && (
                <>
                  <h3 className="grouphead">2026 정규시즌 기록</h3>
                  <div className="statgrid s2" style={{ marginBottom: 10 }}>
                    <div className="card stat">
                      <b>{openStat.pom}</b>
                      <span className="cap">
                        POM 포인트 · {openStat.pomCount}회
                      </span>
                      <span className="cap sub">리그 {openStat.pomRank}위</span>
                    </div>
                    <div className="card stat">
                      <b>{openStat.kda.toFixed(2)}</b>
                      <span className="cap">KDA</span>
                      <span className="cap sub">
                        {openStat.kills} / {openStat.deaths} / {openStat.assists}
                      </span>
                    </div>
                    <div className="card stat">
                      <b>{Math.round(openStat.killShare * 100)}%</b>
                      <span className="cap">킬 관여</span>
                    </div>
                    <div className="card stat">
                      <b>{openStat.sets}</b>
                      <span className="cap">출전 세트</span>
                      <span className="cap sub">
                        {openStat.wins}승 {openStat.losses}패
                      </span>
                    </div>
                  </div>
                  {/* 남의 데이터를 쓰면 어디서 왔는지 화면에 남긴다 */}
                  <p className="note" style={{ marginBottom: 20 }}>
                    기록 출처: 네이버 e스포츠
                  </p>
                </>
              )}

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
                <Star size={16} fill={fav === open.id ? 'currentColor' : 'none'} />
                {fav === open.id ? '최애 선수 해제' : '최애 선수로 지정'}
              </button>
              <div className="note">최애로 지정하면 이 선수 소식만 따로 알림을 받습니다.</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

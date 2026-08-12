import RosterRail from '@/components/Roster';
import { PLAYERS, STAFF } from '@/lib/lck2026';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '선수단',
  description: '2026 시즌 한화생명e스포츠 로스터와 코칭스태프.',
};

export default function RosterPage() {
  const joined = PLAYERS.filter((p) => p.joined2026);

  return (
    <div className="wrap sec">
      <h2 className="ko ptitle">선수단 2026</h2>
      <p className="lede" style={{ margin: '10px 0 var(--s5)' }}>
        카드를 누르면 프로필이 열립니다. 최애 선수로 지정하면 그 선수 알림만 따로 받을 수 있어요.
      </p>

      {joined.length > 0 && (
        <div className="banner" style={{ marginBottom: 'var(--s5)' }}>
          <div>
            <b>2026 시즌 새 얼굴</b>
            <span>
              {joined.map((p) => `${p.nm}(${p.pos})`).join(' · ')} 합류. 지난 시즌 로스터에서 정글·원딜이
              교체됐습니다.
            </span>
          </div>
        </div>
      )}

      <RosterRail />

      <div className="shead" style={{ marginTop: 'var(--s7)' }}>
        <h2 className="ko">코칭스태프</h2>
      </div>
      <div className="statgrid">
        {STAFF.map((s) => (
          <div className="card" key={s.nm}>
            <div style={{ fontSize: 18, fontWeight: 600 }}>{s.nm}</div>
            <div className="cap" style={{ marginTop: 2 }}>
              {s.ko} · {s.role}
            </div>
          </div>
        ))}
      </div>

      <div className="note">
        선수 사진은 초상권 확인이 끝난 것만 싣습니다. 지금은 자리를 비워두고 포지션과 등번호로 구분합니다.
      </div>
    </div>
  );
}

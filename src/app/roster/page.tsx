import { Ki } from '@/components/IconSprite';
import RosterRail from '@/components/Roster';
import { PLAYERS, STAFF } from '@/lib/lck2026';

export default function RosterPage() {
  const joined = PLAYERS.filter((p) => p.joined2026);

  return (
    <div className="wrap sec">
      <div className="kicker-mute">
        <Ki n="users" />
        Roster 2026
      </div>
      <h2 className="ko ptitle" style={{ margin: '8px 0 4px' }}>
        선수단
      </h2>
      <p className="bodytx" style={{ marginBottom: 'var(--s5)' }}>
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
        <div>
          <div className="kicker-mute">
            <Ki n="star" />
            Staff
          </div>
          <h2 className="ko" style={{ marginTop: 6 }}>
            코칭스태프
          </h2>
        </div>
      </div>
      <div className="statgrid">
        {STAFF.map((s) => (
          <div className="card" key={s.nm}>
            <div className="kicker-mute" style={{ fontSize: 9 }}>
              {s.role}
            </div>
            <div style={{ fontSize: 18, fontWeight: 600, marginTop: 6 }}>{s.nm}</div>
            <div className="cap">{s.ko}</div>
          </div>
        ))}
      </div>

      <div className="note">
        <b>로스터·코칭스태프는 실제 2026 시즌 기준</b>입니다. 개인 스탯(KDA·분당 딜량·출전)은 샘플이며, 사진
        슬롯은 4:5 풀블리드로 비워뒀습니다 — 실제 이미지는 공식 SNS 임베드 또는 허가받은 촬영분으로 교체합니다.
      </div>
    </div>
  );
}

import RosterRail from '@/components/Roster';
import AwardsButton from '@/components/Awards';
import { PLAYERS, STAFF } from '@/lib/lck2026';
import { getPlayerStats } from '@/lib/naver';
import { getChampionStats, getContracts } from '@/lib/leaguepedia';
import { fmtSpan } from '@/lib/format';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '선수단',
  description: '2026 시즌 한화생명e스포츠 로스터와 코칭스태프.',
};

export const dynamic = 'force-dynamic';

export default async function RosterPage() {
  const joined = PLAYERS.filter((p) => p.joined2026);
  // 못 가져오면 null 이 온다. 카드는 등번호로 되돌아가고 나머지는 그대로 뜬다
  // 출처가 달라 서로 기다릴 이유가 없다. 둘 다 실패해도 null 이 온다
  const [stats, champions, contracts] = await Promise.all([
    getPlayerStats(),
    getChampionStats(),
    getContracts(),
  ]);

  return (
    <div className="wrap sec">
      <h2 className="ko ptitle rv">선수단 2026</h2>
      <p className="lede rv" style={{ margin: '10px 0 var(--s5)' }}>
        카드를 누르면 정규시즌 기록이 열립니다. 최애 선수로 지정하면 그 선수 알림만 따로 받아요.
      </p>

      {joined.length > 0 && (
        <div className="banner rv" style={{ marginBottom: 'var(--s5)' }}>
          <div>
            <b>2026 시즌 새 얼굴</b>
            <span>
              {joined.map((p) => `${p.nm}(${p.pos})`).join(' · ')} 합류. 지난 시즌 로스터에서 정글·원딜이
              교체됐습니다.
            </span>
          </div>
        </div>
      )}

      <RosterRail stats={stats} champions={champions} contracts={contracts} />

      <div className="shead rv" style={{ marginTop: 'var(--s7)' }}>
        <h2 className="ko">코칭스태프</h2>
      </div>
      <div className="statgrid rv">
        {STAFF.map((s) => (
          <div className="card rv" key={s.id}>
            <div style={{ fontSize: 18, fontWeight: 600 }}>{s.nm}</div>
            <div className="cap" style={{ marginTop: 2 }}>
              {s.ko} · {s.role}
            </div>
            <div style={{ marginTop: 8 }}>
              <AwardsButton id={s.id} name={s.nm} />
            </div>
            <p className="contract">한화생명 소속 {fmtSpan(s.since, contracts?.[s.id])}</p>
          </div>
        ))}
      </div>

    </div>
  );
}

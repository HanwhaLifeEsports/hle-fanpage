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
    <div className="ui-page wide">
      <h1 className="ui-title">선수단</h1>
      {joined.length > 0 && (
        <p className="ui-sub-cap">
          2026 시즌 새 얼굴 · {joined.map((p) => `${p.nm}(${p.pos})`).join(' · ')}
        </p>
      )}

      <RosterRail stats={stats} champions={champions} contracts={contracts} />

      <section className="ui-paper">
        <div className="ui-head">
          <h2>코칭스태프</h2>
        </div>
        {STAFF.map((s) => (
          <div className="ui-line ui-staff" key={s.id}>
            <span className="ui-staff-role">{s.role}</span>
            <div>
              <b>{s.nm}</b>
              <span className="cap">
                {s.ko} · 한화생명 소속 {fmtSpan(s.since, contracts?.[s.id])}
              </span>
            </div>
            <AwardsButton id={s.id} name={s.nm} />
          </div>
        ))}
      </section>
    </div>
  );
}

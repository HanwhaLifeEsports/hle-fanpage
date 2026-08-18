import Link from 'next/link';
import { Waypoints } from 'lucide-react';
import MatchFilter from '@/components/MatchFilter';
import Standings from '@/components/Standings';
import Bracket from '@/components/Bracket';
import { getSeason } from '@/lib/season';
import { OUR_TAG, SEASON } from '@/lib/lck2026';
import { hasConfirmedTeams } from '@/lib/bracket';
import { LEGEND_BANDS, RISE_BANDS, countIn } from '@/lib/scenarios';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '일정 & 순위',
  description: '2026 LCK 레전드·라이즈 그룹 통합 순위와 전체 일정. 세트 득실 포함.',
};

export const dynamic = 'force-dynamic';

export default async function SchedulePage() {
  let bundle;
  try {
    bundle = await getSeason();
  } catch {
    return (
      <div className="wrap sec">
        <h2 className="ko ptitle">일정을 불러오지 못했습니다</h2>
        <p className="lede" style={{ marginTop: 10 }}>잠시 뒤 새로고침해 주세요.</p>
      </div>
    );
  }

  const { season, fetchedAt, ourGroup, scenarios } = bundle;
  // 정규 순위에 반영되는 경기만 이 목록에 세운다. 포스트시즌은 대진표가 따로 그린다
  const regular = season.matches.filter((m) => m.stage === 'regular');

  const confirmed = hasConfirmedTeams(season.bracket);
  // 진출 경로별 확률. 시즌 종료(worlds: 'none') 구간은 '진출 예상' 이 아니므로 뺀다
  const odds = (ourGroup === 'legend' ? LEGEND_BANDS : RISE_BANDS)
    .filter((b) => b.worlds !== 'none')
    .map((b) => ({
      label: b.label,
      pct: scenarios.total ? (countIn(scenarios.rank, b.ranks) / scenarios.total) * 100 : 0,
    }));

  return (
    <div className="wrap sec">
      <h2 className="ko ptitle">일정 &amp; 순위</h2>
      <p className="lede" style={{ margin: '10px 0 var(--s5)' }}>
        {SEASON.year} 시즌 · {SEASON.format}
      </p>

      <div className="shead">
        <h2 className="ko">순위표</h2>
        <span className="cap">{new Date(fetchedAt).toLocaleTimeString('ko-KR')} 기준</span>
      </div>

      <Standings rows={season.legend} group="legend" />
      <Standings rows={season.rise} group="rise" />

      <div className="note">
        정규 1~2라운드와 3~4라운드를 <b>합산한 성적</b>입니다. 동률은 승자승, 그다음 세트 득실 순으로 가립니다.
      </div>

      <div className="shead">
        <h2 className="ko">경기 일정</h2>
      </div>
      <MatchFilter matches={regular} ourTag={OUR_TAG} />

      {season.bracket.length > 0 && (
        <>
          <div className="shead">
            <h2 className="ko">포스트시즌</h2>
          </div>

          {/* 대진이 하나도 안 잡혔으면 빈 표만 보여주는 대신, 우리 팀이 어디로 갈지를
              확률로 말해 준다. 확정되면 이 자리가 실제 팀으로 채워진다. */}
          {!confirmed && odds.length > 0 && (
            <>
              <p className="lede" style={{ margin: '0 0 var(--s4)' }}>
                아직 대진이 정해지지 않았습니다. 남은 경기를 전부 전개해 계산한 {OUR_TAG} 진출 예상입니다.
              </p>
              <div className="bodds">
                {odds.map((o) => (
                  <div className={`bodd${o.pct >= 50 ? ' hit' : ''}`} key={o.label}>
                    <span className="ol">{o.label}</span>
                    <span className="ob">
                      <i style={{ width: `${Math.max(o.pct, 0.6)}%` }} />
                    </span>
                    <span className="ov">{o.pct.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
              <div style={{ marginBottom: 'var(--s5)' }}>
                <Link className="btn btn-ghost btn-sm" href="/scenarios">
                  <Waypoints size={14} />
                  경우의 수 바로가기
                </Link>
              </div>
            </>
          )}

          <Bracket stages={season.bracket} ourTag={OUR_TAG} />
        </>
      )}
    </div>
  );
}

import MatchFilter from '@/components/MatchFilter';
import Standings from '@/components/Standings';
import { getSeason } from '@/lib/season';
import { getWorldsMatches } from '@/lib/lolesports-live';
import { OUR_TAG, SEASON } from '@/lib/lck2026';
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
        <h2 className="ko ptitle rv">일정을 불러오지 못했습니다</h2>
        <p className="lede rv" style={{ marginTop: 10 }}>잠시 뒤 새로고침해 주세요.</p>
      </div>
    );
  }

  const { season, fetchedAt } = bundle;
  const worlds = await getWorldsMatches().catch(() => []);
  const matches = [...season.matches, ...worlds.filter((m) => m.startTime.startsWith(String(SEASON.year)))];

  return (
    <div className="ui-page">
      <h1 className="ui-title">일정</h1>
      <MatchFilter matches={matches} ourTag={OUR_TAG} />

      <div className="ui-section-label">
        순위표 <span className="cap">· {new Date(fetchedAt).toLocaleTimeString('ko-KR')} 기준</span>
      </div>
      <div className="ui-paper ui-standings">
        <Standings rows={season.legend} group="legend" />
        <Standings rows={season.rise} group="rise" />
        <p className="cap">1~4R 합산 · 동률: 승자승 → 세트 득실</p>
      </div>
    </div>
  );
}

import MatchFilter from '@/components/MatchFilter';
import Standings from '@/components/Standings';
import { getSeason } from '@/lib/season';
import { OUR_TAG, SEASON } from '@/lib/lck2026';
import { fmtDate } from '@/lib/format';
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

  const { season, fetchedAt } = bundle;
  // 정규 순위에 반영되는 경기만 이 화면에 세운다 (플레이오프는 대진이 TBD 라 별도)
  const regular = season.matches.filter((m) => m.stage === 'regular');
  const bracket = season.matches.filter((m) => m.stage !== 'regular' && m.startTime > '2026-07-01');

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

      {bracket.length > 0 && (
        <>
          <div className="shead">
            <h2 className="ko">포스트시즌</h2>
          </div>
          <div className="plist">
            {bracket.map((m) => (
              <div className="prow" key={m.id} style={{ cursor: 'default' }}>
                <span className="bd">{m.blockName}</span>
                <span className="ti">
                  {m.a.code === 'TBD' && m.b.code === 'TBD'
                    ? '대진 미정'
                    : `${m.a.name} vs ${m.b.name}`}
                </span>
                <span className="st">
                  <span>{fmtDate(m.startTime)}</span>
                  <span>BO{m.bo}</span>
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

import MatchFilter from '@/components/MatchFilter';
import Standings from '@/components/Standings';
import { getSeason } from '@/lib/season';
import { OUR_TAG, SEASON } from '@/lib/lck2026';
import { fmtDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function SchedulePage() {
  let bundle;
  try {
    bundle = await getSeason();
  } catch (e) {
    return (
      <div className="wrap sec">
        <h2 className="ko ptitle">일정을 불러오지 못했습니다</h2>
        <div className="note">{e instanceof Error ? e.message : '알 수 없는 오류'}</div>
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
        LoL Esports API 는 스플릿을 <b>별개 토너먼트로</b> 내려주고 세트 득실은 아예 주지 않습니다. 위 표는
        스플릿2(정규 1~2R) 순위와 스플릿3(3~4R 그룹) 순위를 합치고, 세트 득실은 전체 일정의 세트 스코어에서
        직접 집계한 값입니다. 동률은 승-패 → 승자승 → 세트 득실 순으로 정렬합니다.
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

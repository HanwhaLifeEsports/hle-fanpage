import { getSeason } from '@/lib/season';
import { OUR_TAG, SEASON } from '@/lib/lck2026';
import { LEGEND_OUTCOME, RISE_OUTCOME } from '@/lib/scenarios';
import { fmtDate } from '@/lib/format';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '플레이오프 경우의 수',
  description: '한화생명e스포츠의 남은 경기를 전부 전개해 계산한 순위 확률과 경기별 영향력.',
};

export const dynamic = 'force-dynamic';

const pct = (n: number, total: number) => (total ? (n / total) * 100 : 0);

export default async function ScenariosPage() {
  let bundle;
  try {
    bundle = await getSeason();
  } catch (e) {
    return (
      <div className="wrap sec">
        <h2 className="ko ptitle">경우의 수를 계산하지 못했습니다</h2>
        <div className="note">{e instanceof Error ? e.message : '알 수 없는 오류'}</div>
      </div>
    );
  }

  const { season, scenarios: sc, us, ourGroup } = bundle;
  const group = ourGroup === 'legend' ? season.legend : season.rise;
  const outcome = ourGroup === 'legend' ? LEGEND_OUTCOME : RISE_OUTCOME;
  const ourRemaining = sc.remaining.filter((r) => r.a === OUR_TAG || r.b === OUR_TAG);
  const topProb = sc.rank.slice(0, sc.seedCut).reduce((a, b) => a + b, 0);

  return (
    <div className="wrap sec">
      <h2 className="ko ptitle">플레이오프 경우의 수</h2>
      <p className="lede" style={{ margin: '10px 0 var(--s5)' }}>
        {SEASON[ourGroup].label} 잔여 {sc.remaining.length}경기를 세트 스코어까지 전부 전개해{' '}
        <b style={{ color: '#fff' }}>{sc.total.toLocaleString()}가지</b>를 계산했습니다.{' '}
        {sc.exhaustive ? '전수 계산입니다.' : '표본 추정입니다.'}
      </p>

      {us && (
        <div className="card" style={{ marginBottom: 'var(--s6)' }}>
          <div className="oddsrow">
            <div>
              <div className="num" style={{ fontSize: 52 }}>
                {pct(topProb, sc.total).toFixed(1)}
                <span style={{ fontSize: 22, color: 'var(--mute)' }}>%</span>
              </div>
              <div className="cap" style={{ marginTop: 2 }}>
                {outcome[1]} 확률
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <b style={{ fontSize: 16 }}>
                현재 {us.rank}위 · {us.w}승 {us.l}패 ({us.diff >= 0 ? '+' : ''}
                {us.diff})
              </b>
              <div className="cap" style={{ marginTop: 2 }}>
                이대로면 {outcome[us.rank]}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="shead">
        <h2 className="ko">최종 순위 확률</h2>
      </div>
      <div className="bars">
        {sc.rank.map((n, i) => {
          const r = i + 1;
          const p = pct(n, sc.total);
          return (
            <div className="bar" key={r}>
              <span className="bl">
                {r}위<em>{outcome[r]}</em>
              </span>
              <span className="bt">
                <i style={{ width: `${Math.max(p, 0.4)}%`, background: r <= sc.seedCut ? 'var(--flame)' : undefined }} />
              </span>
              <span className="bv num">{p.toFixed(1)}%</span>
            </div>
          );
        })}
      </div>

      <div className="shead">
        <h2 className="ko">잔여 경기 승수별</h2>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>HLE 잔여 성적</th>
              <th>{outcome[1]}</th>
              <th>{outcome[sc.seedCut + 1] ?? '-'}</th>
              <th>최선</th>
              <th>최악</th>
            </tr>
          </thead>
          <tbody>
            {sc.byOwnWins.map((b) => {
              const top = b.rank.slice(0, sc.seedCut).reduce((x, y) => x + y, 0);
              const rest = b.total - top;
              return (
                <tr key={b.wins}>
                  <td>
                    {b.wins}승 {ourRemaining.length - b.wins}패
                  </td>
                  <td style={{ color: top ? 'var(--win)' : 'var(--faint)' }}>{pct(top, b.total).toFixed(1)}%</td>
                  <td>{pct(rest, b.total).toFixed(1)}%</td>
                  <td>{b.best}위</td>
                  <td>{b.worst}위</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="shead">
        <h2 className="ko">경기별 영향력</h2>
      </div>
      <p className="lede" style={{ marginBottom: 'var(--s4)' }}>
        각 경기의 승패가 HLE의 {outcome[1]} 확률을 얼마나 흔드는지입니다. 차이가 큰 경기일수록 중요합니다.
      </p>
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>일시</th>
              <th>경기</th>
              <th style={{ width: 92 }}>홈 승</th>
              <th style={{ width: 92 }}>원정 승</th>
              <th style={{ width: 72 }}>진폭</th>
            </tr>
          </thead>
          <tbody>
            {[...sc.leverage]
              .sort((x, y) => Math.abs(y.ifA - y.ifB) - Math.abs(x.ifA - x.ifB))
              .map((m) => {
                const swing = Math.abs(m.ifA - m.ifB);
                const mine = m.a === OUR_TAG || m.b === OUR_TAG;
                return (
                  <tr key={m.id} className={mine ? 'me' : undefined}>
                    <td className="cap-xs">{fmtDate(m.startTime)}</td>
                    <td>
                      {m.a} vs {m.b}
                    </td>
                    <td>{m.ifA.toFixed(1)}%</td>
                    <td>{m.ifB.toFixed(1)}%</td>
                    <td style={{ color: swing > 15 ? 'var(--flame-text)' : undefined }}>
                      {swing.toFixed(1)}p
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      <div className="shead">
        <h2 className="ko">잔여 일정</h2>
      </div>
      <div className="plist">
        {sc.remaining.map((m) => (
          <div className="prow" key={m.id} style={{ cursor: 'default' }}>
            <span className="bd">{m.a === OUR_TAG || m.b === OUR_TAG ? 'HLE' : SEASON[ourGroup].label}</span>
            <span className="ti">
              {group.find((t) => t.code === m.a)?.name ?? m.a} vs {group.find((t) => t.code === m.b)?.name ?? m.b}
            </span>
            <span className="st">
              <span>{fmtDate(m.startTime)}</span>
            </span>
          </div>
        ))}
      </div>

      <div className="note">
        동률은 <b>승-패 → 승자승(동률 팀들끼리의 맞대결) → 세트 득실</b> 순으로 갈랐습니다. 실제 LCK 는 여기서도
        갈리지 않으면 타이브레이커 경기를 치르므로, 마지막까지 완전 동률인 경우의 순위는 확정이 아닙니다. 확률은
        모든 경기 결과가 같은 확률로 나온다고 가정한 값이라 전력 차는 반영되어 있지 않습니다.
      </div>
    </div>
  );
}

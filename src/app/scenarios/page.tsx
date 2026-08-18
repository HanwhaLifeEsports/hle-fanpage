import { getSeason } from '@/lib/season';
import { OUR_TAG, SEASON } from '@/lib/lck2026';
import { LEGEND_BANDS, RISE_BANDS, countIn, worldsRanks } from '@/lib/scenarios';
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
  } catch {
    return (
      <div className="wrap sec">
        <h2 className="ko ptitle rv">경우의 수를 계산하지 못했습니다</h2>
        <p className="lede rv" style={{ marginTop: 10 }}>잠시 뒤 새로고침해 주세요.</p>
      </div>
    );
  }

  const { season, scenarios: sc, us, ourGroup } = bundle;
  const group = ourGroup === 'legend' ? season.legend : season.rise;
  const bands = ourGroup === 'legend' ? LEGEND_BANDS : RISE_BANDS;
  const bandOf = (r: number) => bands.find((b) => b.ranks.includes(r));
  const ourRemaining = sc.remaining.filter((r) => r.a === OUR_TAG || r.b === OUR_TAG);

  // 월즈 진출이 확정되는 순위 = 플레이오프에 오르는 순위. MSI 우승으로 얻은 시드다.
  const wRanks = worldsRanks(bands);
  const worldsCut = wRanks.length ? Math.max(...wRanks) : 0;
  const worldsProb = countIn(sc.rank, wRanks);
  const maybeProb = countIn(
    sc.rank,
    bands.filter((b) => b.worlds === 'possible').flatMap((b) => b.ranks),
  );
  const topProb = countIn(sc.rank, bands[0].ranks);

  return (
    <div className="wrap sec">
      <h2 className="ko ptitle rv">플레이오프 경우의 수</h2>
      <p className="lede rv" style={{ margin: '10px 0 var(--s5)' }}>
{SEASON[ourGroup].label} 잔여 {sc.remaining.length}경기에서 나올 수 있는 모든 결과를 따져본 확률입니다.
      </p>

      {us && (
        <div className="card rv" style={{ marginBottom: 'var(--s6)' }}>
          <div className="oddsrow">
            <div>
              <div className="num" style={{ fontSize: 52, color: 'var(--flame-text)' }}>
                {pct(worldsProb, sc.total).toFixed(1)}
                <span style={{ fontSize: 22, color: 'var(--mute)' }}>%</span>
              </div>
              <div className="cap" style={{ marginTop: 2 }}>
                월즈 진출 확정 확률 · {worldsCut}위 안
              </div>
              <div className="cap-xs" style={{ marginTop: 6 }}>
                {bands[0].label} {pct(topProb, sc.total).toFixed(1)}%
                {maybeProb > 0 && <> · 플레이인행 {pct(maybeProb, sc.total).toFixed(1)}%</>}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <b style={{ fontSize: 16 }}>
                현재 {us.rank}위 · {us.w}승 {us.l}패 ({us.diff >= 0 ? '+' : ''}
                {us.diff})
              </b>
              <div className="cap" style={{ marginTop: 2 }}>
                이대로면 {bandOf(us.rank)?.label ?? '-'}
              </div>
            </div>
          </div>
          <div className="note" style={{ marginBottom: 0 }}>
            <b>2026 MSI 우승으로 플레이오프에 오르기만 하면 월즈 진출이 확정</b>됩니다. 그래서 {worldsCut}위
            안에 들면 그 자리에서 월즈가 결정됩니다. 플레이인은 통과해야 플레이오프로 올라가므로 아직
            확정이 아닙니다.
          </div>
        </div>
      )}

      <div className="shead rv">
        <h2 className="ko">최종 순위 확률</h2>
      </div>
      <div className="bars">
        {sc.rank.map((n, i) => {
          const r = i + 1;
          const p = pct(n, sc.total);
          const b = bandOf(r);
          const won = b?.worlds === 'confirmed';
          return (
            <div className="bar" key={r}>
              <span className="bl">
                {r}위
                <em>
                  {b?.label}
                  {won && ' · 월즈 진출 확정'}
                  {b?.worlds === 'possible' && ' · 통과 시 월즈'}
                </em>
              </span>
              <span className="bt">
                <i style={{ width: `${Math.max(p, 0.4)}%`, background: won ? 'var(--flame)' : undefined }} />
              </span>
              <span className="bv num">{p.toFixed(1)}%</span>
            </div>
          );
        })}
      </div>
      <div className="note">
        주황 막대가 <b>월즈 진출이 확정되는 순위</b>입니다. 아래로 갈수록 순위가 낮아집니다.
      </div>

      <div className="shead rv">
        <h2 className="ko">잔여 경기 승수별</h2>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>HLE 잔여 성적</th>
              <th>월즈 진출 확정</th>
              {bands.map((b) => (
                <th key={b.label}>{b.label}</th>
              ))}
              <th>최선</th>
              <th>최악</th>
            </tr>
          </thead>
          <tbody>
            {sc.byOwnWins.map((row) => {
              const worlds = countIn(row.rank, wRanks);
              return (
                <tr key={row.wins}>
                  <td>
                    {row.wins}승 {ourRemaining.length - row.wins}패
                  </td>
                  <td style={{ color: worlds ? 'var(--flame-text)' : 'var(--faint)', fontWeight: 600 }}>
                    {pct(worlds, row.total).toFixed(1)}%
                  </td>
                  {bands.map((b) => {
                    const c = countIn(row.rank, b.ranks);
                    return (
                      <td key={b.label} style={{ color: c ? undefined : 'var(--faint)' }}>
                        {pct(c, row.total).toFixed(1)}%
                      </td>
                    );
                  })}
                  <td>{row.best}위</td>
                  <td>{row.worst}위</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="shead rv">
        <h2 className="ko">경기별 영향력</h2>
      </div>
      <p className="lede rv" style={{ marginBottom: 'var(--s4)' }}>
        각 경기의 승패가 HLE의 {bands[0].label} 확률을 얼마나 흔드는지입니다. 차이가 큰 경기일수록 중요합니다.
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

      <div className="shead rv">
        <h2 className="ko">잔여 일정</h2>
      </div>
      <div className="plist rv">
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
모든 경기가 <b>반반 확률</b>이라고 놓고 센 값이라 팀 전력 차는 들어 있지 않습니다. 끝까지 동률이면
        타이브레이커 경기로 순위를 가립니다.
      </div>
    </div>
  );
}

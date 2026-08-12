import Link from 'next/link';
import { Countdown, MatchCard } from '@/components/Shared';
import { sidesOf } from '@/lib/pick';
import { fmtDate } from '@/lib/format';
import LiveNow from '@/components/LiveNow';
import RosterRail from '@/components/Roster';
import { HotPosts } from '@/components/Board';
import { getSeason } from '@/lib/season';
import { OUR_TAG, SEASON } from '@/lib/lck2026';
import { LEGEND_OUTCOME, RISE_OUTCOME } from '@/lib/scenarios';

export const dynamic = 'force-dynamic';

export default async function Home() {
  let bundle;
  try {
    bundle = await getSeason();
  } catch {
    return (
      <div className="wrap sec">
        <h2 className="ko ptitle">지금 순위·일정을 불러오지 못했습니다</h2>
        <p className="lede" style={{ marginTop: 10 }}>
          LoL Esports API 응답이 없습니다. 잠시 뒤 새로고침해 주세요.
        </p>
      </div>
    );
  }

  const { season, us, next, recent, ourGroup, scenarios } = bundle;
  const group = ourGroup === 'legend' ? season.legend : season.rise;
  const outcome = ourGroup === 'legend' ? LEGEND_OUTCOME : RISE_OUTCOME;
  const opp = next ? sidesOf(next).them : null;
  const oppRow = opp ? group.find((t) => t.code === opp.code) : undefined;
  // rank[] 는 경우의 수 '개수'라 백분율로 환산해야 한다
  const topProb =
    (scenarios.rank.slice(0, scenarios.seedCut).reduce((a, b) => a + b, 0) / scenarios.total) * 100;

  return (
    <>
      <div className="hero">
        <div className="hero-in">
          <h1>
            MATCH
            <br />
            <em>DAY</em>
          </h1>
          {next && <Countdown target={next.startTime} />}
          <div className="hero-cta">
            <Link className="btn btn-primary" href="/me">
              경기 알림 받기
            </Link>
            <Link className="btn btn-ghost" href="/schedule">
              전체 일정
            </Link>
          </div>
        </div>
      </div>

      {next && us && opp && (
        <div className="vs">
          <div className="t">
            <div className="crest us">{OUR_TAG}</div>
            <div>
              <b>한화생명e스포츠</b>
              <span className="cap">
                {us.w}승 {us.l}패 · {SEASON[ourGroup].label} {us.rank}위 ({us.diff >= 0 ? '+' : ''}
                {us.diff})
              </span>
            </div>
          </div>
          <div className="m">
            <b>VS</b>
            <span className="cap">
              {fmtDate(next.startTime)} · BO{next.bo}
            </span>
          </div>
          <div className="t r">
            <div>
              <b>{opp.name}</b>
              <span className="cap">
                {oppRow ? `${oppRow.w}승 ${oppRow.l}패 · ${oppRow.rank}위` : next.blockName}
              </span>
            </div>
            <div className="crest them">{opp.code}</div>
          </div>
        </div>
      )}

      <div className="wrap sec">
        <div className="shead">
          <h2 className="ko">중계 보기</h2>
        </div>
        <LiveNow />

        {us && (
          <>
            <div className="shead">
              <h2 className="ko">플레이오프 가는 길</h2>
              <Link className="btn btn-ghost btn-sm" href="/scenarios">
                경우의 수
              </Link>
            </div>
            <div className="card">
              <div className="oddsrow">
                <div>
                  <div className="num" style={{ fontSize: 44 }}>
                    {topProb.toFixed(1)}
                    <span style={{ fontSize: 20, color: 'var(--mute)' }}>%</span>
                  </div>
                  <div className="cap" style={{ marginTop: 2 }}>
                    {ourGroup === 'legend' ? '플레이오프 2라운드 직행' : '플레이-인 진출'} 확률
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <b style={{ fontSize: 15 }}>
                    현재 {us.rank}위 — {outcome[us.rank]}
                  </b>
                  <div className="cap" style={{ marginTop: 2 }}>
                    잔여 {scenarios.remaining.filter((r) => r.a === OUR_TAG || r.b === OUR_TAG).length}경기 ·{' '}
                    {scenarios.total.toLocaleString()}가지 전수 계산
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        <div className="shead">
          <h2 className="ko">최근 경기</h2>
          <Link className="btn btn-ghost btn-sm" href="/schedule">
            전체 결과
          </Link>
        </div>
        <div className="g3">
          {recent.map((m) => (
            <MatchCard key={m.id} m={m} />
          ))}
        </div>

        <div className="shead">
          <h2 className="ko">선수단</h2>
          <Link className="btn btn-ghost btn-sm" href="/roster">
            전체 프로필
          </Link>
        </div>
        <RosterRail />

        <div className="shead">
          <h2 className="ko">지금 뜨는 글</h2>
          <Link className="btn btn-ghost btn-sm" href="/board">
            커뮤니티
          </Link>
        </div>
        <HotPosts />

        <div className="flamestrip" style={{ marginTop: 'var(--s8)' }}>
          <div>
            <div className="ko" style={{ fontSize: 'clamp(24px,4vw,34px)' }}>이번 판, 스코어 맞혀볼래?</div>
            <p style={{ color: '#4A1D00', fontSize: 14, fontWeight: 500, marginTop: 8 }}>
              적중하면 포인트 · 주간 랭킹 반영
            </p>
          </div>
          <Link className="btn btn-light" href="/predict">
            예측 참여
          </Link>
        </div>
      </div>
    </>
  );
}

import Link from 'next/link';
import { Bell, CalendarDays, ListOrdered, Target, Users, Waypoints } from 'lucide-react';
import { Countdown, MatchCard } from '@/components/Shared';
import { sidesOf } from '@/lib/pick';
import { fmtDate } from '@/lib/format';
import LiveNow from '@/components/LiveNow';
import RosterRail from '@/components/Roster';
import { getSeason } from '@/lib/season';
import { getPlayerStats } from '@/lib/naver';
import { getChampionStats } from '@/lib/leaguepedia';
import { OUR_TAG, SEASON } from '@/lib/lck2026';
import { LEGEND_BANDS, RISE_BANDS, countIn, worldsRanks } from '@/lib/scenarios';

export const dynamic = 'force-dynamic';

export default async function Home() {
  // 선수 기록은 순위·일정과 별개 출처라 나란히 시작한다. 실패해도 던지지 않고 null 이 온다
  const statsPromise = getPlayerStats();
  const champsPromise = getChampionStats();
  let bundle;
  try {
    bundle = await getSeason();
  } catch {
    return (
      <div className="wrap sec">
        <h2 className="ko ptitle">지금 순위·일정을 불러오지 못했습니다</h2>
        <p className="lede" style={{ marginTop: 10 }}>잠시 뒤 새로고침해 주세요.</p>
      </div>
    );
  }

  const [stats, champions] = await Promise.all([statsPromise, champsPromise]);
  const { season, us, next, recent, ourGroup, scenarios } = bundle;
  const upcoming = season.matches
    .filter((m) => m.stage === 'regular' && m.state !== 'completed')
    .filter((m) => m.a.code === OUR_TAG || m.b.code === OUR_TAG)
    .slice(0, 3);
  const group = ourGroup === 'legend' ? season.legend : season.rise;
  const bands = ourGroup === 'legend' ? LEGEND_BANDS : RISE_BANDS;
  const bandOf = (r: number) => bands.find((b) => b.ranks.includes(r));
  const opp = next ? sidesOf(next).them : null;
  const oppRow = opp ? group.find((t) => t.code === opp.code) : undefined;
  // MSI 우승으로 플레이오프 진출 = 월즈 확정. 팬이 가장 궁금해하는 단일 지표라 이걸 앞세운다.
  // rank[] 는 경우의 수 '개수'라 백분율로 환산해야 한다
  const wRanks = worldsRanks(bands);
  const worldsCut = wRanks.length ? Math.max(...wRanks) : 0;
  const topProb = (countIn(scenarios.rank, wRanks) / scenarios.total) * 100;

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
              <Bell size={17} />
              알림 설정
            </Link>
            <Link className="btn btn-ghost" href="/schedule">
              <CalendarDays size={17} />
              전체 일정
            </Link>
          </div>
        </div>
      </div>

      {next && us && opp && (
        <div className="vs">
          <div className="wrap vsrow">
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
                <Waypoints size={14} />
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
                    월즈 진출 확정 확률 · {worldsCut}위 안
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <b style={{ fontSize: 15 }}>
                    현재 {us.rank}위 — {bandOf(us.rank)?.label ?? '-'}
                  </b>
                  <div className="cap" style={{ marginTop: 2 }}>
                    남은 경기 {scenarios.remaining.filter((r) => r.a === OUR_TAG || r.b === OUR_TAG).length}경기
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        <div className="shead">
          <h2 className="ko">최근 경기</h2>
          <Link className="btn btn-ghost btn-sm" href="/schedule">
            <ListOrdered size={14} />
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
            <Users size={14} />
            전체 프로필
          </Link>
        </div>
        <RosterRail stats={stats} champions={champions} />

        <div className="shead">
          <h2 className="ko">다가오는 일정</h2>
          <Link className="btn btn-ghost btn-sm" href="/schedule">
            <CalendarDays size={14} />
            전체 일정
          </Link>
        </div>
        <div className="g3">
          {upcoming.map((m) => (
            <MatchCard key={m.id} m={m} />
          ))}
        </div>

        <div className="flamestrip" style={{ marginTop: 'var(--s8)' }}>
          <div>
            <div className="ko" style={{ fontSize: 'clamp(24px,4vw,34px)' }}>이번 판, 스코어 맞혀볼래?</div>
            <p style={{ color: 'var(--on-flame)', fontSize: 14, fontWeight: 500, marginTop: 8 }}>
              적중하면 포인트 · 주간 랭킹 반영
            </p>
          </div>
          <Link className="btn btn-light" href="/predict">
            <Target size={17} />
            예측 참여
          </Link>
        </div>
      </div>
    </>
  );
}

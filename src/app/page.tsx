import Link from 'next/link';
import { CalendarDays, ChevronRight, ListOrdered, Target, Users } from 'lucide-react';
import { Countdown, MatchCard } from '@/components/Shared';
import { sidesOf } from '@/lib/pick';
import { fmtDate } from '@/lib/format';
import LiveNow from '@/components/LiveNow';
import LiveMatchStats from '@/components/LiveMatchStats';
import RosterRail from '@/components/Roster';
import { getSeason } from '@/lib/season';
import { getWorldsMatches } from '@/lib/lolesports-live';
import { getPlayerStats } from '@/lib/naver';
import { getChampionStats, getContracts } from '@/lib/leaguepedia';
import { OUR_TAG, SEASON } from '@/lib/lck2026';

export const dynamic = 'force-dynamic';

const koreaDay = (d: Date) =>
  new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);

export default async function Home() {
  const statsPromise = getPlayerStats();
  const champsPromise = getChampionStats();
  const contractsPromise = getContracts();
  const worldsPromise = getWorldsMatches().catch(() => []);
  let bundle;
  try {
    bundle = await getSeason();
  } catch {
    return (
      <div className="wrap sec">
        <h2 className="ko ptitle rv">경기 정보를 불러오지 못했습니다</h2>
        <p className="lede rv" style={{ marginTop: 10 }}>새로고침해 주세요.</p>
      </div>
    );
  }

  const [stats, champions, contracts, worlds] = await Promise.all([
    statsPromise, champsPromise, contractsPromise, worldsPromise,
  ]);
  const { season, us, ourGroup } = bundle;
  const allMatches = [...season.matches, ...worlds].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const ourMatches = allMatches.filter((m) => m.a.code === OUR_TAG || m.b.code === OUR_TAG);
  const now = Date.parse(bundle.fetchedAt);
  const next = ourMatches
    .filter((m) => m.state !== 'completed' && (m.state === 'inProgress' || Date.parse(m.startTime) > now - 4 * 60 * 60_000))
    .sort((a, b) => a.startTime.localeCompare(b.startTime))[0] || null;
  const recent = ourMatches.filter((m) => m.state === 'completed')
    .sort((a, b) => b.startTime.localeCompare(a.startTime)).slice(0, 3);
  const upcoming = ourMatches.filter((m) => m.state === 'unstarted' && Date.parse(m.startTime) > now)
    .sort((a, b) => a.startTime.localeCompare(b.startTime)).slice(0, 3);
  const today = next ? koreaDay(new Date(next.startTime)) === koreaDay(new Date(now)) : false;
  const withinWeek = !!next && Date.parse(next.startTime) - now <= 7 * 24 * 60 * 60_000;
  const largeHero = !!next && (today || withinWeek || next.state === 'inProgress');
  const opp = next ? sidesOf(next).them : null;

  const findTeam = (code: string) => {
    for (const g of ['legend', 'rise'] as const) {
      const row = season[g].find((t) => t.code === code);
      if (row) return { row, g };
    }
    return null;
  };
  const oppTeam = opp ? findTeam(opp.code) : null;

  return (
    <>
      {largeHero && next && (
        <div className="hero">
          <div className="hero-in">
            <h1>
              {next.state === 'inProgress' ? <>LIVE<br /><em>MATCH</em></> :
                today ? <>MATCH<br /><em>DAY</em></> :
                  <>NEXT<br /><em>MATCH</em></>}
            </h1>
            {next.state !== 'inProgress' && <Countdown target={next.startTime} />}
            <div className="hero-cta">
              <Link className="btn btn-primary" href={'/match/' + next.id}>
                <ChevronRight size={17} /> 경기 정보
              </Link>
              <Link className="btn btn-ghost" href="/schedule">
                <CalendarDays size={17} /> 전체 일정
              </Link>
            </div>
          </div>
        </div>
      )}

      {!largeHero && next && (
        <div className="next-strip">
          <div className="wrap next-strip-inner">
            <div><span className="cap">NEXT MATCH</span><b>HLE vs {opp?.code || 'TBD'}</b></div>
            <span className="cap">{fmtDate(next.startTime)} · BO{next.bo}</span>
            <Link className="btn btn-ghost btn-sm" href={'/match/' + next.id}>경기 정보 <ChevronRight size={14} /></Link>
          </div>
        </div>
      )}

      {largeHero && next && us && opp && (
        <div className="vs">
          <div className="wrap vsrow">
            <div className="t">
              <div className="crest us">{OUR_TAG}</div>
              <div>
                <b>한화생명e스포츠</b>
                <span className="cap">{us.w}승 {us.l}패 · {us.diff >= 0 ? '+' : ''}{us.diff}</span>
                <span className="cap grp">{SEASON[ourGroup].label} {us.rank}위</span>
              </div>
            </div>
            <div className="m">
              <b>VS</b>
              <span className="cap">{fmtDate(next.startTime)} · BO{next.bo}</span>
            </div>
            <div className="t r">
              <div>
                <b>{opp.name}</b>
                {oppTeam ? (
                  <>
                    <span className="cap">{oppTeam.row.w}승 {oppTeam.row.l}패 · {oppTeam.row.diff >= 0 ? '+' : ''}{oppTeam.row.diff}</span>
                    <span className="cap grp">{SEASON[oppTeam.g].label} {oppTeam.row.rank}위</span>
                  </>
                ) : <span className="cap">{next.blockName}</span>}
              </div>
              <div className="crest them">{opp.code}</div>
            </div>
          </div>
        </div>
      )}

      <div className="wrap sec">
        <LiveMatchStats compact />

        <div className="shead rv">
          <h2 className="ko">중계 보기</h2>
        </div>
        <LiveNow />

        {recent.length > 0 && (
          <>
            <div className="shead rv">
              <h2 className="ko">최근 경기</h2>
              <Link className="btn btn-ghost btn-sm" href="/schedule"><ListOrdered size={14} /> 전체 결과</Link>
            </div>
            <div className="g3 rv">{recent.map((m) => <MatchCard key={m.id} m={m} />)}</div>
          </>
        )}

        <div className="shead rv">
          <h2 className="ko">선수단</h2>
          <Link className="btn btn-ghost btn-sm" href="/roster"><Users size={14} /> 전체 프로필</Link>
        </div>
        <RosterRail stats={stats} champions={champions} contracts={contracts} />

        {upcoming.length > 0 && (
          <>
            <div className="shead rv">
              <h2 className="ko">다가오는 일정</h2>
              <Link className="btn btn-ghost btn-sm" href="/schedule"><CalendarDays size={14} /> 전체 일정</Link>
            </div>
            <div className="g3 rv">{upcoming.map((m) => <MatchCard key={m.id} m={m} />)}</div>
            <div className="flamestrip" style={{ marginTop: 'var(--s8)' }}>
              <div>
                <div className="ko" style={{ fontSize: 'clamp(24px,4vw,34px)' }}>승부예측</div>
              </div>
              <Link className="btn btn-light" href="/predict"><Target size={17} /> 예측 참여</Link>
            </div>
          </>
        )}
      </div>
    </>
  );
}

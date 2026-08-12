import Link from 'next/link';
import { Ki } from '@/components/IconSprite';
import { Countdown, MatchCard } from '@/components/Shared';
import { fmtDate } from '@/lib/format';
import LiveNow from '@/components/LiveNow';
import RosterRail from '@/components/Roster';
import { HotPosts } from '@/components/Board';
import { MATCHES, OUR_TAG, TEAMS, nextMatch, teamOf } from '@/lib/lck2026';

export default function Home() {
  const next = nextMatch();
  const ranked = [...TEAMS].sort((a, b) => b.w - a.w || b.diff - a.diff);
  const us = ranked.find((t) => t.tag === OUR_TAG)!;
  const opp = next ? teamOf(next.opponent) : undefined;
  const oppRank = opp ? ranked.indexOf(opp) + 1 : 0;
  const recent = MATCHES.filter((m) => m.status === 'done').slice(0, 3);

  return (
    <>
      <div className="hero">
        <div className="hero-in">
          <div className="kicker">
            <Ki n="bolt" />
            Next Match · LCK {new Date().getFullYear()}
          </div>
          <h1>
            MATCH
            <br />
            <em>DAY</em>
          </h1>
          {next && <Countdown target={next.kickoff} />}
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

      {next && opp && (
        <div className="vs">
          <div className="t">
            <div className="crest us">HLE</div>
            <div>
              <b>한화생명e스포츠</b>
              <span className="cap">
                {us.w}승 {us.l}패 · {ranked.indexOf(us) + 1}위
              </span>
            </div>
          </div>
          <div className="m">
            <b>VS</b>
            <span className="cap">
              {fmtDate(next.kickoff)} · BO{next.bo}
            </span>
          </div>
          <div className="t r">
            <div>
              <b>{opp.name}</b>
              <span className="cap">
                {opp.w}승 {opp.l}패 · {oppRank}위
              </span>
            </div>
            <div className="crest them">{opp.tag}</div>
          </div>
        </div>
      )}

      <div className="wrap sec">
        {/* 라이브 중계 — 서버가 치지직·SOOP 를 실제로 폴링해서 판정 */}
        <div className="shead">
          <div>
            <div className="kicker-mute">
              <Ki n="cast" />
              Live
            </div>
            <h2 className="ko" style={{ marginTop: 6 }}>
              중계 보기
            </h2>
          </div>
        </div>
        <LiveNow />

        <div className="shead" style={{ marginTop: 'var(--s7)' }}>
          <div>
            <div className="kicker-mute">
              <Ki n="history" />
              Recent
            </div>
            <h2 className="ko" style={{ marginTop: 6 }}>
              최근 경기
            </h2>
          </div>
          <Link className="btn btn-ghost btn-sm" href="/schedule">
            전체 결과
          </Link>
        </div>
        <div className="g3">
          {recent.map((m) => (
            <MatchCard key={m.id} m={m} />
          ))}
        </div>

        <div className="shead" style={{ marginTop: 'var(--s7)' }}>
          <div>
            <div className="kicker-mute">
              <Ki n="users" />
              Roster
            </div>
            <h2 className="ko" style={{ marginTop: 6 }}>
              선수단
            </h2>
          </div>
          <Link className="btn btn-ghost btn-sm" href="/roster">
            전체 프로필
          </Link>
        </div>
        <RosterRail />

        <div className="shead" style={{ marginTop: 'var(--s7)' }}>
          <div>
            <div className="kicker-mute">
              <Ki n="chat" />
              Community
            </div>
            <h2 className="ko" style={{ marginTop: 6 }}>
              지금 뜨는 글
            </h2>
          </div>
          <Link className="btn btn-ghost btn-sm" href="/board">
            커뮤니티
          </Link>
        </div>
        <HotPosts />

        <div className="flamestrip" style={{ marginTop: 'var(--s7)' }}>
          <div>
            <div className="kicker" style={{ color: '#fff', opacity: 0.85 }}>
              <Ki n="target" />
              Prediction
            </div>
            <div className="display ko" style={{ fontSize: 'clamp(24px,4vw,34px)', marginTop: 8 }}>
              이번 판, 스코어 맞혀볼래?
            </div>
            <p style={{ opacity: 0.88, fontSize: 14, marginTop: 6 }}>적중하면 포인트 · 주간 랭킹 반영</p>
          </div>
          <Link className="btn" style={{ background: '#0B0B0C', color: '#fff' }} href="/predict">
            예측 참여
          </Link>
        </div>
      </div>
    </>
  );
}

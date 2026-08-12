'use client';

import { useState } from 'react';
import { Ki } from '@/components/IconSprite';
import { MatchCard } from '@/components/Shared';
import { LEGEND_GROUP_SIZE, MATCHES, OUR_TAG, SEASON, TEAMS } from '@/lib/lck2026';

const FILTERS = [
  { k: 'all', t: '전체' },
  { k: 'upcoming', t: '예정' },
  { k: 'done', t: '종료' },
] as const;

export default function SchedulePage() {
  const [f, setF] = useState<string>('all');

  const list = MATCHES.filter((m) => f === 'all' || m.status === f).sort((a, b) =>
    a.status === b.status
      ? a.status === 'upcoming'
        ? +new Date(a.kickoff) - +new Date(b.kickoff)
        : +new Date(b.kickoff) - +new Date(a.kickoff)
      : a.status === 'upcoming'
        ? -1
        : 1,
  );

  const ranked = [...TEAMS].sort((a, b) => b.w - a.w || b.diff - a.diff);

  return (
    <div className="wrap sec">
      <div className="kicker-mute">
        <Ki n="calendar" />
        Schedule
      </div>
      <h2 className="ko ptitle" style={{ margin: '8px 0 4px' }}>
        일정 &amp; 결과
      </h2>
      <p className="bodytx" style={{ marginBottom: 'var(--s5)' }}>
        {SEASON.year} 시즌 · {SEASON.format}
      </p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 'var(--s5)' }}>
        {FILTERS.map((x) => (
          <button key={x.k} className={`chip${f === x.k ? ' on' : ''}`} onClick={() => setF(x.k)}>
            {x.t}
          </button>
        ))}
      </div>

      <div className="g3">
        {list.map((m) => (
          <MatchCard key={m.id} m={m} />
        ))}
      </div>

      <div className="shead" style={{ marginTop: 'var(--s7)' }}>
        <div>
          <div className="kicker-mute">
            <Ki n="trophy" />
            Standings
          </div>
          <h2 className="ko" style={{ marginTop: 6 }}>
            순위표
          </h2>
        </div>
      </div>

      <div className="grouplabel">
        <Ki n="star" />
        레전드 그룹 · 1~2라운드 상위 {LEGEND_GROUP_SIZE}팀 · 플레이오프 직행
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>팀</th>
              <th>승-패</th>
              <th>세트 득실</th>
            </tr>
          </thead>
          <tbody>
            {ranked.slice(0, LEGEND_GROUP_SIZE).map((t, i) => (
              <tr key={t.tag} className={t.tag === OUR_TAG ? 'me' : undefined}>
                <td>{i + 1}</td>
                <td>{t.name}</td>
                <td>
                  {t.w}-{t.l}
                </td>
                <td>{t.diff > 0 ? `+${t.diff}` : t.diff}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grouplabel" style={{ color: 'var(--flame)' }}>
        <Ki n="flame" />
        라이즈 그룹 · 하위 5팀 · 6~10위는 플레이-인으로 PO 6번 시드 경쟁
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table>
          <tbody>
            {ranked.slice(LEGEND_GROUP_SIZE).map((t, i) => (
              <tr key={t.tag} className={t.tag === OUR_TAG ? 'me' : undefined}>
                <td style={{ width: 40 }}>{LEGEND_GROUP_SIZE + i + 1}</td>
                <td>{t.name}</td>
                <td>
                  {t.w}-{t.l}
                </td>
                <td>{t.diff > 0 ? `+${t.diff}` : t.diff}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="note">
        <b>참가 10팀과 시즌 포맷은 실제 2026 LCK 기준</b>입니다 (개막 {SEASON.opensAt} · 결승 {SEASON.finalsAt} ·
        정규 {SEASON.rounds}라운드, 팀당 {SEASON.gamesPerTeam}경기). 개별 경기 일정과 승패 기록은 샘플이며,
        실서비스에서는 수집기 + 관리자 오버라이드로 채웁니다.
      </div>
    </div>
  );
}

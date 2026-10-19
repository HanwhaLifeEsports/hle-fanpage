'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/lib/useAppState';
import { sidesOf } from '@/lib/pick';
import type { MatchRow } from '@/lib/lolesports';
import TeamLogo from './TeamLogo';

/** 앱 일정 화면과 같은 세그먼트. 기본은 우리 팀 경기 */
const FILTERS = [
  { k: 'ours', t: 'HLE' },
  { k: 'intl', t: '국제 대회' },
  { k: 'lck', t: 'LCK 전체' },
] as const;
type FilterKey = (typeof FILTERS)[number]['k'];

const KST = 'Asia/Seoul';
const fmt = (iso: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('ko-KR', { timeZone: KST, ...o }).format(new Date(iso));
const md = (iso: string) => fmt(iso, { month: 'numeric', day: 'numeric' }).replace(/\.\s?/g, '.').replace(/\.$/, '');
const hm = (iso: string) => fmt(iso, { hour: '2-digit', minute: '2-digit', hour12: false });
const day = (iso: string) => fmt(iso, { month: 'numeric', day: 'numeric', weekday: 'short' });

function until(iso: string) {
  const s = (Date.parse(iso) - Date.now()) / 1000;
  if (s <= 0) return '곧';
  if (s >= 86400) return `${Math.floor(s / 86400)}일 뒤`;
  if (s >= 3600) return `${Math.floor(s / 3600)}시간 뒤`;
  return `${Math.floor(s / 60)}분 뒤`;
}

/** 다가오는 우리 경기 — 주황 카드 */
function UpcomingCard({ m, ourTag }: { m: MatchRow; ourTag: string }) {
  const { us, them } = sidesOf(m, ourTag);
  return (
    <Link href={`/match/${m.id}`} className="ui-upcoming">
      <div className="ui-head">
        <b>{m.blockName || 'LCK'}</b>
        {m.state === 'inProgress' ? <span className="ui-badge live">LIVE</span> : <span className="ui-badge glass">{until(m.startTime)}</span>}
      </div>
      <div className="ui-up-mid">
        <TeamLogo image={us.image} size={60} label={us.name} />
        <div>
          <b>{hm(m.startTime)}</b>
          <span>
            {day(m.startTime)} · BO{m.bo}
          </span>
        </div>
        <TeamLogo image={them.image} size={60} label={them.name} />
      </div>
      <div className="ui-up-foot glass">
        <span>vs {them.name}</span>
        <b>경기 정보</b>
      </div>
    </Link>
  );
}

/** 끝난 경기·다른 팀 경기 한 줄 */
function ResultRow({ m, ourTag }: { m: MatchRow; ourTag: string }) {
  const { prefs, revealed } = useApp();
  const mine = m.a.code === ourTag || m.b.code === ourTag;
  const { us, them } = sidesOf(m, ourTag);
  const done = m.state === 'completed';
  const hide = done && prefs.spoiler && !revealed[m.id];
  const won = done && (us.games ?? 0) > (them.games ?? 0);

  return (
    <Link href={`/match/${m.id}`} className="ui-line">
      {mine ? (
        <TeamLogo image={them.image} size={48} label={them.name} />
      ) : (
        <span className="ui-pair">
          <TeamLogo image={m.a.image} size={34} label={m.a.name} />
          <TeamLogo image={m.b.image} size={34} label={m.b.name} />
        </span>
      )}
      <div>
        <b>{mine ? `vs ${them.name}` : `${m.a.code} vs ${m.b.code}`}</b>
        <span className="cap">
          {md(m.startTime)} · {m.blockName || 'LCK'}
          {!done && ` · ${hm(m.startTime)}`}
        </span>
      </div>
      {done ? (
        hide ? (
          <span className="ui-reveal">결과 보기</span>
        ) : (
          <span className="ui-score">
            <b className={mine && won ? 'win' : undefined}>{mine ? `${us.games}:${them.games}` : `${m.a.games}:${m.b.games}`}</b>
            {mine && <i className={won ? 'win' : 'loss'}>{won ? '승' : '패'}</i>}
          </span>
        )
      ) : (
        <span className="cap">{until(m.startTime)}</span>
      )}
    </Link>
  );
}

export default function MatchFilter({ matches, ourTag }: { matches: MatchRow[]; ourTag: string }) {
  const [f, setF] = useState<FilterKey>('ours');
  const mine = (m: MatchRow) => m.a.code === ourTag || m.b.code === ourTag;
  // 국제 대회: LCK 주차·플레이오프 표기가 아닌 우리 경기 (월즈·MSI·퍼스트 스탠드)
  const intl = (m: MatchRow) => mine(m) && !/주\s*차|플레이오프|플레이-인|결승/.test(m.blockName || '');

  const list = matches.filter((m) => (f === 'ours' ? mine(m) : f === 'intl' ? intl(m) : !intl(m)));
  const upcoming = list.filter((m) => m.state !== 'completed').sort((a, b) => a.startTime.localeCompare(b.startTime));
  const done = list.filter((m) => m.state === 'completed').sort((a, b) => b.startTime.localeCompare(a.startTime));
  // 다른 팀 경기까지 다 보일 때는 다가오는 것도 줄 목록으로
  const upcomingCards = f === 'lck' ? [] : upcoming.filter(mine).slice(0, 3);
  const upcomingRows = upcoming.filter((m) => !upcomingCards.includes(m));

  return (
    <>
      <div className="ui-seg glass-bar" role="tablist" aria-label="일정 구분">
        {FILTERS.map((x) => (
          <button key={x.k} role="tab" aria-selected={f === x.k} className={f === x.k ? 'on' : undefined} onClick={() => setF(x.k)}>
            {x.t}
          </button>
        ))}
      </div>

      {upcoming.length > 0 && <div className="ui-section-label">다가오는 경기</div>}
      {upcomingCards.map((m) => (
        <UpcomingCard key={m.id} m={m} ourTag={ourTag} />
      ))}
      {upcomingRows.length > 0 && (
        <div className="ui-paper ui-list">
          {upcomingRows.slice(0, 40).map((m) => (
            <ResultRow key={m.id} m={m} ourTag={ourTag} />
          ))}
        </div>
      )}

      {done.length > 0 && <div className="ui-section-label">지난 경기</div>}
      {done.length > 0 && (
        <div className="ui-paper ui-list">
          {done.slice(0, 60).map((m) => (
            <ResultRow key={m.id} m={m} ourTag={ourTag} />
          ))}
        </div>
      )}

      {list.length === 0 && <div className="ui-paper cap">경기가 없습니다.</div>}
    </>
  );
}

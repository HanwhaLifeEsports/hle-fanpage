'use client';

import { useState } from 'react';
import { MatchCard } from './Shared';
import type { MatchRow } from '@/lib/lolesports';

const FILTERS = [
  { k: 'upcoming', t: '예정' },
  { k: 'ours', t: 'HLE 경기' },
  { k: 'done', t: '종료' },
  { k: 'all', t: '전체' },
] as const;

export default function MatchFilter({ matches, ourTag }: { matches: MatchRow[]; ourTag: string }) {
  const [f, setF] = useState<string>('upcoming');

  const list = matches
    .filter((m) => {
    if (f === 'upcoming') return m.state !== 'completed';
    if (f === 'done') return m.state === 'completed';
    if (f === 'ours') return m.a.code === ourTag || m.b.code === ourTag;
      return true;
    })
    // 예정은 가까운 순, 나머지는 최근 순
    .sort((x, y) =>
      f === 'upcoming'
        ? x.startTime.localeCompare(y.startTime)
        : y.startTime.localeCompare(x.startTime),
    );

  return (
    <>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 'var(--s5)' }}>
        {FILTERS.map((x) => (
          <button key={x.k} className={`chip${f === x.k ? ' on' : ''}`} onClick={() => setF(x.k)}>
            {x.t}
          </button>
        ))}
        <span className="cap" style={{ alignSelf: 'center' }}>{list.length}경기</span>
      </div>
      {list.length ? (
        <div className="g3">
          {list.map((m) => (
            <MatchCard key={m.id} m={m} />
          ))}
        </div>
      ) : (
        <div className="note" style={{ margin: 0 }}>
          해당하는 경기가 없습니다.
        </div>
      )}
    </>
  );
}

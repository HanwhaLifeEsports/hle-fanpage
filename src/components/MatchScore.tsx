'use client';

import { useApp } from '@/lib/useAppState';

/** 스코어보드 가운데 숫자. 스포일러 차단이 켜져 있으면 눌러야 보인다 */
export default function MatchScore({ id, a, b, started }: { id: string; a: number | null; b: number | null; started: boolean }) {
  const { prefs, revealed, reveal } = useApp();
  if (!started) return <b className="ui-sb-vs">VS</b>;
  if (prefs.spoiler && !revealed[id]) {
    return (
      <button className="ui-pill glass ui-sb-reveal" onClick={() => reveal(id)}>
        결과 보기
      </button>
    );
  }
  return (
    <b className="ui-sb-score">
      {a ?? 0} : {b ?? 0}
    </b>
  );
}

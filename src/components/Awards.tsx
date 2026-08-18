'use client';

import { useEffect, useState } from 'react';
import { Trophy, X } from 'lucide-react';
import { AWARDS } from '@/lib/awards';

/**
 * 트로피 하나와, 눌렀을 때 열리는 수상 목록.
 *
 * 선수 모달 안에서도 쓰고 코칭스태프 카드에서도 쓴다. 두 자리의 겉모습이 달라도
 * 여는 방법과 내용은 같아야 한다 — 트로피를 한 번 눌러 본 사람이 다른 자리에서
 * 다시 배우지 않도록.
 *
 * 선수 모달 위에 겹쳐 열리므로 층을 하나 더 쌓는다. 바깥을 눌러 닫을 때 아래
 * 모달까지 함께 닫히면 안 된다 — 트로피만 접고 보던 선수로 돌아와야 한다.
 * 그래서 클릭 전파를 여기서 끊는다.
 */
export default function AwardsButton({ id, name }: { id: string; name: string }) {
  const a = AWARDS[id];
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    // 위에 열린 것부터 닫힌다. 아래 모달의 Esc 처리가 함께 돌면 두 층이 한 번에
    // 사라지므로 여기서 전파를 끊는다
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      setOpen(false);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open]);

  if (!a || (a.titles.length === 0 && a.honors.length === 0)) return null;

  return (
    <>
      <button
        className="trophy"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        aria-label={`${name} 수상 실적 보기`}
      >
        <Trophy size={13} aria-hidden />
        {a.titles.length}
      </button>

      {open && (
        <div
          className="ov ovtop"
          onClick={(e) => {
            e.stopPropagation();
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="modal pop">
            <div className="modal-h">
              <b style={{ fontSize: 16 }}>
                {name}{' '}
                <span style={{ color: 'var(--mute)', fontWeight: 400, fontSize: 13 }}>수상 실적</span>
              </b>
              <button className="x" onClick={() => setOpen(false)} aria-label="닫기">
                <X size={15} />
              </button>
            </div>
            <div className="modal-b">
              <h3 className="grouphead">우승 {a.titles.length}회</h3>
              <ul className="awlist">
                {a.titles.map((t, i) => (
                  <li key={`${t.year}-${t.name}`} style={{ '--d': `${i * 28}ms` } as React.CSSProperties}>
                    <span className="awy">{t.year}</span>
                    <span className="awn">{t.name}</span>
                    {/* 지금 팀과 다를 때만 적는다. 전부 적으면 한화생명이 줄마다
                        반복돼 정작 다른 팀에서 든 트로피가 묻힌다 */}
                    {t.team && <span className="awt">{t.team}</span>}
                  </li>
                ))}
              </ul>

              {a.honors.length > 0 && (
                <>
                  <h3 className="grouphead" style={{ marginTop: 'var(--s5)' }}>
                    개인 수상
                  </h3>
                  <ul className="awlist solo">
                    {a.honors.map((t, i) => (
                      <li
                        key={`${t.year}-${t.name}`}
                        style={{ '--d': `${(a.titles.length + i) * 28}ms` } as React.CSSProperties}
                      >
                        <span className="awy">{t.year}</span>
                        <span className="awn">{t.name}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {/* 출처는 적지 않는다. 네이버·Leaguepedia 표기는 남의 데이터셋을 끌어
                  쓰기 때문이지만 이건 공개된 사실이다.
                  범위는 적는다 — 아카데미 우승이 왜 없는지 궁금해질 수 있다 */}
              <p className="note" style={{ marginBottom: 0 }}>
                주요 대회 기준
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

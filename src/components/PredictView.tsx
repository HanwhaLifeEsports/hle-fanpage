'use client';

import { fmtDate } from '@/lib/format';
import { toast, useApp, type Pick } from '@/lib/useAppState';

/** 예측 후보 — BO3 의 모든 결과 */
const PICKS: Pick[] = [
  [2, 0],
  [2, 1],
  [1, 2],
  [0, 2],
];

export interface PredictMatch {
  id: string;
  startTime: string;
  opponent: string;
  opponentCode: string;
  bo: number;
  /** 종료된 경기만 채워진다 */
  result: Pick | null;
  locked: boolean;
}

/** 정확히 맞히면 3점, 승패만 맞히면 1점 */
function score(pick: Pick, result: Pick) {
  if (pick[0] === result[0] && pick[1] === result[1]) return 3;
  return pick[0] > pick[1] === result[0] > result[1] ? 1 : 0;
}

export default function PredictView({ matches }: { matches: PredictMatch[] }) {
  const { picks, setPick } = useApp();

  const open = matches.filter((m) => !m.locked);
  const graded = matches
    .filter((m) => m.result && picks[m.id])
    .map((m) => ({ m, pick: picks[m.id], pts: score(picks[m.id], m.result!) }));

  const total = graded.reduce((n, g) => n + g.pts, 0);
  const exact = graded.filter((g) => g.pts === 3).length;
  const hit = graded.filter((g) => g.pts > 0).length;

  return (
    <div className="wrap sec">
      <h2 className="ko ptitle rv">승부예측</h2>
      <p className="lede rv" style={{ marginTop: 10 }}>
        세트 스코어를 맞히면 3점, 승패만 맞히면 1점입니다. 경기가 끝나면 실제 결과와 대조해 자동으로
        채점됩니다.
      </p>

      {graded.length > 0 && (
        <div className="card rv" style={{ marginTop: 'var(--s5)' }}>
          <div className="statgrid rv">
            {(
              [
                ['누적 점수', `${total}점`],
                ['적중', `${hit} / ${graded.length}`],
                ['정확히 맞힘', `${exact}회`],
              ] as const
            ).map(([k, v]) => (
              <div key={k}>
                <div className="cap-xs">{k}</div>
                <div className="num" style={{ fontSize: 26, marginTop: 2 }}>
                  {v}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="shead rv">
        <h2 className="ko">다가오는 경기</h2>
      </div>

      {open.length === 0 ? (
        <div className="empty rv">
          <b>예측할 경기가 없습니다</b>
          <span>다음 일정이 나오면 여기에서 예측할 수 있습니다.</span>
        </div>
      ) : (
        open.map((m) => {
          const mine = picks[m.id];
          return (
            <div className="card rv" style={{ marginBottom: 'var(--s4)' }} key={m.id}>
              <div className="oddsrow" style={{ alignItems: 'center', marginBottom: 'var(--s3)' }}>
                <b style={{ fontSize: 16 }}>HLE vs {m.opponent}</b>
                <span className="cap">
                  {fmtDate(m.startTime)} · BO{m.bo}
                </span>
              </div>
              <div className="picks">
                {PICKS.map((p) => {
                  const on = mine && mine[0] === p[0] && mine[1] === p[1];
                  return (
                    <button
                      key={p.join('-')}
                      className={`pick${on ? ' on' : ''}`}
                      aria-pressed={!!on}
                      onClick={() => {
                        setPick(m.id, p);
                        toast('예측을 저장했습니다', `HLE vs ${m.opponent} · ${p[0]} : ${p[1]}`, '경기 종료 후 자동 채점');
                      }}
                    >
                      <b>
                        {p[0]} : {p[1]}
                      </b>
                      <span>{p[0] > p[1] ? '승리' : '패배'}</span>
                    </button>
                  );
                })}
              </div>
              <p className="cap">
                {mine ? `${mine[0]} : ${mine[1]} 로 예측했습니다. 경기 시작 전까지 바꿀 수 있습니다.` : '아직 예측하지 않았습니다.'}
              </p>
            </div>
          );
        })
      )}

      <div className="shead rv">
        <h2 className="ko">내 예측 기록</h2>
      </div>
      {graded.length === 0 ? (
        <div className="empty rv">
          <b>아직 채점된 예측이 없습니다</b>
          <span>예측한 경기가 끝나면 결과가 여기에 쌓입니다.</span>
        </div>
      ) : (
        <div className="plist rv">
          {graded
            .sort((x, y) => y.m.startTime.localeCompare(x.m.startTime))
            .map(({ m, pick, pts }) => (
              <div className="prow" key={m.id} style={{ cursor: 'default' }}>
                <span className="bd">{pts === 3 ? '정확' : pts === 1 ? '적중' : '실패'}</span>
                <span className="ti">vs {m.opponent}</span>
                <span className="st">
                  <span>
                    예측 {pick[0]}:{pick[1]}
                  </span>
                  <span>
                    결과 {m.result![0]}:{m.result![1]}
                  </span>
                  <span style={{ color: pts ? 'var(--win)' : 'var(--faint)' }}>+{pts}</span>
                </span>
              </div>
            ))}
        </div>
      )}

      <div className="note">
        예측은 이 브라우저에만 저장되며 서버로 전송되지 않습니다. 브라우저 데이터를 지우면 함께 사라집니다.
        점수는 사이트 안에서만 쓰이고 어떤 보상과도 교환되지 않습니다.
      </div>
    </div>
  );
}

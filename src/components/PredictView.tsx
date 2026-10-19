'use client';

import { useEffect, useState } from 'react';
import TeamLogo from './TeamLogo';
import { fmtDate } from '@/lib/format';
import { warn, useApp, type Pick } from '@/lib/useAppState';
import { myPredictions, predictionTally, savePrediction, useAccount, type Tally } from '@/lib/hleapi';

/** BO1/3/5별 가능한 최종 점수를 생성한다. */
const pickOptions = (bestOf: number): Pick[] => {
  const need = Math.floor(bestOf / 2) + 1;
  const out: Pick[] = [];
  for (let i = 0; i < need; i++) {
    out.push([need, i], [i, need]);
  }
  return out;
};

export interface PredictMatch {
  id: string;
  startTime: string;
  opponent: string;
  opponentCode: string;
  usImage: string | null;
  opponentImage: string | null;
  stage: string;
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

/** 다른 팬들이 고른 스코어 분포. 내가 예측을 낸 경기에서만 보인다 (먼저 보고 따라 고르지 않게) */
function TallyBars({ matchId, bo, opponentCode }: { matchId: string; bo: number; opponentCode: string }) {
  const [rows, setRows] = useState<Tally[] | null>(null);
  useEffect(() => {
    predictionTally(matchId).then(setRows).catch(() => setRows([]));
  }, [matchId]);
  if (!rows) return null;
  const total = rows.reduce((n, r) => n + r.count, 0);
  if (total === 0) return null;
  return (
    <div className="tally">
      <div className="cap">팬들의 선택 · {total}명</div>
      {pickOptions(bo).map(([us, them]) => {
        const n = rows.find((r) => r.us_sets === us && r.them_sets === them)?.count ?? 0;
        const pct = Math.round((n / total) * 100);
        return (
          <div className="tally-row" key={`${us}-${them}`}>
            <span>{bo === 1 ? (us > them ? 'HLE' : opponentCode) : `${us}:${them}`}</span>
            <i>
              <b style={{ width: `${pct}%`, background: us > them ? 'var(--flame)' : 'var(--win)' }} />
            </i>
            <span>{pct}%</span>
          </div>
        );
      })}
    </div>
  );
}

export default function PredictView({ matches }: { matches: PredictMatch[] }) {
  const { picks, setPick } = useApp();
  const { user } = useAccount();
  const [synced, setSynced] = useState(0);

  // 로그인했으면 서버 예측을 가져와 이 기기 기록 위에 덮는다 (앱에서 고른 것도 여기 보인다)
  useEffect(() => {
    if (!user) return;
    myPredictions()
      .then((rows) => {
        for (const r of rows) if (r.us_sets || r.them_sets) setPick(r.match_id, [r.us_sets, r.them_sets]);
        setSynced((n) => n + 1);
      })
      .catch(() => {});
  }, [user, setPick]);

  const choose = async (m: PredictMatch, p: Pick) => {
    setPick(m.id, p);
    if (!user) return;
    try {
      await savePrediction(m.id, m.opponentCode, p[0], p[1]);
      setSynced((n) => n + 1);
    } catch {
      warn('서버에 저장하지 못했습니다', '마감됐거나 연결이 불안정해요. 이 브라우저에는 저장했어요.');
    }
  };

  const open = matches.filter((m) => !m.locked);
  const graded = matches
    .filter((m) => m.result && picks[m.id])
    .map((m) => ({ m, pick: picks[m.id], pts: score(picks[m.id], m.result!) }));

  const total = graded.reduce((n, g) => n + g.pts, 0);
  const exact = graded.filter((g) => g.pts === 3).length;
  const hit = graded.filter((g) => g.pts > 0).length;

  return (
    <div className="ui-page ui-night">
      <h1 className="ui-title">승부예측</h1>

      {open.length === 0 && <div className="ui-glasscard glass cap">예측할 경기가 없어요</div>}

      {open.map((m) => {
        const mine = picks[m.id];
        const options = pickOptions(m.bo);
        const row = (win: boolean) => (
          <div className="ui-pickrow">
            {m.bo > 1 && <span>{win ? 'HLE 승' : `${m.opponentCode} 승`}</span>}
            <div>
              {options
                .filter((p) => p[0] > p[1] === win)
                .sort((x, y) => (win ? y[0] - y[1] - (x[0] - x[1]) : x[0] - x[1] - (y[0] - y[1])))
                .map((p) => {
                  const on = !!mine && mine[0] === p[0] && mine[1] === p[1];
                  return (
                    <button
                      key={p.join('-')}
                      className={`ui-pick glass${on ? (win ? ' on' : ' on lose') : ''}`}
                      aria-pressed={on}
                      onClick={() => void choose(m, p)}
                    >
                      {m.bo === 1 ? (win ? 'HLE 승' : `${m.opponentCode} 승`) : `${p[0]} : ${p[1]}`}
                    </button>
                  );
                })}
            </div>
          </div>
        );
        return (
          <section className="ui-predict-card" key={m.id}>
            <div className="ui-predict-top">
              <TeamLogo image={m.usImage} size={52} label="한화생명e스포츠" />
              <span>vs</span>
              <TeamLogo image={m.opponentImage} size={52} label={m.opponent} />
              <div>
                <b>{m.bo === 1 ? '누가 이길까요?' : '몇 대 몇으로 끝날까요?'}</b>
                <span>
                  {fmtDate(m.startTime)} · {m.stage} · BO{m.bo}
                </span>
              </div>
            </div>
            {row(true)}
            {row(false)}
            {mine && <p className="ui-sub-cap">내 예측 {mine[0]} : {mine[1]}</p>}
            {user && mine && <TallyBars key={synced} matchId={m.id} bo={m.bo} opponentCode={m.opponentCode} />}
          </section>
        );
      })}

      <h2 className="ui-night-h">내 기록</h2>
      {graded.length > 0 && (
        <div className="ui-stats">
          {(
            [
              ['누적 점수', `${total}점`],
              ['적중', `${hit} / ${graded.length}`],
              ['정확히', `${exact}회`],
            ] as const
          ).map(([k, v]) => (
            <div className="glass" key={k}>
              <span>{k}</span>
              <b>{v}</b>
            </div>
          ))}
        </div>
      )}
      {graded.length === 0 ? (
        <div className="ui-glasscard glass cap">아직 결과가 나온 예측이 없어요</div>
      ) : (
        <div className="ui-glasscard glass ui-list">
          {graded
            .sort((x, y) => y.m.startTime.localeCompare(x.m.startTime))
            .map(({ m, pick, pts }) => (
              <div className="ui-line" key={m.id}>
                <TeamLogo image={m.opponentImage} size={40} label={m.opponent} />
                <div>
                  <b>
                    {fmtDate(m.startTime)} vs {m.opponentCode} · 결과 {m.result![0]}:{m.result![1]}
                  </b>
                  <span className="cap">
                    내 예측 {pick[0]}:{pick[1]}
                  </span>
                </div>
                <span className={`ui-pts${pts ? ' hit' : ''}`}>{pts === 3 ? '+3 정확' : pts === 1 ? '+1 승패' : '빗나감'}</span>
              </div>
            ))}
        </div>
      )}

    </div>
  );
}

'use client';

import { useState } from 'react';
import { fmtDate } from '@/lib/format';
import { patchState, toast, useDemo } from '@/lib/useDemoState';

const PICKS: [number, number][] = [
  [2, 0],
  [2, 1],
  [1, 2],
  [0, 2],
];

type Rank = { n: string; hit: number; pt: number; me?: boolean };

const BASE_RANKS: Rank[] = [
  { n: '예측머신', hit: 11, pt: 1420 },
  { n: '불꽃징크스', hit: 9, pt: 1180 },
  { n: '상암주민', hit: 8, pt: 1010 },
  { n: '짤장인', hit: 6, pt: 770 },
  { n: '분석충', hit: 5, pt: 640 },
];

export default function PredictView({
  opponent,
  kickoff,
}: {
  opponent: string | null;
  kickoff: string | null;
}) {
  const { pred, predSubmitted } = useDemo();
  const [local, setLocal] = useState<number | null>(null);
  const picked = local ?? pred;

  const ranks: Rank[] = predSubmitted ? [...BASE_RANKS, { n: '데모유저', hit: 0, pt: 0, me: true }] : BASE_RANKS;

  return (
    <div className="wrap sec">
      <h2 className="ko ptitle">승부예측</h2>
      <p className="lede" style={{ marginTop: 10 }}>
        세트 스코어를 맞히면 포인트가 적립되고 주간 랭킹에 반영됩니다.
      </p>

      <div className="card" style={{ marginTop: 'var(--s5)' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
            marginBottom: 'var(--s3)',
          }}
        >
          <b style={{ fontSize: 16 }}>HLE vs {opponent ?? '상대 미정'}</b>
          <span className="cap">{kickoff ? `마감 ${fmtDate(kickoff)}` : '예정 경기 없음'}</span>
        </div>

        <div className="picks">
          {PICKS.map(([a, b], i) => (
            <button key={i} className={`pick${picked === i ? ' on' : ''}`} onClick={() => setLocal(i)}>
              <b>
                {a} : {b}
              </b>
              <span>{a > b ? '승리' : '패배'}</span>
            </button>
          ))}
        </div>

        <button
          className="btn btn-primary btn-block"
          disabled={picked === null}
          onClick={() => {
            if (picked === null) return;
            patchState({ pred: picked, predSubmitted: true });
            toast(
              '예측이 접수됐어요',
              `${PICKS[picked][0]} : ${PICKS[picked][1]} · 경기 종료 후 자동 채점됩니다.`,
            );
          }}
        >
          예측 제출
        </button>

        {predSubmitted && pred !== null && (
          <div className="banner" style={{ marginTop: 'var(--s4)' }}>
            <div>
              <b>예측 완료</b>
              <span>
                {PICKS[pred][0]} : {PICKS[pred][1]} 로 예측했습니다. 경기 종료 후 결과가 반영됩니다.
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="shead" style={{ marginTop: 'var(--s7)' }}>
        <h2 className="ko">주간 랭킹</h2>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>닉네임</th>
              <th>적중</th>
              <th>포인트</th>
            </tr>
          </thead>
          <tbody>
            {ranks.map((r, i) => (
              <tr key={r.n} className={r.me ? 'me' : undefined}>
                <td>{i + 1}</td>
                <td>{r.n}</td>
                <td>{r.hit}회</td>
                <td>{r.pt.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="note">
        포인트는 사이트 내 뱃지·프로필 테마로만 소진됩니다. 현금성 보상은 두지 않습니다(사행성 이슈 회피).
      </div>
    </div>
  );
}

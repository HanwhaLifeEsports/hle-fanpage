'use client';

import Link from 'next/link';
import { useNotify } from '@/lib/useAppState';

/**
 * 커뮤니티는 계정 서버(로그인 · DB · 신고 처리)가 붙어야 열 수 있다.
 * 가짜 글로 채워두는 대신 상태를 그대로 밝히고, 지금 할 수 있는 행동으로 보낸다.
 */
export default function BoardView({ nextKickoff }: { nextKickoff: string | null }) {
  const { permission, ask } = useNotify();

  return (
    <div className="wrap sec">
      <h2 className="ko ptitle rv">커뮤니티</h2>


      <div className="empty rv">
        <b>커뮤니티 준비 중</b>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 'var(--s4)' }}>
          <button className="btn btn-primary btn-sm" onClick={ask}>
            {permission === 'granted' ? '알림 켜짐' : '알림 권한 설정'}
          </button>
          <Link className="btn btn-ghost btn-sm" href="/schedule">
            일정 보러 가기
          </Link>
        </div>
      </div>

      <div className="shead rv">
        <h2 className="ko">그때까지는</h2>
      </div>
      <div className="g3 rv">
        <Link className="card linkcard rv" href="/roster">
          <b>선수단</b>

        </Link>
        <Link className="card linkcard rv" href="/predict">
          <b>승부예측</b>

        </Link>
        <Link className="card linkcard rv" href="/">
          <b>중계 보기</b>
          <span>
            {nextKickoff
              ? `다음 경기 ${new Date(nextKickoff).toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' })}`
              : '중계 대기'}
          </span>
        </Link>
      </div>
    </div>
  );
}

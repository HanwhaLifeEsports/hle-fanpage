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
      <h2 className="ko ptitle">커뮤니티</h2>
      <p className="lede" style={{ margin: '10px 0 var(--s6)' }}>
        경기 후기 · 짤 · 직관 모임 게시판과 경기 시간에만 열리는 실시간 응원 채팅을 준비하고 있습니다.
      </p>

      <div className="empty">
        <b>계정 기능이 준비되면 문을 엽니다</b>
        <span>
          글쓰기와 채팅에는 로그인이 필요하고, 로그인에는 신고 처리와 개인정보 보관 체계가 먼저 갖춰져야 합니다.
          준비 없이 열면 관리되지 않는 공간이 되기 때문에 순서를 지키고 있습니다.
        </span>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 'var(--s4)' }}>
          <button className="btn btn-primary btn-sm" onClick={ask}>
            {permission === 'granted' ? '알림 켜짐' : '열리면 알림 받기'}
          </button>
          <Link className="btn btn-ghost btn-sm" href="/schedule">
            일정 보러 가기
          </Link>
        </div>
      </div>

      <div className="shead">
        <h2 className="ko">그때까지는</h2>
      </div>
      <div className="g3">
        <Link className="card linkcard" href="/scenarios">
          <b>플레이오프 경우의 수</b>
          <span>남은 경기를 전부 전개해 순위 확률과 경기별 영향력을 계산합니다.</span>
        </Link>
        <Link className="card linkcard" href="/predict">
          <b>승부예측</b>
          <span>세트 스코어를 찍어두면 경기가 끝날 때 실제 결과로 자동 채점됩니다.</span>
        </Link>
        <Link className="card linkcard" href="/">
          <b>중계 보기</b>
          <span>
            {nextKickoff
              ? `다음 경기 ${new Date(nextKickoff).toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' })}`
              : '치지직·SOOP 송출 상태를 실시간으로 확인합니다.'}
          </span>
        </Link>
      </div>
    </div>
  );
}

import type { Metadata } from 'next';

export const metadata: Metadata = { title: '오프라인' };

export default function Offline() {
  return (
    <div className="wrap sec">
      <h2 className="ko ptitle rv">연결이 끊겼습니다</h2>
      <p className="lede rv" style={{ marginTop: 10 }}>
        네트워크 연결 후 새로고침해 주세요.
      </p>
    </div>
  );
}

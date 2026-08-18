import type { Metadata } from 'next';

export const metadata: Metadata = { title: '오프라인' };

export default function Offline() {
  return (
    <div className="wrap sec">
      <h2 className="ko ptitle rv">연결이 끊겼습니다</h2>
      <p className="lede rv" style={{ marginTop: 10 }}>
        순위와 일정은 실시간으로 가져오기 때문에 네트워크가 필요합니다. 연결이 돌아오면 새로고침해 주세요.
      </p>
    </div>
  );
}

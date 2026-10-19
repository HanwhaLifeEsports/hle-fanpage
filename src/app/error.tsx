'use client';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="wrap sec">
      <h2 className="ko ptitle">화면을 그리지 못했습니다</h2>
      <p className="lede" style={{ margin: '10px 0 var(--s5)' }}>
        다시 시도해 주세요.
      </p>
      <button className="btn btn-primary" onClick={reset}>
        다시 시도
      </button>
    </div>
  );
}

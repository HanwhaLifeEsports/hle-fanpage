import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="wrap sec">
      <h2 className="ko ptitle">없는 페이지입니다</h2>
      <p className="lede" style={{ margin: '10px 0 var(--s5)' }}>
        주소가 바뀌었거나 삭제된 페이지입니다.
      </p>
      <Link className="btn btn-primary" href="/">
        홈으로
      </Link>
    </div>
  );
}

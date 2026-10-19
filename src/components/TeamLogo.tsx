/**
 * 공식 팀 로고. 어두운 원 받침 위에 여백을 잘라낸 로고를 가운데 둔다 (/api/logo).
 * 서버·클라이언트 어디서든 쓸 수 있게 훅을 쓰지 않는다.
 */
export const logoSrc = (image?: string | null) => (image ? `/api/logo?u=${encodeURIComponent(image)}` : null);

export default function TeamLogo({ image, size = 56, label }: { image?: string | null; size?: number; label?: string }) {
  const src = logoSrc(image);
  return (
    <span className="lg" style={{ width: size, height: size }} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      {/* eslint-disable-next-line @next/next/no-img-element -- 이미 잘라 캐시한 작은 PNG 라 next/image 최적화가 필요 없다 */}
      {src && <img src={src} alt="" loading="lazy" decoding="async" />}
    </span>
  );
}

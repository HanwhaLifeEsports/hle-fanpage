import sharp from 'sharp';

/**
 * 공식 팀·리그 로고를 받아 투명 여백을 잘라 돌려준다.
 *
 * LoL Esports 가 주는 로고 파일은 캔버스 안 여백이 위아래로 고르지 않아서
 * (HLE 는 위쪽이 비어 있다) 원 안 정가운데에 넣어도 위로 쏠려 보인다.
 * iOS 앱(LogoStore)과 같은 방식으로 실제 그림 영역만 남긴다. 색·형태는 건드리지 않는다.
 *
 * 아무 주소나 받으면 열린 프록시가 되므로 LoL Esports 이미지 호스트만 허용한다.
 */

const ALLOWED = new Set(['static.lolesports.com', 'am-a.akamaihd.net']);
const cache = new Map<string, Buffer>();

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get('u') ?? '';
  let src: URL;
  try {
    src = new URL(raw.replace(/^http:\/\//, 'https://'));
  } catch {
    return new Response('bad url', { status: 400 });
  }
  if (src.protocol !== 'https:' || !ALLOWED.has(src.hostname)) return new Response('host not allowed', { status: 400 });

  const key = src.toString();
  let png = cache.get(key);
  if (!png) {
    const res = await fetch(key, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return new Response('upstream', { status: 502 });
    const input = Buffer.from(await res.arrayBuffer());
    png = await sharp(input)
      .trim({ threshold: 10 })
      .resize(256, 256, { fit: 'inside', withoutEnlargement: true })
      .png()
      .toBuffer()
      .catch(() => input);
    if (cache.size > 200) cache.clear();
    cache.set(key, png);
  }
  return new Response(new Uint8Array(png), {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=604800, immutable' },
  });
}

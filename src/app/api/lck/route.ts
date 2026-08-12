import { getSeason } from '@/lib/season';

/**
 * 시즌 데이터 엔드포인트.
 * 클라이언트 컴포넌트가 쓰고, 서버 컴포넌트는 getSeason() 을 직접 호출한다.
 */
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const force = new URL(request.url).searchParams.get('refresh') === '1';
  try {
    const bundle = await getSeason(force);
    return Response.json(bundle, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : 'unknown' },
      { status: 502, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

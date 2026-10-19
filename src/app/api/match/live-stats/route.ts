import { findLiveHleMatch, getMatchSnapshot } from '@/lib/lolesports-live';

export const dynamic = 'force-dynamic';

/** A single cached server-side esports data source for every visitor. */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const matchId = params.get('matchId');
  const game = params.get('game');
  if (matchId && !/^\d{10,22}$/.test(matchId)) {
    return Response.json({ error: '잘못된 경기 ID' }, { status: 400 });
  }
  if (game && (!/^\d{1,2}$/.test(game) || Number(game) < 1 || Number(game) > 5)) {
    return Response.json({ error: '잘못된 세트 번호' }, { status: 400 });
  }
  try {
    const id = matchId || (await findLiveHleMatch());
    if (!id) return Response.json({ match: null }, { headers: { 'Cache-Control': 'no-store' } });
    const match = await getMatchSnapshot(id, game ? Number(game) : undefined);
    return Response.json({ match }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return Response.json(
      { match: null, error: e instanceof Error ? e.message : '경기 데이터를 불러올 수 없습니다' },
      { status: 502, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

import type { ChzzkChannel } from '@/lib/chzzk';

/** 채널 이름으로 검색. URL 을 모를 때 이름만으로 추가할 수 있게 한다. */
export const dynamic = 'force-dynamic';

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get('q')?.trim();
  if (!q) return Response.json({ channels: [] as ChzzkChannel[] });

  try {
    const res = await fetch(
      `https://api.chzzk.naver.com/service/v1/search/channels?keyword=${encodeURIComponent(q)}&size=8`,
      { headers: { 'User-Agent': UA, Accept: 'application/json' }, cache: 'no-store', signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) return Response.json({ channels: [], error: `HTTP ${res.status}` });
    const data = (await res.json())?.content?.data ?? [];
    const channels: ChzzkChannel[] = data.map(
      (d: { channel: { channelId: string; channelName: string; channelImageUrl?: string; followerCount?: number; openLive?: boolean } }) => ({
        channelId: d.channel.channelId,
        channelName: d.channel.channelName,
        channelImageUrl: d.channel.channelImageUrl ?? null,
        followerCount: d.channel.followerCount,
        openLive: d.channel.openLive,
      }),
    );
    return Response.json({ channels }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return Response.json({ channels: [], error: e instanceof Error ? e.message : 'unknown' });
  }
}

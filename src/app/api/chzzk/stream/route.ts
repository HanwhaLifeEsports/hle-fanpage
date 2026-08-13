import { CHANNELS } from '@/lib/lck2026';
import { isChannelId, type ChzzkStream } from '@/lib/chzzk';

/**
 * 치지직 라이브의 HLS 주소를 넘겨준다.
 *
 * 치지직에는 라이브용 iframe 임베드 라우트가 없다(클립만 있다). 대신 재생 정보를
 * 그대로 공개하고 있어서 자체 플레이어로 트는 길이 열려 있다. 실측 결과:
 *   playbackAuthType: "NONE" · DRM 없음
 *   m3u8 마스터 · 청크리스트 · 세그먼트 전 구간에서 CORS 가 요청 Origin 을 허용
 * 즉 브라우저의 hls.js 가 직접 붙을 수 있다.
 *
 * live-detail API 자체는 CORS 가 막혀 있어 이 라우트가 중간에 선다.
 * ?channel= 로 임의 채널을 지정할 수 있고, 없으면 LCK 채널이다.
 */

export const dynamic = 'force-dynamic';

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get('channel')?.trim().toLowerCase();
  // 경로에 그대로 들어가는 값이라 형식을 통과한 것만 쓴다
  const id = q && isChannelId(q) ? q : CHANNELS.chzzk;
  const channelUrl = `https://chzzk.naver.com/live/${id}`;

  const off = (reason: string): Response =>
    Response.json({ channelId: id, live: false, hls: null, channelUrl, reason } satisfies ChzzkStream, {
      headers: { 'Cache-Control': 'no-store' },
    });

  try {
    const res = await fetch(`https://api.chzzk.naver.com/service/v3/channels/${id}/live-detail`, {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return off(`HTTP ${res.status}`);

    const c = (await res.json())?.content;
    if (!c) return off('채널을 찾지 못했습니다');
    const channelName: string | undefined = c.channel?.channelName;
    if (c.status !== 'OPEN') return off('방송 중이 아닙니다');
    // 성인 인증·유료 방송은 우리가 대신 통과시킬 수 없다 — 채널로 보낸다
    if (c.adult || c.paidProduct) return off('채널에서 시청해야 하는 방송입니다');

    const pb = c.livePlaybackJson ? JSON.parse(c.livePlaybackJson) : null;
    const hls: string | null =
      pb?.media?.find((m: { mediaId?: string }) => m.mediaId === 'HLS')?.path ??
      pb?.media?.find((m: { protocol?: string }) => m.protocol === 'HLS')?.path ??
      null;
    if (!hls) return off('재생 주소를 찾지 못했습니다');

    return Response.json(
      {
        channelId: id,
        channelName,
        live: true,
        title: c.liveTitle ?? undefined,
        viewers: c.concurrentUserCount ?? undefined,
        category: c.liveCategoryValue ?? undefined,
        hls,
        channelUrl,
      } satisfies ChzzkStream,
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e) {
    return off(e instanceof Error ? e.message : 'unknown');
  }
}

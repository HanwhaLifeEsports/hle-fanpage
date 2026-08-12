import { CHANNELS } from '@/lib/lck2026';

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
 */

export const dynamic = 'force-dynamic';

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

export interface ChzzkStream {
  live: boolean;
  title?: string;
  viewers?: number;
  category?: string;
  /** HLS 마스터 플레이리스트. 방송 중이 아니면 null */
  hls: string | null;
  channelUrl: string;
  reason?: string;
}

export async function GET() {
  const channelUrl = `https://chzzk.naver.com/live/${CHANNELS.chzzk}`;
  const off = (reason: string, extra: Partial<ChzzkStream> = {}): Response =>
    Response.json({ live: false, hls: null, channelUrl, reason, ...extra } satisfies ChzzkStream, {
      headers: { 'Cache-Control': 'no-store' },
    });

  try {
    const res = await fetch(
      `https://api.chzzk.naver.com/service/v3/channels/${CHANNELS.chzzk}/live-detail`,
      { headers: { 'User-Agent': UA, Accept: 'application/json' }, cache: 'no-store', signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) return off(`HTTP ${res.status}`);

    const c = (await res.json())?.content;
    if (!c || c.status !== 'OPEN') return off('방송 중이 아닙니다');
    // 성인 인증이나 유료 방송은 우리가 대신 통과시킬 수 없다 — 채널로 보낸다
    if (c.adult || c.paidProduct) return off('채널에서 시청해야 하는 방송입니다');

    const pb = c.livePlaybackJson ? JSON.parse(c.livePlaybackJson) : null;
    const hls: string | null =
      pb?.media?.find((m: { mediaId?: string }) => m.mediaId === 'HLS')?.path ??
      pb?.media?.find((m: { protocol?: string }) => m.protocol === 'HLS')?.path ??
      null;
    if (!hls) return off('재생 주소를 찾지 못했습니다');

    return Response.json(
      {
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

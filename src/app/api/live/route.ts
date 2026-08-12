import { CHANNELS, PLATFORMS, broadcastsFor, type BroadcastSlot } from '@/lib/lck2026';
import { getSeason, inLiveWindow } from '@/lib/season';
import type { MatchRow } from '@/lib/lolesports';
import type { LiveResponse, LiveSource } from '@/lib/live-types';

/**
 * 라이브 감지 API
 *
 * 왜 서버가 필요한가:
 *   치지직 API는 브라우저 Origin 헤더가 붙으면 403을 돌려준다 (CORS 차단).
 *   SOOP station API도 마찬가지. 그래서 서버에서 프록시로 폴링한다.
 *
 * 플랫폼별 판정 가능 여부:
 *   치지직  — polling/v2/.../live-status 로 실제 판정 O
 *   SOOP    — chapi station 의 broad 필드로 실제 판정 O (방송번호까지 받아옴)
 *   YouTube — Data API 키가 있어야 판정 가능. 대신 live_stream 임베드가 스스로
 *             라이브를 찾아가므로 판정 없이 붙인다.
 *   Disney+ — 판정도 임베드도 불가. 딥링크만.
 */

export const dynamic = 'force-dynamic';

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

async function json(url: string, init?: RequestInit) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'application/json' },
    signal: AbortSignal.timeout(6000),
    cache: 'no-store',
    ...init,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function checkChzzk(slot: BroadcastSlot): Promise<LiveSource> {
  const p = PLATFORMS.chzzk;
  const base: LiveSource = {
    platform: 'chzzk',
    name: p.name,
    role: slot.role,
    color: p.color,
    detectable: true,
    embeddable: false, // 라이브 임베드 라우트가 없다 — 딥링크로만 연결
    live: false,
    channelUrl: p.channelUrl,
    note: p.note,
  };
  try {
    const d = await json(
      `https://api.chzzk.naver.com/polling/v2/channels/${CHANNELS.chzzk}/live-status`,
    );
    const c = d?.content ?? {};
    return {
      ...base,
      live: c.status === 'OPEN',
      title: c.liveTitle ?? undefined,
      viewers: c.concurrentUserCount ?? undefined,
      category: c.liveCategoryValue ?? undefined,
    };
  } catch (e) {
    return { ...base, error: e instanceof Error ? e.message : 'unknown' };
  }
}

async function checkSoop(slot: BroadcastSlot): Promise<LiveSource> {
  const p = PLATFORMS.soop;
  const base: LiveSource = {
    platform: 'soop',
    name: p.name,
    role: slot.role,
    color: p.color,
    detectable: true,
    embeddable: true,
    live: false,
    channelUrl: p.channelUrl,
    embedUrl: `https://play.sooplive.co.kr/${CHANNELS.soop}/embed`,
  };
  try {
    const d = await json(`https://chapi.sooplive.co.kr/api/${CHANNELS.soop}/station`);
    const broad = d?.broad;
    if (!broad) return base;
    return {
      ...base,
      live: true,
      title: broad.broad_title ?? undefined,
      viewers: broad.current_sum_viewer ?? undefined,
      // 방송 중일 때는 방송번호를 붙여야 해당 방송으로 바로 들어간다
      embedUrl: `https://play.sooplive.co.kr/${CHANNELS.soop}/${broad.broad_no}/embed`,
    };
  } catch (e) {
    return { ...base, error: e instanceof Error ? e.message : 'unknown' };
  }
}

function youtubeSource(slot: BroadcastSlot): LiveSource {
  const p = PLATFORMS.youtube;
  const isLiveSlot = slot.role === '생중계';
  return {
    platform: 'youtube',
    name: p.name,
    role: slot.role,
    color: p.color,
    detectable: false, // Data API 키가 있어야 판정 가능
    // 국내 LCK 정규시즌엔 유튜브 생중계가 없다 → 다시보기 링크로만 붙인다.
    // 국제 대회에선 live_stream 임베드가 스스로 라이브를 찾아간다.
    embeddable: isLiveSlot,
    live: false,
    channelUrl: p.channelUrl,
    embedUrl: isLiveSlot
      ? `https://www.youtube.com/embed/live_stream?channel=${CHANNELS.youtube}`
      : undefined,
    note: p.note,
  };
}

function disneySource(slot: BroadcastSlot): LiveSource {
  const p = PLATFORMS.disney;
  return {
    platform: 'disney',
    name: p.name,
    role: slot.role,
    color: p.color,
    detectable: false,
    embeddable: false, // ← 임베드 불가. UI는 딥링크 버튼으로 렌더한다
    live: false,
    channelUrl: p.channelUrl,
    note: p.note,
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  // 개발/데모용 강제 라이브. 방송 없는 시간대에도 UI를 확인하려고 둔 스위치.
  const forced = url.searchParams.get('force') === '1';

  const now = Date.now();
  let windowMatch: MatchRow | null = null;
  let nextKickoff: string | null = null;
  try {
    const b = await getSeason();
    windowMatch = inLiveWindow(b.season.matches, now);
    nextKickoff = b.next?.startTime ?? null;
  } catch {
    // 시즌 데이터를 못 가져와도 중계 채널 자체는 안내할 수 있어야 한다
  }
  // LCK 국내 정규시즌 기준. 국제 대회 일정이 섞이면 여기서 분기한다.
  const slots = broadcastsFor('lck');

  const results = await Promise.all(
    slots.map((slot) => {
      if (slot.platform === 'chzzk') return checkChzzk(slot);
      if (slot.platform === 'soop') return checkSoop(slot);
      if (slot.platform === 'youtube') return Promise.resolve(youtubeSource(slot));
      return Promise.resolve(disneySource(slot));
    }),
  );

  const sources = forced
    ? results.map((s) =>
        s.detectable ? { ...s, live: true, forcedOnly: !s.live, title: s.title ?? '데모 강제 LIVE' } : s,
      )
    : results;

  const body: LiveResponse = {
    checkedAt: new Date().toISOString(),
    window: windowMatch
      ? {
          matchId: windowMatch.id,
          opponent: `${windowMatch.a.code} vs ${windowMatch.b.code}`,
          kickoff: windowMatch.startTime,
        }
      : null,
    isLive: sources.some((s) => s.detectable && s.live),
    forced,
    sources,
    nextKickoff,
  };

  return Response.json(body, {
    headers: { 'Cache-Control': 'no-store' },
  });
}

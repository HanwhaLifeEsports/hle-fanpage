/** 치지직 채널 ID 는 32자리 소문자 16진수다. 경로에 그대로 들어가므로 반드시 검증한다. */
export const CHANNEL_ID = /^[0-9a-f]{32}$/;

export function isChannelId(v: string): boolean {
  return CHANNEL_ID.test(v.trim().toLowerCase());
}

/**
 * 사용자가 붙여넣는 형태를 전부 받아준다.
 *   https://chzzk.naver.com/live/{id}
 *   https://chzzk.naver.com/{id}
 *   chzzk.naver.com/live/{id}?...
 *   {id}
 * 채널 ID 를 못 찾으면 null — 그 경우 검색어로 취급한다.
 */
export function parseChannelId(input: string): string | null {
  const s = input.trim().toLowerCase();
  if (isChannelId(s)) return s;
  const m = s.match(/chzzk\.naver\.com\/(?:live\/)?([0-9a-f]{32})/);
  return m ? m[1] : null;
}

export interface ChzzkChannel {
  channelId: string;
  channelName: string;
  channelImageUrl: string | null;
  followerCount?: number;
  openLive?: boolean;
}

export interface ChzzkStream {
  channelId: string;
  channelName?: string;
  live: boolean;
  title?: string;
  viewers?: number;
  category?: string;
  /** HLS 마스터 플레이리스트. 방송 중이 아니면 null */
  hls: string | null;
  channelUrl: string;
  reason?: string;
}

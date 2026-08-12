import type { PlatformId, SlotRole } from './lck2026';

export interface LiveSource {
  platform: PlatformId;
  name: string;
  /** 이 채널이 생중계인지 다시보기 전용인지 */
  role: SlotRole;
  color: string;
  /** 서버가 실제 방송 여부를 판정할 수 있는가 */
  detectable: boolean;
  /** iframe 플레이어 삽입이 가능한가 */
  embeddable: boolean;
  live: boolean;
  title?: string;
  viewers?: number;
  category?: string;
  embedUrl?: string;
  channelUrl: string;
  note?: string;
  error?: string;
}

export interface LiveResponse {
  checkedAt: string;
  window: { matchId: string; opponent: string; kickoff: string } | null;
  isLive: boolean;
  sources: LiveSource[];
  nextKickoff: string | null;
}

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
  /** 강제 LIVE 스위치로만 켜진 상태 — 실제 송출은 없다 */
  forcedOnly?: boolean;
  error?: string;
}

export interface LiveResponse {
  checkedAt: string;
  window: { matchId: string; opponent: string; kickoff: string } | null;
  isLive: boolean;
  forced: boolean;
  sources: LiveSource[];
  nextKickoff: string | null;
}

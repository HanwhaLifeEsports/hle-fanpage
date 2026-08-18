/**
 * 팬 사진 — 타입과 저장 계층의 경계.
 *
 * 운영자 사진(lck2026.ts 의 PlayerPhoto)과 일부러 분리했다. 성격이 다르기 때문이다.
 *  - 운영자 사진은 코드에 박혀 있고, 출처를 타입으로 강제하며, 배포 전에 검증된다
 *  - 팬 사진은 런타임 데이터고, 검증할 수 없으며, 신고와 삭제의 대상이다
 * 둘을 한 타입에 섞으면 "검증된 사진" 이라는 말의 뜻이 흐려진다.
 */

/** 팬 사진은 4:5 로 저장한다. 인물 사진이 가장 잘 살고, 선수 카드와 같은 비율이다 */
export const FAN_RATIO = 4 / 5;
export const FAN_OUT_W = 900;
export const FAN_OUT_H = 1125;

export interface FanPhoto {
  id: string;
  playerId: string;
  /** 화면에 붙일 주소 */
  url: string;
  width: number;
  height: number;
  /** 누적 하트 수 */
  hearts: number;
  /** 내가 하트를 눌렀는가 — 사람마다 다른 값이라 hearts 와 따로 둔다 */
  mine: boolean;
  /** 내가 올린 사진인가 — 삭제 버튼을 띄울지 판단한다 */
  owned: boolean;
  createdAt: string;
}

/**
 * 저장 계층.
 *
 * 화면은 이 인터페이스만 보고, 뒤가 브라우저인지 Supabase 인지 모른다.
 * 서버를 붙이거나 떼는 일이 화면을 건드리지 않아야 하기 때문이다.
 */
export interface PhotoBackend {
  /**
   * 하트가 사람들 사이에 공유되는가.
   *
   * 브라우저 저장소에서는 내 하트가 곧 전부라 "누적 하트 1위" 가 성립하지 않는다.
   * 화면에서 그 사실을 그대로 말해 주려고 노출한다 — 조용히 반쪽으로 두면
   * 사용자는 자기 하트가 남에게 보인다고 오해한다.
   */
  readonly shared: boolean;
  load(): Promise<FanPhoto[]>;
  add(playerId: string, blob: Blob): Promise<FanPhoto>;
  setHeart(id: string, on: boolean): Promise<void>;
  report(id: string): Promise<void>;
  remove(id: string): Promise<void>;
}

/**
 * 현장 관람 티켓 예매.
 *
 * 예매일은 API 가 주지 않는다. LoL Esports 도 네이버도 티켓 관련 필드가 아예 없다.
 * 대신 LCK 가 규칙으로 공지했다 — 2026-03-20 티켓팅 개편 공지에서 오픈 시점을
 * 경기 시작 48시간 전에서 **216시간(9일) 전**으로 바꿨다. 예매처는 NOL 티켓이다.
 *
 * 그래서 이 값은 '가져온 데이터' 가 아니라 '규칙에서 계산한 값' 이다. 두 가지가
 * 따라온다.
 *  - 규칙이 또 바뀌면 화면이 조용히 틀린다. 상수를 한 곳에 두고 출처를 적어 둔다
 *  - 플레이오프·결승은 따로 공지되는 경우가 있다. 시각을 단정하는 대신 예매처
 *    링크를 늘 함께 두어 사용자가 직접 확인할 수 있게 한다
 *
 * 예매를 놓치면 되돌릴 수 없는 종류의 정보라, 확실하지 않은 것을 확실한 것처럼
 * 보이게 하지 않는 편이 중요하다.
 */

/** 경기 시작 216시간(9일) 전에 열린다 (2026-03-20 LCK 티켓팅 개편 공지) */
export const TICKET_LEAD_HOURS = 216;

/** 취소표가 풀리는 시각. 경기 전날까지 매일 이 시각이다 */
export const CANCEL_HOUR_KST = 15;

export const TICKET_URL = 'https://nol.yanolja.com/ticket/genre/sports/lck';

/**
 * 좁은 화면에서 여는 예매처.
 *
 * 화면 폭으로 고른다. 기기 종류를 정확히 알 수는 없지만, 이 링크를 누르는 사람이
 * 실제로 겪는 것은 '지금 이 화면에서 예매가 되는가' 이므로 폭이 맞는 기준이다.
 *
 * 두 주소가 서로 다른 예매처라는 점은 알고 있다. 폭에 따라 다른 곳으로 보내면
 * 같은 경기를 두 사람이 다른 창구에서 찾게 된다.
 */
export const TICKET_URL_MOBILE = 'https://tickets.interpark.com/search?keyword=lck';
export const TICKET_SELLER = 'NOL 티켓';

export type TicketPhase =
  /** 아직 안 열림 */
  | 'before'
  /** 열려 있음 (경기 전) */
  | 'open'
  /** 경기가 시작했거나 끝남 */
  | 'past';

export interface TicketInfo {
  openAt: Date;
  phase: TicketPhase;
  /** 예매 시작까지 남은 날 수. 이미 열렸으면 null */
  dday: number | null;
  /**
   * 다음 취소표 시각. 경기 당일이거나 더 남은 회차가 없으면 null.
   *
   * 경기 당일은 시각이 앞당겨지기도 해서 값을 만들지 않는다. 15:00 이라고 적어
   * 두면 그보다 일찍 풀린 표를 놓친다.
   */
  cancelAt: Date | null;
  /** 오늘이 경기 날인가 */
  matchDay: boolean;
}

/**
 * 한국 시간 기준으로 며칠째인가.
 *
 * 남은 '시간' 이 아니라 남은 '날' 을 세야 D-3 이 말이 된다. 24시간 단위로 세면
 * 오늘 밤에 열리는 예매가 D-0 이 아니라 D-1 로 나오는 일이 생긴다.
 * 서버가 어느 시간대에 있든 같은 답이 나오도록 UTC 에 9시간을 더해 계산한다.
 */
const KST = 9 * 3600_000;
const DAY = 86400_000;
const kstDay = (ms: number) => Math.floor((ms + KST) / DAY);

/** 그 날(한국 시간) 15:00 의 실제 시각 */
const cancelSlot = (dayIndex: number) => dayIndex * DAY - KST + CANCEL_HOUR_KST * 3600_000;

export function ticketInfo(startTime: string, now: number = Date.now()): TicketInfo {
  const start = new Date(startTime).getTime();
  const openAt = new Date(start - TICKET_LEAD_HOURS * 3600_000);
  const open = openAt.getTime();
  const matchDay = kstDay(now) === kstDay(start);

  if (now >= start) return { openAt, phase: 'past', dday: null, cancelAt: null, matchDay };
  if (now < open) {
    return { openAt, phase: 'before', dday: kstDay(open) - kstDay(now), cancelAt: null, matchDay };
  }

  // 예매가 열린 뒤. 경기 전날까지 매일 15:00 에 취소표가 나온다
  let cancelAt: Date | null = null;
  if (!matchDay) {
    const today = cancelSlot(kstDay(now));
    const next = now < today ? today : cancelSlot(kstDay(now) + 1);
    // 경기 시작을 넘어가는 회차는 없다
    if (next < start) cancelAt = new Date(next);
  }
  return { openAt, phase: 'open', dday: null, cancelAt, matchDay };
}

/**
 * 공식이 따로 공지한 예매 일정.
 *
 * 216시간 규칙은 정규 경기의 것이다. 결승 주간은 LCK 가 날짜와 시각을 직접
 * 공지하고, 1차 · 2차로 나눠 두 번 연다. 규칙으로 계산하면 둘 다 틀린다 —
 * 결승전 216시간 전은 9월 4일인데 실제 1차 오픈은 8월 28일이다. 일주일 차이다.
 *
 * 그래서 이 두 경기만 계산을 끄고 공지 값을 쓴다. 나머지는 그대로 규칙을 따른다.
 *
 * 출처: LCK 공식 'FINALS TICKET INFO' (2026-08). 장소 KSPO DOME, 예매처 NOL.
 * 손으로 옮긴 값이라 공지가 바뀌면 여기도 고쳐야 한다.
 */
const ANNOUNCED_SALES: Record<string, string[]> = {
  // 결승 진출전
  lower_bracket_finals: ['2026-08-27T14:00:00+09:00', '2026-09-07T14:00:00+09:00'],
  // Grand Finals
  finals: ['2026-08-28T14:00:00+09:00', '2026-09-08T14:00:00+09:00'],
};

export interface SaleRound {
  /** "1차" · "2차" */
  label: string;
  at: Date;
  /** 이미 열렸는가 */
  past: boolean;
  /** 남은 날. 이미 열렸으면 null */
  dday: number | null;
}

/**
 * 그 칸에 공지된 예매 회차. 없으면 null 이고, 그때는 216시간 규칙을 쓴다.
 *
 * 지난 회차도 지우지 않고 '오픈' 으로 남긴다. 1차를 놓친 사람에게 2차가 언제인지
 * 알려주려면 둘이 나란히 있어야 하고, 1차가 사라지면 2차가 유일한 기회처럼 보인다.
 */
export function announcedSales(cellSlug: string | undefined, now: number = Date.now()): SaleRound[] | null {
  const list = cellSlug ? ANNOUNCED_SALES[cellSlug] : undefined;
  if (!list) return null;
  return list.map((iso, i) => {
    const at = new Date(iso);
    const past = now >= at.getTime();
    return { label: `${i + 1}차`, at, past, dday: past ? null : kstDay(at.getTime()) - kstDay(now) };
  });
}

/** "D-3" · "오늘 오픈" */
export function ddayLabel(dday: number): string {
  return dday <= 0 ? '오늘 오픈' : `D-${dday}`;
}

/** "오늘 15:00" · "내일 15:00" */
export function cancelLabel(at: Date, now: number = Date.now()): string {
  const gap = kstDay(at.getTime()) - kstDay(now);
  const hh = `${CANCEL_HOUR_KST}:00`;
  return gap <= 0 ? `오늘 ${hh}` : gap === 1 ? `내일 ${hh}` : hh;
}

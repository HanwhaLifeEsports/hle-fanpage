/** 서버·클라 양쪽에서 쓰는 포맷 유틸 ('use client' 경계 밖에 둬야 서버 렌더에서 호출 가능) */
export const pad = (n: number) => String(n).padStart(2, '0');

export function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}.${pad(d.getDate())} (${'일월화수목금토'[d.getDay()]}) ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fmtClock(iso: string) {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/**
 * 계약 만료일 표시. 'YYYY-MM-DD' -> '2027. 11. 15.'
 *
 * 연도를 줄이지 않는다. 계약은 몇 년 뒤 이야기라 '27.11.15' 로 적으면
 * 어느 해인지 한 번 더 생각해야 한다.
 */
export function fmtContract(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${y}. ${Number(m)}. ${Number(d)}.`;
}

/**
 * 한화생명 소속 기간. 'YYYY.M.D ~ YYYY.M.D' 로 짧게 적는다.
 *
 * '계약기간' 이라 부르지 않는다. 시작값은 나무위키의 입단일이라, 재계약을 한
 * 사람은 이 폭이 한 계약이 아니라 팀에 있은 기간 전체다 — 제카는 2022 년
 * 입단이고 지금 계약은 2027 년까지다. '계약' 이라 적으면 5 년짜리 계약이
 * 있었다는 뜻이 된다.
 *
 * 끝을 모르면 열어 둔다. 만료일은 Leaguepedia 에서 오므로 못 가져올 수 있다.
 */
export function fmtSpan(from: string, to?: string | null): string {
  const dot = (iso: string) => iso.split('-').map(Number).join('.');
  return to ? `${dot(from)} ~ ${dot(to)}` : `${dot(from)} ~`;
}

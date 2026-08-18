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
 * 계약 종료일 표시. 'YYYY-MM-DD' -> '2027. 11. 15. 까지'
 *
 * 연도를 줄이지 않는다. 계약은 몇 년 뒤 이야기라 '27.11.15' 로 적으면
 * 어느 해인지 한 번 더 생각해야 한다.
 */
export function fmtContract(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${y}. ${Number(m)}. ${Number(d)}. 까지`;
}

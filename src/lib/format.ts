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

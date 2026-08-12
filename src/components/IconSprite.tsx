/** 키커 라벨에 붙는 아이콘 스프라이트. layout 에서 한 번만 렌더된다. */
export default function IconSprite() {
  return (
    <svg width={0} height={0} style={{ position: 'absolute' }} aria-hidden>
      <defs>
        <symbol id="i-bolt" viewBox="0 0 24 24"><path d="M13 2 4 14h6l-1 8 9-12h-6z" /></symbol>
        <symbol id="i-history" viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 2.6-6.4" /><path d="M3 4v5h5" /><path d="M12 8v4.5l3 1.8" /></symbol>
        <symbol id="i-users" viewBox="0 0 24 24"><path d="M16 20v-1.6a3.4 3.4 0 0 0-3.4-3.4H6.4A3.4 3.4 0 0 0 3 18.4V20" /><circle cx="9.5" cy="8" r="3.4" /><path d="M21 20v-1.6a3.4 3.4 0 0 0-2.6-3.3" /><path d="M15.5 4.8a3.4 3.4 0 0 1 0 6.4" /></symbol>
        <symbol id="i-chat" viewBox="0 0 24 24"><path d="M21 11.6a7.6 7.6 0 0 1-11 6.8L4 20l1.7-5.7A7.6 7.6 0 1 1 21 11.6z" /></symbol>
        <symbol id="i-target" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.4" /></symbol>
        <symbol id="i-calendar" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2.5" /><path d="M3 10h18M8 3v4M16 3v4" /></symbol>
        <symbol id="i-trophy" viewBox="0 0 24 24"><path d="M8 21h8M12 17.5V21M7 4h10v5.5a5 5 0 0 1-10 0z" /><path d="M7 6.5H4.5V8a3 3 0 0 0 2.8 3" /><path d="M17 6.5h2.5V8a3 3 0 0 1-2.8 3" /></symbol>
        <symbol id="i-bell" viewBox="0 0 24 24"><path d="M18 8.6a6 6 0 1 0-12 0c0 6.4-2.6 7.4-2.6 7.4h17.2S18 15 18 8.6z" /><path d="M13.7 19.5a2 2 0 0 1-3.4 0" /></symbol>
        <symbol id="i-sliders" viewBox="0 0 24 24"><path d="M4 21v-6M4 11V3M12 21v-9M12 8V3M20 21v-4M20 13V3M1.5 15h5M9.5 8h5M17.5 17h5" /></symbol>
        <symbol id="i-flame" viewBox="0 0 24 24"><path d="M12 3s5 4.2 5 9a5 5 0 0 1-10 0c0-2 1-3.4 1-3.4S9 11 10.4 11C11.8 11 12 8.6 12 3z" /><path d="M8.5 15.5a3.5 3.5 0 0 0 7 0" /></symbol>
        <symbol id="i-cast" viewBox="0 0 24 24"><path d="M3 17.5a3.5 3.5 0 0 1 3.5 3.5M3 13a8 8 0 0 1 8 8M3 8.5A12.5 12.5 0 0 1 15.5 21" /><path d="M3 7.5V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3.5" /></symbol>
        <symbol id="i-star" viewBox="0 0 24 24"><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.7l5.9-.8z" /></symbol>
        <symbol id="i-heart" viewBox="0 0 24 24"><path d="M12 20.5S3.5 15.3 3.5 9.6A4.6 4.6 0 0 1 12 7.1a4.6 4.6 0 0 1 8.5 2.5c0 5.7-8.5 10.9-8.5 10.9z" /></symbol>
        <symbol id="i-comment" viewBox="0 0 24 24"><path d="M20.5 11.4a7.4 7.4 0 0 1-10.7 6.6L4 19.5l1.6-5.4A7.4 7.4 0 1 1 20.5 11.4z" /></symbol>
        <symbol id="i-external" viewBox="0 0 24 24"><path d="M9 5h10v10M19 5 8 16M15 19H5V9" /></symbol>
        <symbol id="i-close" viewBox="0 0 24 24"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11" /></symbol>
      </defs>
    </svg>
  );
}

export function Ki({ n, size }: { n: string; size?: number }) {
  return (
    <svg className="ki" style={size ? { width: size, height: size } : undefined} aria-hidden>
      <use href={`#i-${n}`} />
    </svg>
  );
}

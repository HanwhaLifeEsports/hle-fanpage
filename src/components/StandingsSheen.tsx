'use client';

import { useEffect, useRef } from 'react';

/** A single overlay measured against the HLE row, including after responsive reflow. */
export default function StandingsSheen() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const overlay = ref.current;
    const container = overlay?.parentElement;
    const table = container?.querySelector('table');
    const row = table?.querySelector('tr.me');
    if (!overlay || !container || !table || !row) return;

    const measure = () => {
      const bounds = container.getBoundingClientRect();
      const target = row.getBoundingClientRect();
      Object.assign(overlay.style, {
        left: `${target.left - bounds.left + container.scrollLeft}px`,
        top: `${target.top - bounds.top + container.scrollTop}px`,
        width: `${target.width}px`,
        height: `${target.height}px`,
        visibility: 'visible',
      });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(table);
    observer.observe(row);
    measure();
    return () => observer.disconnect();
  }, []);

  return <div ref={ref} className="standings-sheen" aria-hidden="true" style={{ visibility: 'hidden' }} />;
}

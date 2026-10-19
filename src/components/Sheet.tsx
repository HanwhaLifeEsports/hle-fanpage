'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';

/** 아래에서 올라오는 시트 (앱의 .sheet) */
export default function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    addEventListener('keydown', k);
    document.body.style.overflow = 'hidden';
    return () => {
      removeEventListener('keydown', k);
      document.body.style.overflow = '';
    };
  }, [onClose]);
  return (
    <div className="ui-sheet-bg" onClick={onClose}>
      <div className="ui-sheet" role="dialog" aria-modal aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="ui-sheet-h">
          <b>{title}</b>
          <button className="ui-iconbtn glass" onClick={onClose} aria-label="닫기">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

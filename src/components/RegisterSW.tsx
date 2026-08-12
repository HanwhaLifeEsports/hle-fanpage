'use client';

import { useEffect } from 'react';

/** 서비스워커 등록 — 웹 푸시 수신과 오프라인 안내에 필요하다. */
export default function RegisterSW() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV !== 'production') return; // 개발 중엔 HMR 과 충돌한다
    const t = setTimeout(() => {
      void navigator.serviceWorker.register('/sw.js').catch(() => {
        /* 등록 실패해도 앱은 그대로 동작한다 */
      });
    }, 1500); // 첫 렌더를 방해하지 않도록 뒤로 미룬다
    return () => clearTimeout(t);
  }, []);
  return null;
}

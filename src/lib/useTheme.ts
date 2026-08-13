'use client';

import { useCallback, useSyncExternalStore } from 'react';

/**
 * 테마 상태.
 *
 * 진짜 상태는 React 안이 아니라 두 곳에 있다 — localStorage 의 사용자 선택과
 * OS 의 prefers-color-scheme. 그래서 useState 로 복제하지 않고
 * useSyncExternalStore 로 바깥 값을 그대로 읽는다.
 *
 * 화면에 실제로 적용하는 것은 <html data-theme> 이고, 첫 페인트 전에 붙이는 일은
 * layout 의 인라인 스크립트가 한다. 여기서는 그 값을 읽고 뒤집기만 한다.
 */
export type Theme = 'light' | 'dark';

export const THEME_KEY = 'hle-theme';

const LIGHT_MQ = '(prefers-color-scheme: light)';

const subs = new Set<() => void>();

function subscribe(f: () => void) {
  subs.add(f);
  // 사용자가 고른 적이 없으면 OS 설정을 따라가므로, OS 가 바뀌면 같이 바뀌어야 한다
  const mq = window.matchMedia(LIGHT_MQ);
  mq.addEventListener('change', f);
  return () => {
    subs.delete(f);
    mq.removeEventListener('change', f);
  };
}

function read(): Theme {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    /* 사파리 프라이빗 모드 등 — 저장소를 못 읽으면 OS 설정으로 떨어진다 */
  }
  return window.matchMedia(LIGHT_MQ).matches ? 'light' : 'dark';
}

/** 서버에는 OS 설정도 저장소도 없다. 기본값인 다크로 그린 뒤 하이드레이션에서 맞춘다. */
const readServer = (): Theme => 'dark';

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, read, readServer);

  const toggle = useCallback(() => {
    const next: Theme = theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* 저장에 실패해도 이번 세션 동안은 적용된다 */
    }
    subs.forEach((f) => f());
  }, [theme]);

  return { theme, toggle };
}

'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';

/* ------------------------------------------------------------------ */
/* 알림 설정 항목                                                       */
/* ------------------------------------------------------------------ */

export const PREFS = [
  { k: 'd1', g: 'match', t: '내일 경기 있음', d: '전일 저녁 8시', def: false },
  { k: 'h1', g: 'match', t: '1시간 전', d: '경기 시작 60분 전', def: true },
  { k: 'm10', g: 'match', t: '곧 시작', d: '경기 시작 10분 전', def: true },
  { k: 'onair', g: 'match', t: '방송 시작', d: '치지직·SOOP 송출이 실제로 켜지면', def: true },
  { k: 'set', g: 'match', t: '세트 결과', d: '세트마다 스코어 속보', def: false },
  { k: 'result', g: 'match', t: '경기 결과', d: '경기 종료 직후', def: true },
  { k: 'spoiler', g: 'etc', t: '스포일러 차단', d: '결과를 가린 채 알림 · 앱에서도 스코어를 가립니다', def: true },
  { k: 'player', g: 'etc', t: '최애 선수 소식', d: '지정한 선수 관련 알림', def: true },
  { k: 'reply', g: 'etc', t: '내 글 댓글', d: '댓글·멘션', def: true },
  { k: 'goods', g: 'etc', t: '굿즈·티켓 오픈', d: '판매 시작 시', def: false },
] as const;

export interface DemoState {
  prefs: Record<string, boolean>;
  fav: string | null;
  pred: number | null;
  predSubmitted: boolean;
  revealed: Record<string, boolean>;
  /** 개발용 강제 LIVE — 방송 없는 시간대에 라이브 UI를 확인하려는 스위치 */
  forceLive: boolean;
}

const KEY = 'hle-app-v1';

const DEFAULT: DemoState = Object.freeze({
  prefs: Object.fromEntries(PREFS.map((p) => [p.k, p.def])),
  fav: null,
  pred: null,
  predSubmitted: false,
  revealed: {},
  forceLive: false,
}) as DemoState;

let state: DemoState = DEFAULT;
let hydrated = false;
const subs = new Set<() => void>();

const emit = () => subs.forEach((f) => f());
const subscribe = (f: () => void) => {
  subs.add(f);
  return () => void subs.delete(f);
};

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* 사파리 프라이빗 모드 등 — 저장 실패는 조용히 넘긴다 */
  }
}

export function patchState(p: Partial<DemoState>) {
  state = { ...state, ...p };
  persist();
  emit();
}

export function resetState() {
  state = { ...DEFAULT, prefs: { ...DEFAULT.prefs }, revealed: {} };
  persist();
  emit();
}

export function useDemo() {
  const s = useSyncExternalStore(
    subscribe,
    () => state,
    () => DEFAULT, // SSR 스냅샷 — 서버/클라 첫 렌더가 같아야 하이드레이션이 깨지지 않는다
  );

  useEffect(() => {
    if (hydrated) return;
    hydrated = true;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<DemoState>;
        state = {
          ...DEFAULT,
          ...saved,
          prefs: { ...DEFAULT.prefs, ...(saved.prefs ?? {}) },
          revealed: saved.revealed ?? {},
        };
        emit();
      }
    } catch {
      /* 깨진 저장값은 무시하고 기본값으로 */
    }
  }, []);

  const setPref = useCallback((k: string, v: boolean) => {
    patchState({
      prefs: { ...state.prefs, [k]: v },
      ...(k === 'spoiler' && !v ? { revealed: {} } : {}),
    });
  }, []);

  const reveal = useCallback((id: string) => {
    patchState({ revealed: { ...state.revealed, [id]: true } });
  }, []);

  return { ...s, setPref, reveal };
}

/* ------------------------------------------------------------------ */
/* 토스트 (푸시 시뮬레이션 + 실제 Notification API)                     */
/* ------------------------------------------------------------------ */

export interface Toast {
  id: number;
  title: string;
  body: string;
  meta?: string;
}

let toasts: Toast[] = [];
const tsubs = new Set<() => void>();
let seq = 0;

const temit = () => tsubs.forEach((f) => f());
const tsubscribe = (f: () => void) => {
  tsubs.add(f);
  return () => void tsubs.delete(f);
};

export function toast(title: string, body: string, meta?: string) {
  const t: Toast = { id: ++seq, title, body, meta: meta ?? '지금' };
  toasts = [...toasts, t];
  temit();
  setTimeout(() => dismissToast(t.id), 5600);

  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, { body, tag: 'hle' });
    } catch {
      /* 일부 브라우저는 SW 없이 Notification 생성이 막혀 있다 — 토스트로만 보여준다 */
    }
  }
}

export function dismissToast(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  temit();
}

export function useToasts() {
  return useSyncExternalStore(
    tsubscribe,
    () => toasts,
    () => EMPTY,
  );
}
const EMPTY: Toast[] = [];

/* ------------------------------------------------------------------ */
/* 브라우저 알림 권한                                                    */
/* ------------------------------------------------------------------ */

let permission: NotificationPermission | 'unsupported' = 'default';
const psubs = new Set<() => void>();
const psubscribe = (f: () => void) => {
  psubs.add(f);
  return () => void psubs.delete(f);
};

export function useNotify() {
  const perm = useSyncExternalStore(
    psubscribe,
    () => permission,
    () => 'default' as const,
  );

  useEffect(() => {
    const next = 'Notification' in window ? Notification.permission : ('unsupported' as const);
    if (next !== permission) {
      permission = next;
      psubs.forEach((f) => f());
    }
  }, []);

  const ask = useCallback(() => {
    if (!('Notification' in window)) {
      toast('알림 미지원', '이 브라우저는 웹 알림을 지원하지 않습니다.');
      return;
    }
    if (Notification.permission === 'granted') {
      toast('이미 켜져 있어요', '경기 알림을 받을 준비가 됐습니다.');
      return;
    }
    if (Notification.permission === 'denied') {
      toast('알림이 차단됨', '주소창의 자물쇠 아이콘에서 알림을 허용해 주세요.');
      return;
    }
    // 권한 요청은 반드시 사용자 제스처 뒤에만. 진입 즉시 띄우면 거절률이 크게 오른다.
    void Notification.requestPermission().then((p) => {
      permission = p;
      psubs.forEach((f) => f());
      if (p === 'granted') toast('알림을 켰습니다 🔥', '경기 알림·방송 시작 알림을 보내드려요.');
      else toast('알림을 켜지 않았어요', 'MY 탭에서 언제든 다시 켤 수 있습니다.');
    });
  }, []);

  return { permission: perm, ask };
}

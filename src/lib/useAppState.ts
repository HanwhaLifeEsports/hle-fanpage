'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';

/**
 * 브라우저 로컬 상태.
 *
 * 계정 서버가 붙기 전까지 알림 설정 · 최애 선수 · 승부예측은 이 기기에만 저장된다.
 * 서버로 나가는 개인정보가 없다는 뜻이기도 하다 (개인정보처리방침 참고).
 */

/**
 * 미리 알림으로 고를 수 있는 시간(분).
 *
 * 예매와 취소표는 '시작하는 순간' 이 중요한 알림이라, 다른 항목과 달리 몇 분 전에
 * 받을지 고를 수 있어야 한다. 취소표는 대기하다 새로고침을 눌러야 하는 성격이라
 * 0분(정각)도 실제로 쓸모가 있어 남겨 둔다.
 */
export const LEAD_CHOICES = [0, 10, 30, 60] as const;
export const leadLabel = (m: number) => (m === 0 ? '정각' : `${m}분 전`);

export const PREFS = [
  { k: 'd1', g: 'match', t: '내일 경기 있음', d: '전일 저녁 8시', def: false },
  { k: 'h1', g: 'match', t: '1시간 전', d: '경기 시작 60분 전', def: true },
  { k: 'm10', g: 'match', t: '곧 시작', d: '경기 시작 10분 전', def: true },
  { k: 'onair', g: 'match', t: '방송 시작', d: '치지직·SOOP 송출이 실제로 켜지면', def: true },
  { k: 'set', g: 'match', t: '세트 결과', d: '세트마다 스코어 속보', def: false },
  { k: 'result', g: 'match', t: '경기 결과', d: '경기 종료 직후', def: true },
  { k: 'ticket', g: 'match', t: '예매 오픈', d: '현장 관람 티켓이 열릴 때 (경기 9일 전)', def: false, lead: 10 },
  { k: 'cancelTicket', g: 'match', t: '취소표', d: '경기 전날까지 매일 오후 3시 · 당일은 수시', def: false, lead: 10 },
  { k: 'spoiler', g: 'etc', t: '스포일러 차단', d: '결과를 가린 채 알림 · 앱에서도 스코어를 가립니다', def: true },
  { k: 'player', g: 'etc', t: '최애 선수 소식', d: '지정한 선수 관련 알림', def: true },
] as const;

/** 경기별 예측: [우리 세트, 상대 세트] */
export type Pick = [number, number];

export interface AppState {
  prefs: Record<string, boolean>;
  /**
   * 항목별 미리 알림(분). PREFS 에 lead 가 있는 항목만 쓴다.
   * 값이 없으면 그 항목의 기본값을 따른다.
   */
  leads: Record<string, number>;
  fav: string | null;
  /** matchId → 예측. 경기가 끝나면 실제 결과와 대조해 자동 채점된다. */
  picks: Record<string, Pick>;
  revealed: Record<string, boolean>;
  /** 알림 권한을 요청한 적이 있는지 — 배너 노출 판단용 */
  askedNotify: boolean;
}

const KEY = 'hle-fan-v1';

const DEFAULT: AppState = Object.freeze({
  prefs: Object.fromEntries(PREFS.map((p) => [p.k, p.def])),
  leads: Object.fromEntries(
    PREFS.filter((p): p is typeof p & { lead: number } => 'lead' in p).map((p) => [p.k, p.lead]),
  ),
  fav: null,
  picks: {},
  revealed: {},
  askedNotify: false,
}) as AppState;

let state: AppState = DEFAULT;
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

export function patchState(p: Partial<AppState>) {
  state = { ...state, ...p };
  persist();
  emit();
}

export function resetState() {
  state = { ...DEFAULT, prefs: { ...DEFAULT.prefs }, leads: { ...DEFAULT.leads }, picks: {}, revealed: {} };
  persist();
  emit();
}

export function useApp() {
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
        const saved = JSON.parse(raw) as Partial<AppState>;
        state = {
          ...DEFAULT,
          ...saved,
          prefs: { ...DEFAULT.prefs, ...(saved.prefs ?? {}) },
          leads: { ...DEFAULT.leads, ...(saved.leads ?? {}) },
          picks: saved.picks ?? {},
          revealed: saved.revealed ?? {},
        };
        emit();
      }
    } catch {
      /* 깨진 저장값은 무시하고 기본값으로 */
    }
  }, []);

  const setLead = useCallback((k: string, minutes: number) => {
    patchState({ leads: { ...state.leads, [k]: minutes } });
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

  const setPick = useCallback((matchId: string, pick: Pick) => {
    patchState({ picks: { ...state.picks, [matchId]: pick } });
  }, []);

  return { ...s, setPref, setLead, reveal, setPick };
}

/* ------------------------------------------------------------------ */
/* 알림                                                                 */
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
const EMPTY: Toast[] = [];

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
    // 서비스워커가 있으면 그쪽으로 — 탭이 백그라운드여도 뜬다
    void navigator.serviceWorker?.ready
      .then((reg) => reg.showNotification(title, { body, icon: '/icon-192.png', badge: '/badge.png', tag: 'hle' }))
      .catch(() => {
        try {
          new Notification(title, { body, tag: 'hle' });
        } catch {
          /* 알림 생성이 막힌 브라우저 — 토스트로만 보여준다 */
        }
      });
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

/* ------------------------------------------------------------------ */
/* 브라우저 알림 권한                                                    */
/* ------------------------------------------------------------------ */

let permission: NotificationPermission | 'unsupported' = 'default';
const psubs = new Set<() => void>();
const psubscribe = (f: () => void) => {
  psubs.add(f);
  return () => void psubs.delete(f);
};
const pemit = () => psubs.forEach((f) => f());

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
      pemit();
    }
  }, []);

  const ask = useCallback(() => {
    if (!('Notification' in window)) {
      toast('알림 미지원', '이 브라우저는 웹 알림을 지원하지 않습니다.');
      return;
    }
    if (Notification.permission === 'granted') {
      // 사이트가 권한을 되돌릴 수 없으므로, 실제로 끌 수 있는 두 경로를 알려준다
      toast('이미 켜져 있습니다', '받을 항목은 아래에서 고를 수 있고, 전체 차단은 브라우저 사이트 설정에서 합니다.');
      return;
    }
    if (Notification.permission === 'denied') {
      toast('알림이 차단되어 있습니다', '주소창의 자물쇠 아이콘에서 알림을 허용해 주세요.');
      return;
    }
    // 권한 요청은 반드시 사용자 제스처 뒤에만. 진입 즉시 띄우면 거절률이 크게 오른다.
    void Notification.requestPermission().then((p) => {
      permission = p;
      patchState({ askedNotify: true });
      pemit();
      if (p === 'granted') toast('알림을 켰습니다', '경기 알림과 방송 시작 알림을 보내드립니다.');
      else toast('알림을 켜지 않았습니다', 'MY 탭에서 언제든 다시 켤 수 있습니다.');
    });
  }, []);

  return { permission: perm, ask };
}

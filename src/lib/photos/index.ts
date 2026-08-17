'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { hasSupabase } from '../supabase';
import { localBackend } from './local';
import { remoteBackend } from './remote';
import type { FanPhoto, PhotoBackend } from './types';

export { FAN_OUT_H, FAN_OUT_W, FAN_RATIO } from './types';
export type { FanPhoto } from './types';

/**
 * 팬 사진 저장소.
 *
 * 열쇠가 있으면 Supabase, 없으면 브라우저. 화면은 어느 쪽인지 모른 채 같은
 * 함수를 부른다. 다만 하트가 공유되는지 여부는 사용자에게 말해 줘야 해서
 * sharedHearts 로만 새어 나간다.
 */
const backend: PhotoBackend = hasSupabase ? remoteBackend : localBackend;

export const sharedHearts = backend.shared;

/* ------------------------------------------------------------------ */
/* 메모리 캐시 + 구독                                                    */
/* ------------------------------------------------------------------ */

/** 화면은 동기로 읽어야 하므로 한 번 읽어 메모리에 들고 있는다 (useAppState 와 같은 방식) */
let photos: FanPhoto[] = [];
let loaded = false;
let loading: Promise<void> | null = null;
const subs = new Set<() => void>();
const EMPTY: FanPhoto[] = [];

/** 부르는 쪽이 photos 를 새 배열로 바꾼 다음에 부른다. 참조가 같으면 React 가 무시한다 */
const emit = () => subs.forEach((f) => f());
const subscribe = (f: () => void) => {
  subs.add(f);
  return () => void subs.delete(f);
};

function load(): Promise<void> {
  if (loaded) return Promise.resolve();
  loading ??= backend
    .load()
    .then((rows) => {
      photos = rows;
      loaded = true;
      emit();
    })
    .catch(() => {
      // 저장소가 막혀도 화면은 뜬다. 팬 사진 칸만 비어 보인다
      loaded = true;
    })
    .finally(() => {
      loading = null;
    });
  return loading;
}

/* ------------------------------------------------------------------ */
/* 조작                                                                */
/* ------------------------------------------------------------------ */

export async function addFanPhoto(playerId: string, blob: Blob): Promise<FanPhoto> {
  const photo = await backend.add(playerId, blob);
  photos = [...photos, photo];
  emit();
  return photo;
}

/**
 * 하트.
 *
 * 화면을 먼저 바꾸고 서버에 보낸다. 왕복을 기다리면 손가락과 화면 사이에
 * 눈에 띄는 틈이 생긴다. 실패하면 되돌린다.
 * 서버의 hearts 는 트리거가 맞추므로 여기서 더하는 1 과 어긋나지 않는다.
 */
export async function heartFanPhoto(id: string) {
  const before = photos;
  const cur = photos.find((p) => p.id === id);
  if (!cur) return;
  const on = !cur.mine;

  photos = photos.map((p) =>
    p.id === id ? { ...p, mine: on, hearts: Math.max(0, p.hearts + (on ? 1 : -1)) } : p,
  );
  emit();

  try {
    await backend.setHeart(id, on);
  } catch {
    photos = before;
    emit();
  }
}

/**
 * 신고 — 판단하지 않고 즉시 화면에서 내린다.
 *
 * 저작권법 제102조 제1항은 침해를 알게 된 때 '즉시' 중단시킨 경우에 책임을
 * 제한한다. 맞는지 따져본 뒤 내리면 그 사이가 빈다.
 */
export async function reportFanPhoto(id: string) {
  const before = photos;
  photos = photos.filter((p) => p.id !== id);
  emit();
  try {
    await backend.report(id);
  } catch {
    photos = before;
    emit();
  }
}

/** 내가 올린 사진 지우기 */
export async function removeFanPhoto(id: string) {
  const before = photos;
  photos = photos.filter((p) => p.id !== id);
  emit();
  try {
    await backend.remove(id);
  } catch {
    photos = before;
    emit();
  }
}

/* ------------------------------------------------------------------ */
/* 읽기                                                                */
/* ------------------------------------------------------------------ */

export function visibleFor(all: FanPhoto[], playerId: string): FanPhoto[] {
  return all
    .filter((p) => p.playerId === playerId)
    .sort((a, b) => b.hearts - a.hearts || b.createdAt.localeCompare(a.createdAt));
}

/** 카드에 올릴 사진 — 하트가 가장 많은 것. 동률이면 최근 것 */
export function topFor(all: FanPhoto[], playerId: string): FanPhoto | null {
  return visibleFor(all, playerId)[0] ?? null;
}

export function useFanPhotos(): FanPhoto[] {
  const list = useSyncExternalStore(
    subscribe,
    () => photos,
    () => EMPTY, // SSR 스냅샷 — 서버에는 브라우저 저장소도 세션도 없다
  );
  useEffect(() => {
    void load();
  }, []);
  return list;
}

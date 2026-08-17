'use client';

import { useEffect, useSyncExternalStore } from 'react';

/**
 * 팬이 올린 선수 사진.
 *
 * 운영자 사진(lck2026.ts 의 PlayerPhoto)과 일부러 분리했다. 성격이 다르기 때문이다.
 *  - 운영자 사진은 코드에 박혀 있고, 출처를 타입으로 강제하며, 배포 전에 검증된다
 *  - 팬 사진은 런타임 데이터고, 검증할 수 없으며, 신고와 삭제의 대상이다
 * 둘을 한 타입에 섞으면 "검증된 사진"이라는 말의 뜻이 흐려진다.
 *
 * [지금은 이 브라우저에만 저장된다]
 * 서버가 붙기 전 단계라 사진은 IndexedDB, 하트는 그 옆 메타에 쌓인다. 즉 하트는
 * 내 기기에서만 세어지고 남에게 보이지 않는다. "누적 하트 1위를 카드에 노출"은
 * 여러 사람의 하트가 한곳에 모여야 성립하므로, 그 부분은 서버가 붙어야 진짜가 된다.
 * 화면과 조작감을 먼저 확인하기 위한 단계다.
 *
 * 서버로 옮길 때 바뀌는 것은 이 파일의 store 구현뿐이고, 화면은 그대로 둔다.
 * 그래서 화면이 쓰는 함수는 전부 비동기로 열어 둔다.
 */

/** 팬 사진은 4:5 로 저장한다. 인물 사진이 가장 잘 살고, 카드 비율과도 같다 */
export const FAN_RATIO = 4 / 5;
export const FAN_OUT_W = 900;
export const FAN_OUT_H = 1125;

export interface FanPhoto {
  id: string;
  playerId: string;
  /** 화면에 붙일 주소. 지금은 objectURL 이라 새로고침하면 다시 만들어진다 */
  url: string;
  width: number;
  height: number;
  /** 누적 하트 수. 서버가 붙기 전에는 내 하트만 세어진다 */
  hearts: number;
  /** 내가 하트를 눌렀는가 — 서버가 붙어도 이 값은 기기에 남는다 */
  mine: boolean;
  createdAt: string;
  /**
   * 업로더가 "직접 촬영한 사진"임을 확인했는가.
   *
   * 저작권법 제103조에 따른 중단 요구가 들어왔을 때, 우리가 무엇을 근거로
   * 게시했는지 남겨 두는 기록이다. 확인하지 않으면 올릴 수 없다.
   */
  attested: boolean;
  /** 신고를 받아 가려진 상태. 즉시 화면에서 빠진다 (저작권법 제102조 1항) */
  hidden: boolean;
}

/** 저장된 형태 — Blob 은 IndexedDB 에 그대로 넣고, url 은 읽을 때 만든다 */
interface StoredPhoto extends Omit<FanPhoto, 'url'> {
  blob: Blob;
}

/* ------------------------------------------------------------------ */
/* IndexedDB                                                           */
/* ------------------------------------------------------------------ */

/**
 * 왜 localStorage 가 아닌가: localStorage 는 문자열만 담고 한도가 5MB 안팎이다.
 * 사진을 base64 로 바꾸면 용량이 1.33배로 늘어 몇 장 만에 꽉 찬다.
 * IndexedDB 는 Blob 을 그대로 담고 한도도 훨씬 크다.
 */
const DB_NAME = 'hle-fan-photos';
const STORE = 'photos';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' }).createIndex('playerId', 'playerId');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = run(t.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        t.oncomplete = () => db.close();
      }),
  );
}

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
  if (!loading) {
    loading = tx<StoredPhoto[]>('readonly', (s) => s.getAll() as IDBRequest<StoredPhoto[]>)
      .then((rows) => {
        photos = rows.map(({ blob, ...rest }) => ({ ...rest, url: URL.createObjectURL(blob) }));
        loaded = true;
        emit();
      })
      .catch(() => {
        // 사파리 프라이빗 모드 등 IndexedDB 가 막힌 환경 — 빈 목록으로 둔다
        loaded = true;
      })
      .finally(() => {
        loading = null;
      });
  }
  return loading;
}

/* ------------------------------------------------------------------ */
/* 조작                                                                */
/* ------------------------------------------------------------------ */

/** 시간순 id — 목록을 정렬하지 않아도 대략 올린 순서가 된다 */
const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export async function addFanPhoto(playerId: string, blob: Blob): Promise<FanPhoto> {
  const row: StoredPhoto = {
    id: newId(),
    playerId,
    blob,
    width: FAN_OUT_W,
    height: FAN_OUT_H,
    hearts: 0,
    mine: false,
    createdAt: new Date().toISOString(),
    attested: true, // 확인 없이는 업로드 화면을 통과할 수 없다
    hidden: false,
  };
  await tx('readwrite', (s) => s.add(row));
  const { blob: _b, ...rest } = row;
  const photo: FanPhoto = { ...rest, url: URL.createObjectURL(blob) };
  photos = [...photos, photo];
  emit();
  return photo;
}

async function patch(id: string, fn: (p: StoredPhoto) => StoredPhoto) {
  const cur = await tx<StoredPhoto>('readonly', (s) => s.get(id) as IDBRequest<StoredPhoto>);
  if (!cur) return;
  const next = fn(cur);
  await tx('readwrite', (s) => s.put(next));
  // objectURL 은 저장된 값이 아니라 지금 화면이 쓰고 있는 주소라 그대로 들고 간다
  const { blob: _blob, ...meta } = next;
  photos = photos.map((p) => (p.id === id ? { ...meta, url: p.url } : p));
  emit();
}

export function heartFanPhoto(id: string) {
  const p = photos.find((x) => x.id === id);
  if (!p) return Promise.resolve();
  const mine = !p.mine;
  // 하트 수는 서버가 세는 값이다. 지금은 내 하트가 곧 전부라 같이 움직인다.
  return patch(id, (row) => ({ ...row, mine, hearts: Math.max(0, row.hearts + (mine ? 1 : -1)) }));
}

/**
 * 신고 — 판단하지 않고 즉시 가린다.
 *
 * 저작권법 제102조 제1항은 침해를 알게 된 때 '즉시' 중단시킨 경우에 책임을 제한한다.
 * 맞는지 따져본 뒤 내리면 그 사이가 비어 버린다. 먼저 내리고 나중에 본다.
 */
export function reportFanPhoto(id: string) {
  return patch(id, (row) => ({ ...row, hidden: true }));
}

export async function removeFanPhoto(id: string) {
  const p = photos.find((x) => x.id === id);
  if (p) URL.revokeObjectURL(p.url);
  await tx('readwrite', (s) => s.delete(id));
  photos = photos.filter((x) => x.id !== id);
  emit();
}

/* ------------------------------------------------------------------ */
/* 읽기                                                                */
/* ------------------------------------------------------------------ */

export function visibleFor(all: FanPhoto[], playerId: string): FanPhoto[] {
  return all
    .filter((p) => p.playerId === playerId && !p.hidden)
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
    () => EMPTY, // SSR 스냅샷 — 서버에는 브라우저 저장소가 없다
  );
  useEffect(() => {
    void load();
  }, []);
  return list;
}

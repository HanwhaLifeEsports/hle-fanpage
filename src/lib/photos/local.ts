'use client';

import { FAN_OUT_H, FAN_OUT_W, type FanPhoto, type PhotoBackend } from './types';

/**
 * 브라우저 저장소 백엔드.
 *
 * Supabase 열쇠가 없을 때 여기로 떨어진다. 사진은 이 기기에만 남고 하트도
 * 이 기기에서만 세어진다. 화면과 조작감을 확인하는 용도이고, 열쇠가 붙는 순간
 * remote 로 바뀐다.
 *
 * localStorage 가 아니라 IndexedDB 인 이유: localStorage 는 문자열만 담고 한도가
 * 5MB 안팎이다. 사진을 base64 로 바꾸면 용량이 1.33배로 늘어 몇 장 만에 찬다.
 */

const DB_NAME = 'hle-fan-photos';
const STORE = 'photos';

interface Row extends Omit<FanPhoto, 'url'> {
  blob: Blob;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
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

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

async function patch(id: string, fn: (r: Row) => Row) {
  const cur = await tx<Row>('readonly', (s) => s.get(id) as IDBRequest<Row>);
  if (cur) await tx('readwrite', (s) => s.put(fn(cur)));
}

export const localBackend: PhotoBackend = {
  shared: false,

  async load() {
    try {
      const rows = await tx<Row[]>('readonly', (s) => s.getAll() as IDBRequest<Row[]>);
      return rows.map(({ blob, ...rest }) => ({ ...rest, url: URL.createObjectURL(blob) }));
    } catch {
      // 사파리 프라이빗 모드 등 IndexedDB 가 막힌 환경 — 빈 목록으로 둔다
      return [];
    }
  },

  async add(playerId, blob) {
    const row: Row = {
      id: newId(),
      playerId,
      blob,
      width: FAN_OUT_W,
      height: FAN_OUT_H,
      hearts: 0,
      mine: false,
      owned: true,
      createdAt: new Date().toISOString(),
    };
    await tx('readwrite', (s) => s.add(row));
    const { blob: _b, ...meta } = row;
    return { ...meta, url: URL.createObjectURL(blob) };
  },

  setHeart(id, on) {
    // 남의 하트가 없으니 내 하트가 곧 전부다
    return patch(id, (r) => ({ ...r, mine: on, hearts: Math.max(0, r.hearts + (on ? 1 : -1)) }));
  },

  // 브라우저 저장소에는 가릴 상대가 없다. 신고는 곧 삭제와 같다
  report(id) {
    return this.remove(id);
  },

  async remove(id) {
    await tx('readwrite', (s) => s.delete(id));
  },
};

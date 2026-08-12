/* HLE FAN service worker
 *
 * 역할은 두 가지로 좁혔다.
 *   1) 웹 푸시 수신 — 탭이 닫혀 있어도 알림이 뜨려면 이 파일이 필요하다.
 *   2) 오프라인 안내 — 네트워크가 끊겼을 때 빈 화면 대신 안내를 보여준다.
 *
 * 정적 자산은 캐싱하지 않는다. Next.js 가 해시 파일명으로 이미 캐시를 관리하고,
 * 잘못된 서비스워커 캐시는 배포 후 갱신이 막히는 사고로 이어진다.
 */

const OFFLINE_URL = '/offline';
const CACHE = 'hle-shell-v1';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.add(OFFLINE_URL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.mode !== 'navigate') return;
  e.respondWith(fetch(e.request).catch(() => caches.match(OFFLINE_URL)));
});

self.addEventListener('push', (e) => {
  let d = {};
  try {
    d = e.data ? e.data.json() : {};
  } catch {
    d = { title: 'HLE FAN', body: e.data ? e.data.text() : '' };
  }
  e.waitUntil(
    self.registration.showNotification(d.title || 'HLE FAN', {
      body: d.body || '',
      icon: '/icon-192.png',
      badge: '/badge.png',
      tag: d.tag || 'hle',
      data: { url: d.url || '/' },
      renotify: true,
    }),
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.includes(url) && 'focus' in c) return c.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});

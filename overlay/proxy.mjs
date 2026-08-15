#!/usr/bin/env node
/**
 * 관전 오버레이용 로컬 프록시 + 정적 서버.
 *
 * 왜 프록시가 필요한가 —
 *  롤 클라이언트의 Live Client Data API 는 https://127.0.0.1:2999 에 뜨는데,
 *  Riot 이 자체 서명한 인증서를 쓴다. 브라우저(=OBS 브라우저 소스)는 그 인증서를
 *  신뢰하지 않아 fetch 가 통째로 막힌다. CORS 헤더도 없다.
 *  그래서 이 프로세스가 인증서 검증을 끄고 대신 받아와서, 평범한 http + CORS 로
 *  다시 내보낸다. 오버레이 페이지는 이 서버만 바라본다.
 *
 * 실행:  node overlay/proxy.mjs          (기본 http://127.0.0.1:3200/overlay.html)
 *        node overlay/proxy.mjs --port 4000
 *
 * 이 서버는 로컬 전용이다. 127.0.0.1 에만 바인딩하므로 같은 PC 밖에서는 안 열린다.
 */

import { createServer } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const GAME = { host: '127.0.0.1', port: 2999 };

const argPort = process.argv.indexOf('--port');
const PORT = argPort > -1 ? Number(process.argv[argPort + 1]) : 3200;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

/**
 * 게임 API 한 번 호출.
 * rejectUnauthorized:false 는 여기서만 쓴다 — 상대가 내 PC 안의 롤 클라이언트라서
 * 중간자가 낄 구간이 없다. 이 플래그를 전역(NODE_TLS_REJECT_UNAUTHORIZED)으로
 * 끄면 이 프로세스의 다른 모든 TLS 까지 무방비가 되므로 요청 단위로만 끈다.
 */
function callGame(path) {
  return new Promise((resolve) => {
    const req = httpsRequest(
      { ...GAME, path, method: 'GET', rejectUnauthorized: false, timeout: 4000 },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks) }));
      },
    );
    // 게임이 안 떠 있으면 ECONNREFUSED. 이건 오류가 아니라 "아직 관전 전" 이라는 정상 상태다.
    req.on('error', (e) => resolve({ status: 503, body: Buffer.from(JSON.stringify({ offline: true, reason: e.code ?? 'ERR' })) }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ status: 504, body: Buffer.from(JSON.stringify({ offline: true, reason: 'TIMEOUT' })) });
    });
    req.end();
  });
}

const send = (res, status, body, type) => {
  res.writeHead(status, {
    'Content-Type': type,
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
  });
  res.end(body);
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // /game/* → 게임 API 로 그대로 넘긴다
  if (url.pathname.startsWith('/game/')) {
    const target = url.pathname.replace('/game', '') + url.search;
    const { status, body } = await callGame(target);
    return send(res, status, body, 'application/json; charset=utf-8');
  }

  // 그 밖에는 이 폴더의 정적 파일
  const rel = url.pathname === '/' ? '/overlay.html' : url.pathname;
  // normalize 로 ../ 를 접은 뒤 폴더 밖을 가리키면 거절한다
  const file = join(HERE, normalize(rel));
  if (!file.startsWith(HERE)) return send(res, 403, 'forbidden', 'text/plain');

  try {
    const body = await readFile(file);
    send(res, 200, body, MIME[extname(file)] ?? 'application/octet-stream');
  } catch {
    send(res, 404, 'not found', 'text/plain');
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`오버레이   http://127.0.0.1:${PORT}/overlay.html`);
  console.log(`게임 API   http://127.0.0.1:${PORT}/game/liveclientdata/allgamedata`);
  console.log(`\nOBS → 소스 추가 → 브라우저 → 위 오버레이 주소, 1920×1080.`);
  console.log(`게임(관전)이 뜨기 전에는 "관전 대기 중" 화면이 나옵니다.`);
});

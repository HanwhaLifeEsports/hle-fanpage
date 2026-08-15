#!/usr/bin/env node
/**
 * 지금 진행 중인 게임을 찾아서 관전을 띄운다.
 *
 *   node overlay/spectate.mjs --list            진행 중인 게임 목록만 본다
 *   node overlay/spectate.mjs                   목록의 첫 게임을 관전
 *   node overlay/spectate.mjs --index 3         n 번째 게임을 관전
 *   node overlay/spectate.mjs --riot-id 이름#KR1  특정 소환사가 하는 게임을 관전
 *   node overlay/spectate.mjs --print           실행하지 않고 명령만 출력
 *
 * 키는 RIOT_API_KEY 환경변수나 .env.local 에서 읽는다.
 *
 * [이 PC 에서 실측한 것 — 2026-08]
 *  - 관전 서버는 spectator.kr.lol.pvp.net:80 이다.
 *    흔히 도는 spectator(-consumer).kr.lol.riotgames.com 은 DNS 조차 안 잡힌다.
 *  - 라이엇 클라이언트 설정(clientconfig)에서 lol.kr.operational.spectator 만
 *    enabled:true 다. 다른 지역은 전부 false — 즉 관전은 사실상 한국 서버 기능이다.
 *  - LCU 로 띄우는 쪽이 안전하다. 서버 주소·인자 조립을 클라이언트가 알아서 한다.
 *    LCU 가 안 떠 있으면 게임 실행 파일을 직접 부르는 쪽으로 떨어진다.
 */

import { readFile } from 'node:fs/promises';
import { request as httpsRequest } from 'node:https';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

const REGION = { platform: 'kr', routing: 'asia', tag: 'KR' };
/**
 * 관전 중계 서버 — 라이엇 공식. **포트 8080 이다.**
 *
 * 오래 헤맨 부분이라 적어둔다. 포트 80 은 응답하지 않는다(연결 자체가 안 됨).
 * 인터넷에 흔히 도는 spectator(-consumer).kr.lol.riotgames.com 은 DNS 조차 안 잡힌다.
 *
 * op.gg 의 kr.spectator.proxy.op.gg 는 프록시가 아니라 그냥 리다이렉터였다 —
 * AWS 서울의 nginx 가 302 로 이 주소(8080)를 가리킬 뿐이다. 게임이 청크를 받을 때마다
 * 리다이렉트를 타야 해서 "errors fetching data chunks" 가 났던 것으로 보인다.
 * 그래서 여기서는 처음부터 라이엇 주소를 직접 쓴다.
 *
 *   curl http://spectator.kr.lol.pvp.net:8080/observer-mode/rest/consumer/version  →  200 "2.46.0"
 */
const SPECTATOR = process.env.SPECTATOR_HOST ?? 'spectator.kr.lol.pvp.net:8080';
const LOL_DIR = '/Applications/League of Legends.app/Contents/LoL';
/**
 * 게임 루트는 LoL/ 이 아니라 LoL/Game/ 이다. DATA/FINAL/*.wad.client 가 거기 있다.
 *
 * 이걸 틀리면 게임이 "Installation is corrupt. WadFile mount failed" 로 즉시 죽고,
 * 한술 더 떠 Contents/SOFT_REPAIR 표식을 남겨 다음 실행 때 패처가 재설치를 돌린다.
 * (설치는 멀쩡한데 경로만 틀린 것이므로, 그 표식이 생기면 지워야 한다.)
 */
const GAME_DIR = `${LOL_DIR}/Game`;
const GAME_APP = `${GAME_DIR}/LeagueofLegends.app`;
const GAME_BIN = `${GAME_APP}/Contents/MacOS/LeagueofLegends`;
const LOCKFILES = [
  `${LOL_DIR}/lockfile`,
  `${process.env.HOME}/Library/Application Support/Riot Games/League of Legends/lockfile`,
];

/* ------------------------------------------------------------------ */
/* 인자 · 키                                                           */
/* ------------------------------------------------------------------ */

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const opt = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i > -1 ? argv[i + 1] : undefined;
};

async function apiKey() {
  if (process.env.RIOT_API_KEY) return process.env.RIOT_API_KEY;
  for (const f of ['.env.local', '.env']) {
    try {
      const m = (await readFile(new URL(`../${f}`, import.meta.url), 'utf8')).match(
        /^RIOT_API_KEY\s*=\s*(.+)$/m,
      );
      if (m) return m[1].trim().replace(/^["']|["']$/g, '');
    } catch {
      /* 없으면 다음 후보 */
    }
  }
  die(
    'RIOT_API_KEY 가 없습니다.\n' +
      '  developer.riotgames.com 로그인 → 대시보드의 Development API Key (RGAPI-…) 를 복사해\n' +
      '  hle-fanpage/.env.local 에 RIOT_API_KEY=RGAPI-… 로 넣으세요. (24시간마다 갱신됩니다)',
  );
}

const die = (msg) => {
  console.error(`\n${msg}\n`);
  process.exit(1);
};

/* ------------------------------------------------------------------ */
/* Riot API                                                            */
/* ------------------------------------------------------------------ */

async function riot(host, path, key) {
  const res = await fetch(`https://${host}.api.riotgames.com${path}`, {
    headers: { 'X-Riot-Token': key },
    signal: AbortSignal.timeout(12_000),
  });
  // 401 과 403 은 원인이 다르다. 둘을 뭉뚱그리면 멀쩡한 키를 만료로 오해한다.
  if (res.status === 401) {
    die('키가 유효하지 않습니다 (401). Development 키는 24시간마다 만료됩니다 — 새로 발급받으세요.');
  }
  if (res.status === 403) {
    die(
      `이 키로는 ${path.split('?')[0]} 를 부를 수 없습니다 (403).\n` +
        '  키 자체는 멀쩡한데 이 엔드포인트 권한이 없는 경우입니다.',
    );
  }
  if (res.status === 404) return null;
  // 개발용 키는 100회/2분이라 사다리를 훑다 보면 걸린다. 죽지 말고 기다렸다 다시 친다.
  if (res.status === 429) {
    const wait = Number(res.headers.get('retry-after') ?? 10);
    process.stdout.write(`[한도 도달 — ${wait}초 대기]`);
    await new Promise((r) => setTimeout(r, (wait + 1) * 1000));
    return riot(host, path, key);
  }
  if (!res.ok) die(`Riot API ${path.split('?')[0]} → HTTP ${res.status}`);
  return res.json();
}

/**
 * "아무나" 를 찾는 법 — 상위 티어 사다리를 훑어서 지금 게임 중인 사람을 고른다.
 *
 * 원래는 spectator-v5/featured-games 한 방이면 되는데, 이 키로는 403 이 떨어진다
 * (키는 멀쩡하다 — account-v1·league-v4·active-games 는 200 이다).
 * 대신 league-v4 챌린저 목록이 puuid 를 그대로 주므로, 그걸 훑어 active-games 를 물어본다.
 * 챌린저는 늘 누군가 게임 중이라 보통 열몇 번 안에 걸린다.
 */
const LADDER = '/lol/league/v4/challengerleagues/by-queue/RANKED_SOLO_5x5';

/**
 * 고를 게임의 경과 시간 창(초).
 *
 * 아래(200초): 관전 지연이 약 3분이라 그 전에는 볼 게 없다.
 * 위(15분): 관전 창이 뜨는 데만 2분쯤 걸리는데, 20분 넘은 게임을 고르면 그 사이 끝나버려
 *           "download disabled due to errors fetching data chunks" 로 떨어진다. 실제로 겪었다.
 */
const MIN_LENGTH = 200;
const MAX_LENGTH = 600;

/**
 * 오버레이가 그릴 수 있는 게임인가.
 *
 * 소환사의 협곡 5대5 만 받는다. 아레나(CHERRY)는 2인 8팀이고 칼바람(ARAM)은 협곡이 아니라서
 * ORDER/CHAOS 5명씩을 전제한 오버레이가 깨진다. 실제로 아레나를 한 번 잡아 봤다.
 */
const isSupported = (g) => g.gameMode === 'CLASSIC' && g.mapId === 11;

async function findAnyGame(key, { scan = 30, anyLength = false } = {}) {
  const ladder = await riot(REGION.platform, LADDER, key);
  const entries = (ladder?.entries ?? []).filter((e) => e.puuid);
  if (!entries.length) die('챌린저 목록을 받지 못했습니다.');

  // 매번 같은 사람부터 훑으면 늘 같은 게임만 잡힌다
  for (let i = entries.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [entries[i], entries[j]] = [entries[j], entries[i]];
  }

  const found = [];
  process.stdout.write(`챌린저 ${entries.length}명 중 최대 ${scan}명 확인 `);
  for (const e of entries.slice(0, scan)) {
    const g = await riot(REGION.platform, `/lol/spectator/v5/active-games/by-summoner/${e.puuid}`, key);
    // 한 게임에 챌린저가 여럿 있으면 같은 게임이 여러 번 잡힌다
    if (g?.observers?.encryptionKey && isSupported(g) && !found.some((x) => x.gameId === g.gameId)) {
      found.push(g);
      // 지연을 넘긴 게임이면 더 찾을 것 없다
      const len = g.gameLength ?? 0;
      if (anyLength || (len >= MIN_LENGTH && len <= MAX_LENGTH)) {
        process.stdout.write(' ★\n');
        return found;
      }
      process.stdout.write('o');
    } else {
      process.stdout.write('.');
    }
    // 개발용 키 한도(20회/초)에 여유를 둔다
    await new Promise((r) => setTimeout(r, 120));
  }
  process.stdout.write('\n');
  return found;
}

async function byRiotId(riotId, key) {
  const [name, tag = REGION.tag] = riotId.split('#');
  const acc = await riot(
    REGION.routing,
    `/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`,
    key,
  );
  if (!acc) die(`그런 라이엇 ID 가 없습니다: ${riotId}`);
  const game = await riot(
    REGION.platform,
    `/lol/spectator/v5/active-games/by-summoner/${acc.puuid}`,
    key,
  );
  if (!game) die(`${riotId} 은(는) 지금 게임 중이 아닙니다.`);
  return game;
}

/* ------------------------------------------------------------------ */
/* 관전 실행                                                           */
/* ------------------------------------------------------------------ */

/** LCU 락파일 — "프로세스:pid:포트:비밀번호:프로토콜" 형식 */
async function lockfile() {
  for (const f of LOCKFILES) {
    if (!existsSync(f)) continue;
    const [, , port, password] = (await readFile(f, 'utf8')).split(':');
    return { port, password };
  }
  return null;
}

/** 클라이언트에게 관전을 맡긴다 — 서버 주소·인자를 클라이언트가 알아서 조립한다 */
function lcuSpectate({ port, password }, game) {
  const body = JSON.stringify({
    allowObserveMode: 'ALL',
    dropInSpectateGameId: String(game.gameId),
    gameQueueType: '',
    puuid: game.participants?.[0]?.puuid ?? '',
  });
  return new Promise((resolve) => {
    const req = httpsRequest(
      {
        host: '127.0.0.1',
        port,
        path: '/lol-spectator/v1/spectate/launch',
        method: 'POST',
        // 상대가 내 PC 안의 롤 클라이언트라 자체서명 인증서를 쓴다
        rejectUnauthorized: false,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          Authorization: `Basic ${Buffer.from(`riot:${password}`).toString('base64')}`,
        },
      },
      (res) => {
        res.resume();
        resolve(res.statusCode >= 200 && res.statusCode < 300);
      },
    );
    req.on('error', () => resolve(false));
    req.end(body);
  });
}

/** Riot 클라이언트 락파일 — "Riot Client:pid:포트:토큰:프로토콜" */
const RIOT_LOCKFILE = `${process.env.HOME}/Library/Application Support/Riot Games/Riot Client/Config/lockfile`;

async function riotClientAuth() {
  try {
    const [, , port, token] = (await readFile(RIOT_LOCKFILE, 'utf8')).split(':');
    return { port, token };
  } catch {
    return null;
  }
}

/**
 * 게임을 직접 띄울 때 붙일 인자.
 *
 * 이 목록은 상상이 아니라, 이 PC 의 지난 게임 로그에 남은 "Command Line:" 을 그대로 베꼈다.
 * 빠뜨리면 조용히 이상해진다 —
 *  - RiotClientPort/AuthToken 없으면 "LCURemotingClient: Initializing on port 0" 이 뜨고
 *    게임이 클라이언트를 영영 못 찾는다.
 *  - UseMetal 없으면 맥에서 렌더러가 제대로 안 올라와 회색 화면이 된다.
 */
/**
 * 게임을 직접 띄울 때 붙일 인자 — op.gg 의 "관전하기" 스크립트를 그대로 따랐다.
 *
 * op.gg 가 내려주는 명령은 이렇다:
 *   cd .../LoL/Game/
 *   riot_launched=true ./LeagueofLegends.app/Contents/MacOS/LeagueofLegends \
 *     "spectator kr.spectator.proxy.op.gg:80 <key> <gameId> KR" "-UseRads" "-GameBaseDir=.."
 *
 * 내가 놓쳤던 세 가지 —
 *  · riot_launched=true 환경변수. 없으면 게임이 정상 실행으로 안 본다.
 *  · -UseRads. 이게 있으면 경로 해석 방식이 달라진다.
 *  · -GameBaseDir=..  cwd 가 LoL/Game 이므로 .. 는 LoL 이다. 내가 쓰던 LoL/Game 이 아니다.
 *
 * -UseMetal·-RiotClientPort 같은 건 op.gg 도 안 넘긴다. 굳이 넣지 않는다.
 */
const directArgs = (game) => [
  `spectator ${SPECTATOR} ${game.observers.encryptionKey} ${game.gameId} ${REGION.tag}`,
  '-UseRads',
  '-GameBaseDir=..',
];

/* ------------------------------------------------------------------ */

const fmt = (g, i) => {
  const secs = g.gameLength ?? 0;
  const when = secs < MIN_LENGTH ? `${Math.floor(secs / 60)}분(관전 지연 전)` : `${Math.floor(secs / 60)}분`;
  const names = (g.participants ?? []).map((p) => p.riotId || p.summonerName).filter(Boolean);
  return `  [${i}] ${String(g.gameId).padEnd(12)} ${(g.gameMode ?? '').padEnd(8)} ${when.padStart(16)}  ${names.slice(0, 4).join(', ')}${names.length > 4 ? ' …' : ''}`;
};

/* ------------------------------------------------------------------ */
/* 실행 결과 확인 · 재시도                                               */
/* ------------------------------------------------------------------ */

/**
 * 관전이 실제로 붙었는지 확인한다.
 *
 * 포트 2999 가 열리는 것만으로는 부족하다 — 로딩 화면에서도 열린다. allPlayers 가
 * 채워져야 진짜로 스트림을 받은 것이다.
 *
 * 실측: op.gg 프록시는 연결(Replay connection ready)까지는 늘 성공하지만,
 * 그 뒤 청크 수신은 5번 중 2번만 됐다. 실패하면 약 2분 뒤 게임이 스스로 종료된다.
 * 그래서 성공/실패/시간초과 세 가지를 구분해서 돌려준다.
 */
async function waitForStream(timeoutMs = 240_000) {
  const t0 = Date.now();
  let sawPort = false;
  while (Date.now() - t0 < timeoutMs) {
    try {
      const res = await fetch('https://127.0.0.1:2999/liveclientdata/allgamedata', {
        signal: AbortSignal.timeout(4000),
      });
      // 404 도 응답이다 — 로딩 화면에서 그렇게 나온다
      sawPort = true;
      if (res.ok) {
        const d = await res.json();
        if ((d.allPlayers?.length ?? 0) >= 10) return 'ok';
      }
    } catch {
      /* 연결 실패는 아래에서 프로세스 생존으로 판정한다 */
    }
    // 포트를 한 번이라도 봤는데 게임이 사라졌으면 죽은 것이다
    if (sawPort && !(await gameRunning())) return 'died';
    await new Promise((r) => setTimeout(r, 4000));
  }
  return 'timeout';
}

async function gameRunning() {
  const { execFile } = await import('node:child_process');
  return new Promise((resolve) => {
    execFile('pgrep', ['-f', 'LeagueofLegends.app/Contents/MacOS/LeagueofLegends'], (err, out) =>
      resolve(!err && out.trim().length > 0),
    );
  });
}

async function killGame() {
  const { execFile } = await import('node:child_process');
  return new Promise((resolve) =>
    execFile('pkill', ['-f', 'LeagueofLegends.app/Contents/MacOS/LeagueofLegends'], () => resolve()),
  );
}

/* ------------------------------------------------------------------ */

const key = await apiKey();
const riotId = opt('riot-id');
const scan = Number(opt('scan') ?? 60);
// op.gg 프록시가 절반쯤만 붙으므로 기본으로 몇 번 다시 시도한다
const tries = Number(opt('retry') ?? 3);

/** 이미 시도해서 실패한 게임 — 같은 것을 또 잡으면 재시도가 무의미하다 */
const burned = new Set();

async function pickGame() {
  if (riotId) return byRiotId(riotId, key);

  const found = await findAnyGame(key, { anyLength: flag('list'), scan });
  const list = found.filter((g) => !burned.has(g.gameId));
  if (!list.length) die('지금 게임 중인 사람을 못 찾았습니다. 잠시 뒤 다시 시도하세요.');
  console.log(`\n찾은 게임 ${list.length}개:\n${list.map(fmt).join('\n')}\n`);
  if (flag('list')) process.exit(0);

  const idx = opt('index');
  const len = (g) => g.gameLength ?? 0;
  const inWindow = (g) => len(g) >= MIN_LENGTH && len(g) <= MAX_LENGTH;
  if (idx != null) {
    const g = list[Number(idx)];
    if (!g) die(`--index ${idx} 에 해당하는 게임이 없습니다.`);
    return g;
  }
  const inWin = list.filter(inWindow);
  if (inWin.length) return inWin[0];
  /*
   * 관전 지연(약 3분)을 안 넘긴 게임은 아예 고르지 않는다. 데이터가 올 수가 없어서
   * 무조건 타임아웃이 난다. 대신 조금 지난 쪽에서 가장 창에 가까운 것을 쓴다.
   */
  const mature = list.filter((g) => len(g) > MAX_LENGTH).sort((a, b) => len(a) - len(b));
  return mature[0] ?? null;
}

const rc = await riotClientAuth();
if (!rc) console.log('⚠️  Riot 클라이언트 인증을 못 읽었습니다 — 게임이 클라이언트를 못 찾을 수 있습니다.');

for (let attempt = 1; attempt <= tries; attempt++) {
  const game = await pickGame();
  if (!game) die('관전 가능한 게임이 없습니다 (전부 3분 미만이거나 이미 시도함). 잠시 뒤 다시 시도하세요.');
  if (!game.observers?.encryptionKey) die('이 게임에는 관전 키가 없습니다 (비공개 게임).');

  const mins = Math.floor((game.gameLength ?? 0) / 60);
  console.log(`\n[${attempt}/${tries}] 관전 대상: gameId ${game.gameId} · ${game.gameMode} · ${mins}분 경과`);

  if (flag('print')) {
    console.log(`\ncd "${GAME_DIR}"`);
    console.log("riot_launched=true \\");
    console.log(`"${GAME_BIN}" \\\n  ${directArgs(game).map((a) => `"${a}"`).join(' \\\n  ')}\n`);
    process.exit(0);
  }
  if (!existsSync(GAME_BIN)) die(`게임 실행 파일이 없습니다: ${GAME_BIN}`);

  await killGame();   // 앞선 시도가 남긴 창을 먼저 정리한다
  /*
   * 실행 파일을 직접 spawn 하되 cwd 를 반드시 GAME_DIR 로 둔다.
   *
   * open -n 으로 .app 번들을 띄우면 macOS 가 작업 디렉터리를 / 로 잡는데, 이 게임은
   * -GameBaseDir 을 절대경로로 줘도 일부 경로를 cwd 기준으로 푼다. 그래서 open 으로 띄우면
   * "Unable to write soft repair file: //../SOFT_REPAIR" + WadFile mount failed 로 즉사한다.
   * (실측: open 은 즉사, 직접 spawn + cwd=GAME_DIR 은 관전 접속까지 성공)
   */
  spawn(GAME_BIN, directArgs(game), {
    cwd: GAME_DIR,
    env: { ...process.env, riot_launched: 'true' },
    detached: true,
    stdio: 'ignore',
  }).unref();
  process.stdout.write('  관전 창 실행 — 스트림 대기 중');

  const result = await waitForStream();
  if (result === 'ok') {
    console.log('\n  ✅ 스트림 수신 성공\n');
    console.log('오버레이:  http://127.0.0.1:3200/overlay.html   (node overlay/proxy.mjs 필요)');
    process.exit(0);
  }
  burned.add(game.gameId);
  console.log(`\n  ✗ ${result === 'died' ? '청크 수신 실패로 게임이 종료됨' : '시간 초과'}`);
  if (attempt < tries) console.log('  다른 게임으로 다시 시도합니다…');
}

if (!flag('keep')) await killGame();
die(
  `${tries}번 시도했지만 관전 스트림을 못 받았습니다.\n` +
    '  op.gg 관전 프록시는 게임마다 편차가 있습니다(실측 성공률 약 40%).\n' +
    '  --retry 5 처럼 횟수를 늘리거나, 잠시 뒤 다시 시도하세요.',
);

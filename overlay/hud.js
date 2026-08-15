/**
 * 관전 오버레이 렌더러 — LCK 중계 레이아웃.
 *
 * 데이터는 롤 클라이언트의 Live Client Data API 하나뿐이고, proxy.mjs 가 /game/* 로
 * 중계해 준다. 관전 모드에서는 10명 전원의 챔피언·레벨·KDA·CS·아이템·룬·스펠·생사가 온다.
 *
 * [실제 관전 응답으로 확인한 제약 — 2026-08-14]
 *  · 골드 없음. activePlayer 가 {"error":"Spectator mode doesn't currently support this feature"} 다.
 *  · 체력·마나 없음. allPlayers 에 필드 자체가 없어서 LCK 의 그 초록/파랑 바는 못 그린다.
 *  · 이벤트는 "관전을 시작한 시점" 부터만 온다. 6분에 붙으면 GameStart 의 EventTime 이 360 이다.
 *    선수 KDA·CS 는 누적이라 정확하지만, 그 전에 깨진 포탑·먹힌 용은 영영 안 온다.
 *
 * ?mock=1 을 붙이면 게임 없이 가짜 데이터로 화면을 확인할 수 있다.
 */

import { TRACKED, WAITING, FEED_MS, POLL_MS, DRAKE, BARON_MS, ELDER_MS, SPAWN, TOP_RIVER, CS_GOLD, BOUNTY } from './config.js';
import { MOCK } from './mock.js';

const $ = (sel) => document.querySelector(sel);
const mock = new URLSearchParams(location.search).has('mock');

/* ------------------------------------------------------------------ */
/* 에셋 — Data Dragon                                                  */
/* ------------------------------------------------------------------ */

const DD = 'https://ddragon.leagueoflegends.com/cdn';
let version = '';
const runeIcon = new Map();

/** 게임 API 는 패치 번호를 주지 않으므로 최신 Data Dragon 을 쓴다. */
async function loadAssets() {
  const vs = await (await fetch('https://ddragon.leagueoflegends.com/api/versions.json')).json();
  version = vs[0];
  try {
    const styles = await (await fetch(`${DD}/${version}/data/ko_KR/runesReforged.json`)).json();
    for (const s of styles) for (const slot of s.slots) for (const r of slot.runes) runeIcon.set(r.id, r.icon);
  } catch {
    // 룬 아이콘은 없어도 나머지가 나가야 한다
  }
}

/** "game_character_displayname_DrMundo" → "DrMundo" */
const champKey = (raw, fallback) =>
  (raw?.match(/game_character_displayname_(.+)$/)?.[1] ?? fallback ?? '').replace(/[^A-Za-z0-9]/g, '');

/** "GeneratedTip_SummonerSpell_SummonerFlash_DisplayName" → "SummonerFlash" */
const spellKey = (raw) => raw?.match(/SummonerSpell_(Summoner[A-Za-z]+)_/)?.[1] ?? '';

const champImg = (p) => `${DD}/${version}/img/champion/${champKey(p.rawChampionName, p.championName)}.png`;
const itemImg = (id) => `${DD}/${version}/img/item/${id}.png`;
const spellImg = (k) => (k ? `${DD}/${version}/img/spell/${k}.png` : '');
const runeImg = (id) => (runeIcon.has(id) ? `${DD}/img/${runeIcon.get(id)}` : '');

/* ------------------------------------------------------------------ */
/* 정규화                                                              */
/* ------------------------------------------------------------------ */

const norm = (s) => (s ?? '').split('#')[0].trim().toLowerCase();
const tracked = new Set(TRACKED.map(norm).filter(Boolean));
const isTracked = (p) => tracked.has(norm(p.riotIdGameName)) || tracked.has(norm(p.summonerName));

const nameOf = (p) => p.riotIdGameName || p.summonerName || '';
const clock = (s) => {
  const t = Math.max(0, Math.floor(s || 0));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
};

const esc = (s) => String(s ?? '').replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[c]);

/* ------------------------------------------------------------------ */
/* 오브젝트 집계                                                        */
/* ------------------------------------------------------------------ */

/**
 * 포탑은 킬러가 아니라 "누구 포탑인가" 로 센다 — 미니언이 막타를 가져가는 일이 흔해서
 * KillerName 으로 세면 어긋난다. Turret_T1_* 은 블루 소유이므로 레드가 깬 것이다.
 */
function objectives(events, teamOf) {
  const z = () => ({ towers: 0, inhibs: 0, barons: 0, drakes: [] });
  const out = { ORDER: z(), CHAOS: z() };

  for (const e of events ?? []) {
    switch (e.EventName) {
      case 'TurretKilled':
        out[/_T1_/.test(e.TurretKilled) ? 'CHAOS' : 'ORDER'].towers++;
        break;
      case 'InhibKilled':
        out[/_T1_/.test(e.InhibKilled) ? 'CHAOS' : 'ORDER'].inhibs++;
        break;
      case 'DragonKill': {
        const t = teamOf.get(e.KillerName);
        if (t) out[t].drakes.push(e.DragonType);
        break;
      }
      case 'BaronKill': {
        const t = teamOf.get(e.KillerName);
        if (t) out[t].barons++;
        break;
      }
      default:
        break;
    }
  }
  // 처치자를 못 찾은 오브젝트는 세지 않는다. 추정해서 채우면 화면이 조용히 틀려진다.
  const start = (events ?? []).find((e) => e.EventName === 'GameStart');
  out.partial = (start?.EventTime ?? 0) > 30;
  return out;
}

/* ------------------------------------------------------------------ */
/* 바론 · 장로 버프                                                     */
/* ------------------------------------------------------------------ */

/**
 * 버프는 API 가 안 준다. 이벤트에서 유도한다.
 *
 *  · BaronKill              → 그 팀이 바론 버프 획득
 *  · DragonKill(Elder)      → 그 팀이 장로 버프 획득
 *
 * 둘 다 지속시간이 지나면 사라지고, 그 사이에 죽은 선수는 개인적으로 잃는다.
 * 죽었는지는 scores.deaths 가 버프 시작 이후 늘었는지로 판정한다 — 버프가 걸린 순간의
 * 데스 수를 기억해 두고 비교한다.
 *
 * 한계: 관전을 시작하기 전에 먹은 바론·장로는 이벤트가 없어 잡히지 않는다.
 */
const buffState = { ORDER: {}, CHAOS: {} };   // { baron: {until, deaths:{이름:수}}, elder: {...} }

function trackBuffs(events, players, gameTime) {
  const deathsNow = new Map(players.map((p) => [nameOf(p), p.scores?.deaths ?? 0]));

  for (const e of events ?? []) {
    const team = e.__team;
    if (!team) continue;
    const kind =
      e.EventName === 'BaronKill' ? 'baron'
      : e.EventName === 'DragonKill' && e.DragonType === 'Elder' ? 'elder'
      : null;
    if (!kind) continue;

    const dur = (kind === 'baron' ? BARON_MS : ELDER_MS) / 1000;
    const until = (e.EventTime ?? 0) + dur;
    const cur = buffState[team][kind];
    // 같은 이벤트를 매 폴링마다 다시 반영하지 않도록 만료 시각으로 비교한다
    if (!cur || cur.until < until) {
      buffState[team][kind] = { until, deaths: Object.fromEntries(deathsNow) };
    }
  }

  const active = { ORDER: {}, CHAOS: {} };
  for (const team of ['ORDER', 'CHAOS']) {
    for (const kind of ['baron', 'elder']) {
      const b = buffState[team][kind];
      if (!b) continue;
      if (gameTime >= b.until) { delete buffState[team][kind]; continue; }
      active[team][kind] = { left: Math.max(0, Math.round(b.until - gameTime)), at: b.deaths };
    }
  }
  return active;
}

/** 이 선수가 지금 그 버프를 갖고 있는가 — 버프 시작 뒤에 죽었으면 잃었다 */
function hasBuff(p, buff) {
  if (!buff) return false;
  if (p.isDead) return false;
  const before = buff.at[nameOf(p)];
  return before == null || (p.scores?.deaths ?? 0) <= before;
}

/* ------------------------------------------------------------------ */
/* 경제 지표 — 골드 대용                                                 */
/* ------------------------------------------------------------------ */

/**
 * 관전 API 에는 골드가 없다(activePlayer 가 error). 대신 items[].price 는 실제로 오므로
 * 팀별 장비 가치를 합쳐 격차를 낸다. 골드와 같지 않다 —
 * 안 쓰고 들고 있는 골드와 되판 아이템은 안 잡힌다. 그래서 화면에도 "장비" 라고 쓴다.
 */
/**
 * 선수 한 명의 획득 골드 — **추정치**.
 *
 *   장비 가치(items[].price 합, 실측)  +  CS × 평균 단가(추정)
 *
 * 진짜 골드가 아니다. 안 쓰고 들고 있는 골드·되판 아이템·처치 보상은 안 잡히고,
 * CS 환산은 평균값이라 정글/라인 구성에 따라 어긋난다. 화면에 "추정" 을 다는 이유다.
 */
function goldOf(p) {
  const gear = (p.items ?? []).reduce((n, i) => n + (i.price ?? 0) * (i.count ?? 1), 0);
  return gear + (p.scores?.creepScore ?? 0) * CS_GOLD;
}

/**
 * 현상금 — API 에 없어서 연속 처치를 직접 세어 추정한다.
 *
 * 킬이 늘고 데스가 그대로면 연속이 이어지고, 죽으면 0 으로 돌아간다.
 * 관전을 시작하기 전에 쌓인 연속 처치는 알 수 없으므로 0 에서 출발한다.
 */
const streaks = new Map();   // 이름 → { kills, deaths, streak }

function bountyOf(p) {
  const id = nameOf(p);
  const k = p.scores?.kills ?? 0;
  const d = p.scores?.deaths ?? 0;
  const prev = streaks.get(id);
  if (!prev) {
    streaks.set(id, { kills: k, deaths: d, streak: 0 });
    return 0;
  }
  if (d > prev.deaths) prev.streak = 0;
  else if (k > prev.kills) prev.streak += k - prev.kills;
  prev.kills = k;
  prev.deaths = d;
  return BOUNTY[Math.min(prev.streak, BOUNTY.length - 1)] ?? 0;
}

function economy(players) {
  const worth = players.reduce((n, p) => n + goldOf(p), 0);
  return {
    worth,
    levels: players.reduce((n, p) => n + (p.level ?? 0), 0),
    cs: players.reduce((n, p) => n + (p.scores?.creepScore ?? 0), 0),
  };
}

const kilo = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n));

/* ------------------------------------------------------------------ */
/* 오브젝트 스폰 타이머                                                  */
/* ------------------------------------------------------------------ */

/** 어떤 이벤트가 어떤 오브젝트를 죽인 것인가 */
const KILL_EVENT = {
  grubs: (e) => e.EventName === 'HordeKill',
  herald: (e) => e.EventName === 'HeraldKill',
  baron: (e) => e.EventName === 'BaronKill',
  dragon: (e) => e.EventName === 'DragonKill' && e.DragonType !== 'Elder',
};

/**
 * 다음 스폰까지 남은 시간.
 *
 * 마지막 처치 이벤트를 봤으면 그 시각 + 리스폰으로 계산하고, 못 봤으면 고정 스케줄을 쓴다.
 * 관전을 늦게 시작하면 이전 처치를 못 봤을 수 있으므로 그때는 "추정" 으로 표시한다.
 * 스폰 시각 자체가 패치마다 바뀌는 값이라 확정처럼 보이면 안 된다.
 */
function spawnTimers(events, gameTime, partial) {
  const out = {};
  for (const [key, cfg] of Object.entries(SPAWN)) {
    const kills = (events ?? []).filter(KILL_EVENT[key]);
    const last = kills.at(-1);

    let next = null;
    let est = false;
    if (last && cfg.respawn != null) {
      next = (last.EventTime ?? 0) + cfg.respawn;
    } else if (last && cfg.respawn == null) {
      next = null;                       // 한 번만 나오는 오브젝트를 이미 먹었다
    } else if (gameTime < cfg.first) {
      next = cfg.first;
      est = true;
    } else {
      // 첫 등장 시각은 지났는데 처치 기록이 없다 — 이미 먹혔는지 아직 살아있는지 모른다
      next = partial ? null : cfg.first;
      est = true;
    }

    out[key] = {
      ko: cfg.ko,
      left: next == null ? null : Math.round(next - gameTime),
      est,
      until: cfg.until,
      gone: last != null && cfg.respawn == null,
    };
  }
  return out;
}

/**
 * 상단 강에서 "지금 차례" 인 오브젝트 하나.
 *
 * 유충 → 전령 → 바론 순으로 자리를 물려받는다. 먹혔거나(gone) 사라질 시각(until)이
 * 지났으면 다음으로 넘어간다. 셋을 동시에 띄우면 무엇을 봐야 할지 흐려진다.
 */
function currentTopRiver(timers, gameTime) {
  for (const k of TOP_RIVER) {
    const o = timers[k];
    if (!o || o.gone) continue;
    if (o.until != null && gameTime >= o.until) continue;
    return k;
  }
  return TOP_RIVER.at(-1);
}

function renderTimers(t, keys) {
  return keys
    .map((k) => {
      const o = t[k];
      if (!o || o.gone) return '';
      let cls = '';
      let v = '?';
      if (o.left == null) cls = 'unknown';
      else if (o.left <= 0) { v = '●'; cls = 'up'; }
      else { v = clock(o.left); cls = o.left <= 30 ? 'soon' : ''; }
      return `<div class="tm ${cls}${o.est ? ' est' : ''}"><span class="ko">${o.ko}</span><span class="v">${v}</span></div>`;
    })
    .join('');
}

/* ------------------------------------------------------------------ */
/* 렌더                                                                */
/* ------------------------------------------------------------------ */

function itemSlots(p) {
  const items = (p.items ?? []).slice().sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0));
  return Array.from({ length: 6 }, (_, i) => items.find((it) => it.slot === i));
}

function renderPlayer(p, buffs) {
  const s = p.scores ?? {};
  const sp1 = spellKey(p.summonerSpells?.summonerSpellOne?.rawDisplayName);
  const sp2 = spellKey(p.summonerSpells?.summonerSpellTwo?.rawDisplayName);
  const ks = p.runes?.keystone?.id;
  const tree = p.runes?.secondaryRuneTree?.id;

  const baron = hasBuff(p, buffs.baron);
  const elder = hasBuff(p, buffs.elder);

  const el = document.createElement('div');
  el.className = ['p', p.isDead && 'dead', isTracked(p) && 'hl', baron && 'baron', elder && 'elder']
    .filter(Boolean)
    .join(' ');

  const icon = (src) => (src ? `<img src="${src}" alt="">` : '<i></i>');
  el.innerHTML = `
    <div class="head">
      <span class="nm"></span>
      <span class="kda">${s.kills ?? 0}<i>/</i>${s.deaths ?? 0}<i>/</i>${s.assists ?? 0}</span>
    </div>
    <div class="card">
      <div class="kit">
        ${icon(ks ? runeImg(ks) : '')}${icon(tree ? runeImg(tree) : '')}
        ${icon(spellImg(sp1))}${icon(spellImg(sp2))}
      </div>
      <div class="por">
        <img src="${champImg(p)}" alt="">
        <span class="lv">${p.level ?? 0}</span>
        <span class="rez">${Math.ceil(p.respawnTimer ?? 0)}</span>
      </div>
      <span class="cs">${s.creepScore ?? 0} CS</span>
    </div>`;
  // 소환사명은 사용자 입력이라 textContent 로만 넣는다
  el.querySelector('.nm').textContent = nameOf(p);
  return el;
}

function renderSide(side, obj, eco) {
  const label = side === 'ORDER' ? '블루' : '레드';
  return `
    <span class="edge"></span>
    <div>
      <div class="tag">${label}</div>
      <div class="sub">장비 ${kilo(eco.worth)} · Lv ${eco.levels} · CS ${eco.cs}</div>
    </div>`;
}

/** 장비 가치 격차 — 가운데를 0 으로 두고 앞선 쪽으로 자란다 */
function renderEcon(b, r) {
  const lead = b.worth - r.worth;
  // 5000g 차이면 절반이 꽉 찬다. 그쯤이면 이미 크게 벌어진 경기다.
  const pct = Math.min(50, (Math.abs(lead) / 5000) * 50);
  const side = lead >= 0 ? 'left:50%' : `right:50%`;
  const color = lead >= 0 ? 'var(--blue)' : 'var(--red)';
  return `
    <div class="econbar"><i style="${lead >= 0 ? `left:50%` : `right:50%`};width:${pct}%;background:${color}"></i></div>
    <div class="econv" style="color:${lead === 0 ? 'var(--mute)' : color}">
      ${lead === 0 ? '장비 동률' : `장비 ${lead > 0 ? '블루' : '레드'} +${kilo(Math.abs(lead))}`}
    </div>`;
}

function renderObj(obj) {
  const drakes = (obj.drakes ?? [])
    .map((d) => `<i title="${esc(DRAKE[d]?.ko ?? d)}" style="background:${DRAKE[d]?.color ?? '#888'}"></i>`)
    .join('');
  return `
    <span>포탑 <b>${obj.towers}</b></span>
    <span>바론 <b>${obj.barons}</b></span>
    <span class="drakes">${drakes || '<i style="background:rgba(255,255,255,.12)"></i>'}</span>`;
}

/**
 * 하단 스코어보드 한 줄 — 같은 자리(라인) 맞대결끼리 마주 본다.
 *
 *   [닉][Lv][아이템][KDA][CS] [챔프] ←골드차→ [챔프] [CS][KDA][아이템][Lv][닉]
 *
 * 가운데 골드 차이는 그 두 선수 사이의 값이고, 화살표는 앞선 쪽을 가리킨다.
 * 진짜 골드가 아니라 추정이므로 값 옆에 그 표시를 둔다.
 */
function boardRow(b, r) {
  const cell = (p, right) => {
    const s = p?.scores ?? {};
    const items = p
      ? itemSlots(p).map((it) => `<i${it ? ` style="background-image:url(${itemImg(it.itemID)})"` : ''}></i>`).join('')
      : '';
    return {
      nm: `<div class="bn${right ? ' r' : ''}">${esc(p ? nameOf(p) : '')}</div>`,
      lv: `<div class="lv">${p?.level ?? ''}</div>`,
      items: `<div class="bi${right ? ' r' : ''}">${items}</div>`,
      kda: `<div class="bk">${s.kills ?? 0}<i>/</i>${s.deaths ?? 0}<i>/</i>${s.assists ?? 0}</div>`,
      cs: `<div class="bc">${s.creepScore ?? 0}</div>`,
    };
  };
  const L = cell(b, false);
  const R = cell(r, true);

  const diff = (b ? goldOf(b) : 0) - (r ? goldOf(r) : 0);
  const arrow = diff === 0 ? '' : diff > 0 ? '◀' : '▶';
  const cls = diff === 0 ? '' : diff > 0 ? ' b' : ' r';
  const gd = `<div class="gd${cls}">${arrow}<span>${diff === 0 ? '—' : kilo(Math.abs(diff))}</span></div>`;

  return `
    <div class="row">
      ${L.nm}${L.lv}${L.items}${L.kda}${L.cs}
      <img class="ch" src="${b ? champImg(b) : ''}" alt="">
      ${gd}
      <img class="ch" src="${r ? champImg(r) : ''}" alt="">
      ${R.cs}${R.kda}${R.items}${R.lv}${R.nm}
    </div>`;
}

/* 킬 피드는 새 이벤트만 밀어 넣는다 — 매 프레임 다시 그리면 애니메이션이 계속 튄다 */
const seen = new Set();

function pushEvents(events, teamOf) {
  const feed = $('#feed');
  for (const e of events ?? []) {
    if (seen.has(e.EventID)) continue;
    seen.add(e.EventID);
    const line = describe(e, teamOf);
    if (!line) continue;

    const el = document.createElement('div');
    el.className = 'ev';
    el.innerHTML = line;
    feed.prepend(el);
    setTimeout(() => {
      el.classList.add('fade');
      setTimeout(() => el.remove(), 700);
    }, FEED_MS);
  }
  while (feed.children.length > 6) feed.lastChild.remove();
}

function describe(e, teamOf) {
  const who = (name) => {
    const t = teamOf.get(name);
    const cls = t === 'ORDER' ? 'b' : t === 'CHAOS' ? 'r' : '';
    return `<b class="${cls}">${esc(name)}</b>`;
  };
  switch (e.EventName) {
    case 'ChampionKill': return `${who(e.KillerName)} <span class="tag">처치</span> ${who(e.VictimName)}`;
    case 'DragonKill':   return `${who(e.KillerName)} <span class="tag">${esc(DRAKE[e.DragonType]?.ko ?? '드래곤')}</span>`;
    case 'BaronKill':    return `${who(e.KillerName)} <span class="tag">바론</span>`;
    case 'HeraldKill':   return `${who(e.KillerName)} <span class="tag">전령</span>`;
    case 'TurretKilled': return `<span class="tag">포탑 파괴</span>`;
    case 'InhibKilled':  return `<span class="tag">억제기 파괴</span>`;
    case 'Ace':          return `${who(e.Acer)} <span class="tag">에이스</span>`;
    case 'FirstBlood':   return `${who(e.Recipient)} <span class="tag">first blood</span>`;
    case 'Multikill':    return `${who(e.KillerName)} <span class="tag">${e.KillStreak}연속 처치</span>`;
    default:             return '';
  }
}

/* ------------------------------------------------------------------ */
/* 루프                                                                */
/* ------------------------------------------------------------------ */

const ROLE = ['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY'];
const byRole = (a, b) => ROLE.indexOf(a.position) - ROLE.indexOf(b.position);

function draw(data) {
  const all = data.allPlayers ?? [];
  const teamOf = new Map();
  for (const p of all) {
    teamOf.set(p.summonerName, p.team);
    if (p.riotIdGameName) teamOf.set(p.riotIdGameName, p.team);
  }

  // 이벤트에 팀을 미리 붙여둔다 — 버프 추적과 오브젝트 집계가 같은 값을 본다
  const events = (data.events?.Events ?? []).map((e) => ({ ...e, __team: teamOf.get(e.KillerName) }));

  const blue = all.filter((p) => p.team === 'ORDER').sort(byRole);
  const red = all.filter((p) => p.team === 'CHAOS').sort(byRole);
  const kills = (list) => list.reduce((n, p) => n + (p.scores?.kills ?? 0), 0);
  const gameTime = data.gameData?.gameTime ?? 0;

  const obj = objectives(events, teamOf);
  const buffs = trackBuffs(events, all, gameTime);

  $('#railB').replaceChildren(...blue.map((p) => renderPlayer(p, buffs.ORDER)));
  $('#railR').replaceChildren(...red.map((p) => renderPlayer(p, buffs.CHAOS)));
  const ecoB = economy(blue);
  const ecoR = economy(red);
  $('#sideB').innerHTML = renderSide('ORDER', obj.ORDER, ecoB);
  $('#sideR').innerHTML = renderSide('CHAOS', obj.CHAOS, ecoR);
  $('#econ').innerHTML = renderEcon(ecoB, ecoR);
  $('#objB').innerHTML = renderObj(obj.ORDER);
  $('#objR').innerHTML = renderObj(obj.CHAOS);
  $('#kb').textContent = kills(blue);
  $('#kr').textContent = kills(red);
  // 현상금은 팀에서 가장 높은 사람 것을 킬 숫자 위에 작게 (추정)
  const topBounty = (list) => Math.max(0, ...list.map(bountyOf));
  $('#bb').textContent = topBounty(blue) ? `현상금 ${topBounty(blue)}` : '';
  $('#br').textContent = topBounty(red) ? `현상금 ${topBounty(red)}` : '';
  $('#clock').textContent = clock(gameTime);

  $('#boardRows').innerHTML = Array.from({ length: 5 }, (_, i) => boardRow(blue[i], red[i])).join('');

  // 왼쪽 위 = 상단 강(지금 차례 하나), 오른쪽 위 = 하단 강(용)
  const timers = spawnTimers(events, gameTime, !!obj.partial);
  $('#timersL').innerHTML = renderTimers(timers, [currentTopRiver(timers, gameTime)]);
  $('#timersR').innerHTML = renderTimers(timers, ['dragon']);
  $('#buffs').innerHTML = renderBuffs(buffs);

  document.body.classList.toggle('partial', !!obj.partial);
  pushEvents(events, teamOf);
  document.body.classList.add('live');
}

function renderBuffs(buffs) {
  const out = [];
  for (const [team, label] of [['ORDER', '블루'], ['CHAOS', '레드']]) {
    for (const [kind, ko] of [['elder', '장로'], ['baron', '바론']]) {
      const b = buffs[team][kind];
      if (b) out.push(`<div class="bf ${kind}"><span class="who">${label}</span>${ko} ${clock(b.left)}</div>`);
    }
  }
  return out.join('');
}

let busy = false;
let misses = 0;

async function tick() {
  if (busy) return;
  busy = true;
  try {
    const data = mock ? MOCK() : await (await fetch('/game/liveclientdata/allgamedata')).json();
    if (data.offline || !data.allPlayers?.length) throw new Error('offline');
    draw(data);
    misses = 0;
    document.body.classList.remove('stale');
  } catch {
    // 관전 중 한두 번 끊기는 건 흔하다. 몇 번 연속 놓쳤을 때만 화면을 내린다.
    if (++misses > 6) {
      document.body.classList.remove('live');
      document.body.classList.add('stale');
    }
  } finally {
    busy = false;
  }
}

const scale = () => document.documentElement.style.setProperty('--k', String(window.innerWidth / 1920));

$('#waitTitle').textContent = WAITING.title;
$('#waitBody').textContent = WAITING.body;
if (!TRACKED.length) $('#waitHint').textContent = 'overlay/config.js 의 TRACKED 에 선수 라이엇 ID를 넣으면 강조됩니다.';

scale();
addEventListener('resize', scale);
await loadAssets();
tick();
setInterval(tick, POLL_MS);

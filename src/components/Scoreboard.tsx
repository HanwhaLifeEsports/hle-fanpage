'use client';

/* eslint-disable @next/next/no-img-element --
   챔피언·아이템·룬 아이콘은 22~46px 스프라이트가 한 화면에 60개 넘게 깔리고,
   폴링마다 조합이 바뀐다. Data Dragon 이 이미 불변 URL + 장기 캐시로 내려주므로
   next/image 최적화기를 태우면 캐시만 한 겹 늘고 얻는 게 없다. */

import { useCallback, useEffect, useState } from 'react';
import { Radio, RotateCw } from 'lucide-react';
import type { LiveGamePayload } from '@/app/api/livegame/route';
import type { DragonType, LivePlayer, LiveTeam, Snapshot } from '@/lib/livestats';

/**
 * 중계 옵저버 화면을 웹으로 옮긴 스코어보드.
 *
 * 중계와 다른 점은 가운데에 경기 영상이 없다는 것이다. 그래서 선수 레일을
 * 양옆으로 넓게 벌리고(중계는 좁은 세로 띠) 아이템·CS·골드까지 한 줄에 담았다.
 * 비는 가운데는 팀 단위 정보 — 골드 격차와 오브젝트 — 가 받는다.
 *
 * 피드가 실시간보다 약 1분 늦기 때문에, 방송을 같이 틀어놓고 보면 이 화면이
 * 한 박자 뒤에 움직인다. 스포일러가 아니라 지연이라는 걸 화면에 적어둔다.
 */

const ROLE_LABEL: Record<string, string> = {
  top: '탑',
  jungle: '정글',
  mid: '미드',
  bottom: '원딜',
  support: '서폿',
};

/** 용은 개수보다 무엇을 먹었는지가 정보다 */
const DRAKE: Record<DragonType, { label: string; color: string }> = {
  infernal: { label: '화염', color: '#E5484D' },
  mountain: { label: '대지', color: '#C08A4A' },
  ocean: { label: '바다', color: '#3FA9E0' },
  cloud: { label: '바람', color: '#9FD8CE' },
  hextech: { label: '마공', color: '#7FD3F5' },
  chemtech: { label: '화학공학', color: '#7FBF3F' },
  elder: { label: '장로', color: '#B9A6FF' },
};

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const gold = (g: number) => `${(g / 1000).toFixed(1)}K`;

export default function Scoreboard({ matchId }: { matchId?: string }) {
  const [data, setData] = useState<LiveGamePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  /** null 이면 최신 프레임. 숫자면 다시보기로 그 시점을 고정해 본다 */
  const [seek, setSeek] = useState<number | null>(null);
  /** 수동 재시도용 — 값이 바뀌면 폴링 루프를 처음부터 다시 돈다 */
  const [retry, setRetry] = useState(0);

  const fetchOne = useCallback(async (): Promise<LiveGamePayload> => {
    const q = new URLSearchParams();
    if (matchId) q.set('match', matchId);
    if (gameId) q.set('game', gameId);
    if (seek != null) q.set('clock', String(seek));
    const res = await fetch(`/api/livegame?${q}`, { cache: 'no-store' });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
    return body as LiveGamePayload;
  }, [matchId, gameId, seek]);

  /*
   * 응답 반영은 반드시 이 이펙트 안에서 한다. fetch 안에서 바로 setState 하면
   * 세트를 바꾸는 순간 이전 세트의 늦은 응답이 나중에 도착해 화면을 덮어쓴다.
   * alive 플래그가 그 경주를 끊는다.
   *
   * 다시보기로 시점을 고정하면 값이 변할 일이 없으므로 폴링하지 않는다.
   */
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let fails = 0;

    const tick = async () => {
      try {
        const body = await fetchOne();
        if (!alive) return;
        fails = 0;
        setData(body);
        setError(null);
        if (body.pollMs != null && seek == null) timer = setTimeout(tick, body.pollMs);
      } catch (e) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : '불러오지 못했습니다');
        // 경기 중 한 번 끊겼다고 화면이 멈추면 안 되니 몇 번은 스스로 다시 붙는다.
        // 계속 실패하면 그만두고 사용자에게 재시도 버튼을 맡긴다.
        if (++fails <= 5) timer = setTimeout(tick, 8_000);
      }
    };

    tick();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [fetchOne, seek, retry]);

  if (error && !data) {
    return (
      <div className="empty">
        <b>스코어보드를 불러오지 못했습니다</b>
        <span>{error}</span>
        <button className="btn btn-ghost btn-sm" onClick={() => setRetry((n) => n + 1)}>
          <RotateCw size={15} />
          다시 시도
        </button>
      </div>
    );
  }
  if (!data) return <Skeleton />;

  const s = data.snapshot;
  return (
    <>
      <div className="hudtop">
        <TeamHead t={s.blue} bo={s.bo} />
        <div className="clock">
          <div className="k">
            {s.blue.kills}
            <em>{s.state === 'finished' ? '종료' : clock(s.clock)}</em>
            {s.red.kills}
          </div>
          <div className="t">
            {s.live ? (
              <span className="livestat on">
                <Radio size={13} />
                LIVE · 약 1분 지연
              </span>
            ) : (
              `${s.gameNumber}세트 · ${s.bo === 1 ? '단판' : `BO${s.bo}`}`
            )}
          </div>
        </div>
        <TeamHead t={s.red} bo={s.bo} right />
      </div>

      <div className="hudbody">
        <Rail t={s.blue} />
        <Middle s={s} />
        <Rail t={s.red} />
      </div>

      {s.duration != null && (
        <div className="hudtime">
          <span className="v">{clock(seek ?? s.clock)}</span>
          <input
            type="range"
            min={0}
            max={s.duration}
            step={10}
            value={seek ?? s.clock}
            aria-label="경기 시점"
            onChange={(e) => setSeek(Number(e.target.value))}
          />
          <span className="v">{clock(s.duration)}</span>
        </div>
      )}

      {s.games.filter((g) => g.state !== 'unneeded').length > 1 && (
        <div className="gametabs" style={{ marginTop: 'var(--s3)' }}>
          {s.games
            .filter((g) => g.state !== 'unneeded')
            .map((g) => (
              <button
                key={g.id}
                className={`chip${g.id === s.gameId ? ' on' : ''}`}
                disabled={g.state === 'unstarted'}
                onClick={() => {
                  setGameId(g.id);
                  setSeek(null);
                }}
              >
                {g.number}세트
              </button>
            ))}
        </div>
      )}

      <p className="note">
        데이터 출처는 LoL Esports 라이브스탯 피드입니다. 소환사 주문과 미니맵은 피드에 없어 표시하지
        않습니다. {error && <b>갱신 실패: {error}</b>}
      </p>
    </>
  );
}

const sideColor = (side: string) => (side === 'blue' ? 'var(--hud-blue)' : 'var(--hud-red)');
const sideLabel = (side: string) => (side === 'blue' ? '블루' : '레드');

function Rail({ t }: { t: LiveTeam }) {
  return (
    <div className={`hudrail ${t.side}`}>
      <div className="railhead">
        <i style={{ background: sideColor(t.side) }} />
        <b>{t.code}</b>
        {sideLabel(t.side)} 진영
      </div>
      {t.players.map((p) => (
        <Player key={p.id} p={p} />
      ))}
    </div>
  );
}

function TeamHead({ t, bo, right }: { t: LiveTeam; bo: number; right?: boolean }) {
  return (
    <div className={`side${right ? ' r' : ''}`}>
      {t.image ? <img src={t.image} alt="" /> : null}
      <div style={{ minWidth: 0, textAlign: right ? 'right' : 'left' }}>
        <div className="nm" title={`${t.name} · ${sideLabel(t.side)} 진영`}>
          <i style={{ background: sideColor(t.side) }} />
          {t.code}
          {/* 딴 세트 수. 팀명 옆에 붙어 있어야 "이 팀이 몇 세트를 땄다"로 읽힌다 */}
          <span className="setdots">
            {Array.from({ length: Math.ceil(bo / 2) }, (_, i) => (
              <i key={i} className={i < t.seriesWins ? 'on' : undefined} />
            ))}
          </span>
        </div>
        <div className="stats" style={{ justifyContent: right ? 'flex-end' : 'flex-start' }}>
          <span>
            <b>{gold(t.gold)}</b> 골드
          </span>
          <span>
            포탑 <b>{t.towers}</b>
          </span>
        </div>
      </div>
    </div>
  );
}

function Player({ p }: { p: LivePlayer }) {
  const alive = p.hpMax > 0 && p.hp > 0;
  const hpPct = p.hpMax > 0 ? Math.round((p.hp / p.hpMax) * 100) : 0;
  return (
    <div className={`hudp${alive ? '' : ' dead'}`}>
      <div className="por">
        <img className="ch" src={p.championIcon} alt={p.champion} loading="lazy" />
        <span className="lv">{p.level}</span>
        {p.keystone && <img className="ks" src={p.keystone} alt="" loading="lazy" />}
      </div>
      <div className="main">
        <div className="l1">
          <b>{p.name}</b>
          <span>
            {ROLE_LABEL[p.role]} · {p.champion}
          </span>
          <span className="kda">
            {p.kills} <em>/</em> {p.deaths} <em>/</em> {p.assists}
          </span>
        </div>
        <div className="hp" title={`${p.hp} / ${p.hpMax}`}>
          <i style={{ width: `${hpPct}%` }} />
        </div>
        <div className="l2">
          <span className="fig">
            {p.cs} CS · {gold(p.gold)}
          </span>
          <div className="items">
            {p.items.map((src, i) => (
              <i key={i} style={src ? { backgroundImage: `url(${src})` } : undefined} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Middle({ s }: { s: Snapshot }) {
  const lead = s.blue.gold - s.red.gold;
  // 5K 차이면 절반이 꽉 찬다. 그쯤이면 이미 크게 벌어진 경기라, 그 위를 더 그려도 읽히는 게 없다
  const pct = Math.min(50, (Math.abs(lead) / 5_000) * 50);
  const ahead = lead >= 0 ? s.blue : s.red;

  return (
    <div className="hudmid">
      <div className="lead">
        <b style={{ color: lead === 0 ? undefined : 'var(--flame)' }}>
          {lead === 0 ? '동률' : `+${gold(Math.abs(lead))}`}
        </b>
        <span>{lead === 0 ? '골드' : `${ahead.code} 골드 우세`}</span>
      </div>
      <div className="goldbar" style={{ color: sideColor(lead >= 0 ? 'blue' : 'red') }}>
        <i
          style={
            lead >= 0
              ? { right: '50%', width: `${pct}%` }
              : { left: '50%', width: `${pct}%` }
          }
        />
      </div>

      <div>
        <Obj label="포탑" a={s.blue.towers} b={s.red.towers} />
        <Obj label="억제기" a={s.blue.inhibitors} b={s.red.inhibitors} />
        <Obj label="바론" a={s.blue.barons} b={s.red.barons} />
        <div className="objrow">
          <Drakes list={s.blue.dragons} />
          <span>드래곤</span>
          <Drakes list={s.red.dragons} right />
        </div>
      </div>
    </div>
  );
}

function Obj({ label, a, b }: { label: string; a: number; b: number }) {
  return (
    <div className="objrow">
      <b>{a}</b>
      <span>{label}</span>
      <b>{b}</b>
    </div>
  );
}

function Drakes({ list, right }: { list: DragonType[]; right?: boolean }) {
  return (
    <div className={`drakes${right ? ' r' : ''}`} style={{ flex: 1 }}>
      {list.map((d, i) => (
        <i key={i} title={DRAKE[d]?.label ?? d} style={{ background: DRAKE[d]?.color ?? 'var(--faint)' }} />
      ))}
    </div>
  );
}

function Skeleton() {
  return (
    <>
      <div className="skel-title" style={{ height: 66, width: '100%' }} />
      <div className="hudbody">
        <div className="hudrail">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="skel-card" style={{ height: 66 }} />
          ))}
        </div>
        <div className="skel-card" style={{ height: '100%' }} />
        <div className="hudrail">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="skel-card" style={{ height: 66 }} />
          ))}
        </div>
      </div>
    </>
  );
}

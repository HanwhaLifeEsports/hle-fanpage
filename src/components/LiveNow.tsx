'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import type { LiveResponse, LiveSource } from '@/lib/live-types';
import { fmtClock } from '@/lib/format';
import { ExternalLink, Radio } from 'lucide-react';
import { toast, useApp } from '@/lib/useAppState';

// hls.js 를 끌고 오므로 실제로 열릴 때만 로드한다
const ChzzkPlayer = dynamic(() => import('./ChzzkPlayer'), { ssr: false });

const POLL_MS = 30_000;
/** 치지직 자체 플레이어. 문제가 생기면 환경변수 하나로 전부 끈다. */
const CHZZK_PLAYER_ON = process.env.NEXT_PUBLIC_CHZZK_PLAYER !== 'off';

/** 각 사가 공식 배포하는 브랜드 마크. 출처와 사용 조건은 public/brand/README.md 에 적어 뒀다. */
const BRAND_MARK: Record<string, string> = {
  chzzk: '/brand/chzzk.png',
  soop: '/brand/soop.svg',
  youtube: '/brand/youtube.svg',
};

/**
 * 플랫폼 식별 마크. 마크가 없는 플랫폼(디즈니+ 등)은 기존 색 점으로 떨어뜨린다.
 * dim 은 "방송 중이 아님"을 뜻한다 — 색 점이 나르던 상태 정보를 마크가 이어받는다.
 */
function PlatformMark({ s, dim = false }: { s: LiveSource; dim?: boolean }) {
  const src = BRAND_MARK[s.platform];
  if (!src) return <i className="pd" style={{ background: s.color }} />;
  // eslint-disable-next-line @next/next/no-img-element -- 고정 크기 로컬 아이콘이라 최적화 이득이 없다
  return <img className={`pmark${dim ? ' dim' : ''}`} src={src} alt="" aria-hidden />;
}

function EmbedPlayer({ s }: { s: LiveSource }) {
  const yt = s.platform === 'youtube';
  return (
    <div className="pframe">
      <span className="lbl">
        <PlatformMark s={s} />
        {s.name}
      </span>
      <iframe
        src={s.embedUrl}
        title={`${s.name} 라이브`}
        allow={
          yt
            ? 'accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share'
            : 'autoplay; clipboard-write; web-share; fullscreen'
        }
        allowFullScreen
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}

/** 페이지 안에 띄울 수 없는 채널 — 어디서 볼 수 있는지만 알려준다 */
function LinkCard({ s }: { s: LiveSource }) {
  return (
    <div className="noembed">
      <div>
        <b style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <PlatformMark s={s} />
          {s.name}
          <span className="badge b-soon">{s.role}</span>
          {s.live && (
            <span className="badge b-live">
              <i className="dot" />
              방송 중
            </span>
          )}
        </b>
        <div className="cap" style={{ marginTop: 6 }}>
          {s.live && s.title ? s.title : (s.note ?? '')}
          {s.live && s.viewers ? ` · 시청 ${s.viewers.toLocaleString()}명` : ''}
        </div>
      </div>
      <a className="btn btn-ghost btn-sm" href={s.channelUrl} target="_blank" rel="noopener noreferrer">
        {s.name}에서 보기
        <ExternalLink size={14} />
      </a>
    </div>
  );
}

export default function LiveNow() {
  const { prefs } = useApp();
  const [data, setData] = useState<LiveResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [both, setBoth] = useState(false);
  const wasLive = useRef(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch('/api/live', { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const d: LiveResponse = await res.json();
        if (!alive) return;
        setData(d);
        setErr(null);
        // 꺼짐 → 켜짐 전환 순간에만 알린다
        if (d.isLive && !wasLive.current && prefs.onair) {
          toast('방송이 시작됐습니다', d.sources.find((s) => s.live)?.title ?? 'LCK 중계', '방송 시작 알림');
        }
        wasLive.current = d.isLive;
      } catch (e) {
        if (alive) setErr(e instanceof Error ? e.message : 'unknown');
      }
    };
    void load();
    const t = setInterval(load, POLL_MS);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [prefs.onair]);

  if (!data && !err) {
    return (
      <div className="livebar off">
        <div className="live-head">
          <span className="livestat">
            <Radio size={15} />
            중계 상태 확인 중…
          </span>
        </div>
      </div>
    );
  }

  const sources = data?.sources ?? [];
  const isLive = data?.isLive ?? false;
  const headline = sources.find((s) => s.live)?.title;

  const canPlay = (s: LiveSource) =>
    (s.platform === 'chzzk' && CHZZK_PLAYER_ON && s.live) ||
    (s.embeddable && !!s.embedUrl && (s.live || !s.detectable));

  // 페이지 안에서 볼 수 있는 채널. 치지직을 앞에 둔다.
  const channels = sources
    .filter(canPlay)
    .sort((a, b) => (a.platform === 'chzzk' ? -1 : b.platform === 'chzzk' ? 1 : 0));
  const linkOnly = sources.filter((s) => !canPlay(s));

  // 기본은 한 채널만. 목록이 바뀌어도 선택이 살아 있으면 유지한다.
  const current = channels.find((c) => c.platform === active) ?? channels[0];
  const visible = both ? channels : current ? [current] : [];

  return (
    <div className={`livebar${isLive ? '' : ' off'}`}>
      <div className="live-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {isLive ? (
            <span className="badge b-live">
              <i className="dot" />
              LIVE
            </span>
          ) : (
            <span className="livestat">
              <Radio size={15} />
              중계 대기
            </span>
          )}
          <b style={{ fontSize: 15 }}>{isLive ? (headline ?? 'LCK 중계 진행 중') : '지금은 방송 중이 아닙니다'}</b>
        </div>
        <span className="cap">
          {err ? '상태를 확인하지 못했습니다' : data ? `${fmtClock(data.checkedAt)} 기준` : ''}
        </span>
      </div>

      <div className="plat-tabs">
        {sources.map((s) => {
          const playable = channels.some((c) => c.platform === s.platform);
          const on = playable && visible.some((v) => v.platform === s.platform);
          return (
            <button
              key={s.platform}
              className={`plat${on ? ' on' : ''}`}
              aria-pressed={on}
              onClick={() => {
                if (!playable) {
                  window.open(s.channelUrl, '_blank', 'noopener');
                  return;
                }
                setActive(s.platform);
                setBoth(false);
              }}
            >
              <PlatformMark s={s} dim={s.detectable && !s.live} />
              {s.name}
              {s.live && s.viewers ? (
                <span style={{ color: 'var(--mute)', fontWeight: 400 }}>{s.viewers.toLocaleString()}</span>
              ) : null}
              {!playable && <ExternalLink size={13} />}
            </button>
          );
        })}

        {channels.length > 1 && (
          <button className={`chip${both ? ' on' : ''}`} aria-pressed={both} onClick={() => setBoth((v) => !v)}>
            함께 보기
          </button>
        )}
      </div>

      {visible.length > 0 && (
        <div className={`players${visible.length > 1 ? ' two' : ''}`}>
          {visible.map((s) =>
            s.platform === 'chzzk' ? (
              <ChzzkPlayer key="chzzk" />
            ) : (
              <EmbedPlayer key={s.platform} s={s} />
            ),
          )}
        </div>
      )}

      {linkOnly.map((s) => (
        <LinkCard key={s.platform} s={s} />
      ))}

      <div className="note" style={{ marginTop: 0 }}>
        LCK 국내 중계는 치지직과 SOOP에서 볼 수 있습니다. 유튜브는 하이라이트·다시보기 채널입니다.
      </div>
    </div>
  );
}

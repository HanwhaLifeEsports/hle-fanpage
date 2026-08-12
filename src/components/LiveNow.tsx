'use client';

import { useEffect, useRef, useState } from 'react';
import type { LiveResponse, LiveSource } from '@/lib/live-types';
import { fmtClock } from '@/lib/format';
import { Ki } from './IconSprite';
import { toast, useApp } from '@/lib/useAppState';

const POLL_MS = 30_000;

/** 임베드 가능한 소스만 플레이어로. 치지직·디즈니+는 여기 오지 않는다. */
function Player({ s }: { s: LiveSource }) {
  const yt = s.platform === 'youtube';
  return (
    <div className="pframe">
      <span className="lbl" style={{ color: s.color }}>
        <i className="dot" style={{ background: s.color }} />
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

/** 임베드가 불가능한 채널 — 이유를 밝히고 딥링크만 준다 */
function LinkCard({ s }: { s: LiveSource }) {
  return (
    <div className="noembed">
      <div>
        <b style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <i className="pd" style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
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
          {s.note ?? '플레이어 임베드가 제공되지 않습니다.'}
          {s.live && s.title ? ` · ${s.title}` : ''}
          {s.live && s.viewers ? ` · 시청 ${s.viewers.toLocaleString()}명` : ''}
        </div>
      </div>
      <a
        className={`btn btn-sm ${s.live ? 'btn-primary' : 'btn-ghost'}`}
        href={s.channelUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        {s.name}에서 보기
        <Ki n="external" size={14} />
      </a>
    </div>
  );
}

export default function LiveNow() {
  const { prefs } = useApp();
  const [data, setData] = useState<LiveResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
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
        // 꺼짐 → 켜짐 전환 순간에만 알림. 폴링마다 울리면 안 된다.
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
            <Ki n="cast" />
            중계 상태 확인 중…
          </span>
        </div>
      </div>
    );
  }

  const sources = data?.sources ?? [];
  const isLive = data?.isLive ?? false;
  const headline = sources.find((s) => s.live)?.title;

  // 임베드 가능 + (실제 방송 중이거나 판정 불가한 채널)만 플레이어로 띄운다
  const playable = sources.filter((s) => s.embeddable && s.embedUrl && (s.live || !s.detectable));
  const shown = picked.length ? playable.filter((s) => picked.includes(s.platform)) : playable;
  const links = sources.filter((s) => !s.embeddable || !s.embedUrl);

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
              <Ki n="cast" />
              중계 대기
            </span>
          )}
          <b style={{ fontSize: 15 }}>{isLive ? (headline ?? 'LCK 중계 진행 중') : '지금은 방송 중이 아닙니다'}</b>
        </div>
        <span className="cap">
          {err ? `확인 실패 · ${err}` : data ? `${fmtClock(data.checkedAt)} 확인 · 30초마다 갱신` : ''}
        </span>
      </div>

      {/* 채널 상태 — 점 색이 곧 방송 여부 */}
      <div className="plat-tabs">
        {sources.map((s) => {
          const canToggle = s.embeddable && !!s.embedUrl;
          const on = shown.some((x) => x.platform === s.platform);
          return (
            <button
              key={s.platform}
              className={`plat${on ? ' on' : ''}`}
              title={s.note ?? undefined}
              onClick={() => {
                if (!canToggle) {
                  window.open(s.channelUrl, '_blank', 'noopener');
                  return;
                }
                setPicked((prev) =>
                  prev.includes(s.platform) ? prev.filter((p) => p !== s.platform) : [...prev, s.platform],
                );
              }}
            >
              <i
                className="pd"
                style={{
                  background: s.live ? s.color : s.detectable ? 'rgba(255,255,255,.18)' : 'rgba(255,255,255,.32)',
                }}
              />
              {s.name}
              {s.live && s.viewers ? (
                <span style={{ color: 'var(--mute)', fontWeight: 400 }}>{s.viewers.toLocaleString()}</span>
              ) : null}
              {!canToggle && <Ki n="external" size={13} />}
            </button>
          );
        })}
      </div>

      {/* 플레이어 — 동시 송출이면 나란히 */}
      {shown.length > 0 && (
        <div className={`players${shown.length > 1 ? ' two' : ''}`}>
          {shown.map((s) => (
            <Player key={s.platform} s={s} />
          ))}
        </div>
      )}

      {/* 임베드 불가 채널 */}
      {links.map((s) => (
        <LinkCard key={s.platform} s={s} />
      ))}

      <div className="note" style={{ marginTop: 0 }}>
        2026~2030 LCK 국내 중계권은 <b>네이버(치지직)·SOOP</b> 독점입니다. 라이브 판정은 서버가 두 곳의 API를
        30초마다 폴링해 내립니다 — 브라우저에서 직접 호출하면 CORS로 막히기 때문입니다. 다만{' '}
        <b>치지직은 클립만 iframe 임베드를 지원</b>해서 라이브는 딥링크로만 연결되고, 플레이어를 페이지 안에 띄울
        수 있는 건 SOOP(그리고 국제 대회의 유튜브)뿐입니다.
      </div>
    </div>
  );
}

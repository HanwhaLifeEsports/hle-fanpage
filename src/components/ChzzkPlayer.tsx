'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChzzkStream } from '@/lib/chzzk';

/**
 * 치지직 자체 플레이어.
 *
 * 치지직은 라이브용 iframe 임베드를 제공하지 않는다(클립만 있다). 대신 재생 정보를
 * 그대로 공개하고 CORS 도 열어둬서 hls.js 로 직접 붙을 수 있다.
 * hls.js 는 이 컴포넌트가 실제로 열릴 때만 동적으로 불러온다.
 *
 * 재생 경로 판단 순서가 중요하다. 크로미움은 canPlayType('application/vnd.apple.mpegurl')
 * 에 "maybe" 를 돌려주면서도 실제로는 HLS 를 디먹싱하지 못한다(MEDIA_ERR_SRC_NOT_SUPPORTED).
 * 그래서 hls.js 를 먼저 시도하고, MSE 가 없는 iOS 사파리에서만 네이티브로 떨어진다.
 */
export default function ChzzkPlayer() {
  const ref = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'off'>('loading');
  const [info, setInfo] = useState<ChzzkStream | null>(null);
  const [nonce, setNonce] = useState(0);

  const retry = useCallback(() => {
    setState('loading');
    setNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    let alive = true;
    let destroy: (() => void) | undefined;

    (async () => {
      const s: ChzzkStream = await fetch('/api/chzzk/stream', { cache: 'no-store' }).then((r) => r.json());
      if (!alive) return;
      setInfo(s);
      const video = ref.current;
      if (!s.live || !s.hls || !video) {
        setState('off');
        return;
      }

      const { default: Hls } = await import('hls.js');
      if (!alive) return;

      if (Hls.isSupported()) {
        const hls = new Hls({ lowLatencyMode: true, backBufferLength: 30 });
        hls.on(Hls.Events.ERROR, (_e, data) => {
          if (!data.fatal) return;
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
          else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
          else if (alive) setState('off');
        });
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (alive) setState('ready');
          void video.play().catch(() => {});
        });
        hls.loadSource(s.hls);
        hls.attachMedia(video);
        destroy = () => hls.destroy();
        return;
      }

      // MSE 가 없는 환경(iOS 사파리)만 네이티브 HLS 로
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = s.hls;
        video.onloadedmetadata = () => alive && setState('ready');
        video.onerror = () => alive && setState('off');
        return;
      }
      setState('off');
    })().catch(() => alive && setState('off'));

    return () => {
      alive = false;
      destroy?.();
    };
  }, [nonce]);

  return (
    <div className="pframe">
      <span className="lbl" style={{ color: '#00FFA3' }}>
        <i className="dot" style={{ background: '#00FFA3' }} />
        치지직
      </span>
      <video
        ref={ref}
        controls
        playsInline
        autoPlay
        muted
        poster="/icon-512.png"
        style={{ display: state === 'ready' ? 'block' : 'none' }}
      />
      {state !== 'ready' && (
        <div className="pholder">
          {state === 'loading' ? '중계를 불러오는 중…' : (info?.reason ?? '지금은 여기서 재생할 수 없습니다')}
          {state === 'off' && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost btn-sm" onClick={retry}>
                다시 시도
              </button>
              <a
                className="btn btn-primary btn-sm"
                href={info?.channelUrl ?? 'https://chzzk.naver.com'}
                target="_blank"
                rel="noopener noreferrer"
              >
                치지직에서 보기
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

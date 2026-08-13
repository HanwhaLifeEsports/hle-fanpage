'use client';

import { useEffect, useState, type RefObject } from 'react';

type Phase = { src: string; state: 'ready' | 'failed' };

/**
 * HLS 를 video 에 붙인다.
 *
 * 재생 경로 판단 순서가 중요하다. 크로미움은 canPlayType('application/vnd.apple.mpegurl')
 * 에 "maybe" 를 돌려주면서도 실제로는 HLS 를 디먹싱하지 못한다
 * (MEDIA_ERR_SRC_NOT_SUPPORTED). 그래서 hls.js 를 먼저 시도하고, MSE 가 없는
 * iOS 사파리에서만 네이티브로 떨어진다.
 *
 * 상태를 "어느 src 에 대한 결과인가"로 들고 있어서 src 가 바뀌면 저절로 초기화된다.
 * 이펙트 안에서 리셋용 setState 를 호출하지 않기 위한 구조다.
 */
export function useHls(ref: RefObject<HTMLVideoElement | null>, src: string | null) {
  const [phase, setPhase] = useState<Phase | null>(null);

  useEffect(() => {
    const video = ref.current;
    if (!src || !video) return;

    let alive = true;
    let destroy: (() => void) | undefined;
    const mark = (state: Phase['state']) => alive && setPhase({ src, state });

    void (async () => {
      const { default: Hls } = await import('hls.js');
      if (!alive) return;

      if (Hls.isSupported()) {
        const hls = new Hls({ lowLatencyMode: true, backBufferLength: 30 });
        hls.on(Hls.Events.ERROR, (_e, data) => {
          if (!data.fatal) return;
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
          else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
          else mark('failed');
        });
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          mark('ready');
          void video.play().catch(() => {});
        });
        hls.loadSource(src);
        hls.attachMedia(video);
        destroy = () => hls.destroy();
        return;
      }

      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = src;
        video.onloadedmetadata = () => mark('ready');
        video.onerror = () => mark('failed');
        return;
      }
      mark('failed');
    })().catch(() => mark('failed'));

    return () => {
      alive = false;
      destroy?.();
    };
  }, [ref, src]);

  const current = phase && phase.src === src ? phase.state : null;
  return { ready: current === 'ready', failed: current === 'failed' };
}

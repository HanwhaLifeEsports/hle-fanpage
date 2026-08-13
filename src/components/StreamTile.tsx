'use client';

import { useEffect, useRef, useState } from 'react';
import { Maximize2, PictureInPicture2, RotateCw, Volume2, VolumeX, X } from 'lucide-react';
import { useHls } from './useHls';
import type { ChzzkStream } from '@/lib/chzzk';

/**
 * 화면 하나.
 *
 * 소리는 전체에서 하나만 난다. 브라우저 자동재생 정책상 음소거 상태만 자동재생이
 * 허용되므로, 모든 타일을 muted 로 띄우고 사용자가 고른 하나만 푼다(클릭이 제스처가 된다).
 */
export default function StreamTile({
  channelId,
  audioOn,
  onAudio,
  onRemove,
}: {
  channelId: string;
  audioOn: boolean;
  onAudio: () => void;
  onRemove: () => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  // 응답을 채널과 묶어 들고 있어서 채널이 바뀌면 저절로 비워진다
  const [fetched, setFetched] = useState<ChzzkStream | null>(null);
  const info = fetched && fetched.channelId === channelId ? fetched : null;
  const [nonce, setNonce] = useState(0);
  const { ready, failed } = useHls(video, info?.hls ?? null);

  useEffect(() => {
    let alive = true;
    void fetch(`/api/chzzk/stream?channel=${channelId}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d: ChzzkStream) => alive && setFetched(d))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [channelId, nonce]);

  // 소리는 항상 한 곳에서만. 음소거를 푸는 시점은 사용자의 클릭 직후라
  // 자동재생 정책상 재생이 허용된다 — 막혀 있었다면 여기서 다시 시작한다.
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    v.muted = !audioOn;
    if (audioOn) {
      v.volume = 1;
      void v.play().catch(() => {});
    }
  }, [audioOn, ready]);

  const pip = async () => {
    const v = video.current;
    if (!v) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await v.requestPictureInPicture();
    } catch {
      /* 지원하지 않거나 사용자가 취소 */
    }
  };

  const full = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await box.current?.requestFullscreen();
    } catch {
      /* 지원하지 않는 브라우저 */
    }
  };

  const dead = failed || (info && !info.live);

  return (
    <div className={`tile${audioOn ? ' audio' : ''}`} ref={box}>
      <div className="tile-bar">
        <button className="tile-name" onClick={onAudio} title="이 화면 소리 켜기">
          {audioOn ? <Volume2 size={13} /> : <VolumeX size={13} />}
          <span>{info?.channelName ?? '불러오는 중…'}</span>
          {info?.live && info.viewers ? <em>{info.viewers.toLocaleString()}</em> : null}
        </button>
        <div className="tile-act">
          <button onClick={pip} title="PiP" aria-label="PiP">
            <PictureInPicture2 size={14} />
          </button>
          <button onClick={full} title="전체화면" aria-label="전체화면">
            <Maximize2 size={14} />
          </button>
          <button onClick={onRemove} title="닫기" aria-label="닫기">
            <X size={14} />
          </button>
        </div>
      </div>

      <video ref={video} playsInline autoPlay muted controls={audioOn} style={{ display: ready ? 'block' : 'none' }} />

      {!ready && (
        <div className="tile-holder">
          {info === null ? (
            '불러오는 중…'
          ) : dead ? (
            <>
              <span>{info.reason ?? '재생할 수 없습니다'}</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setNonce((n) => n + 1)}>
                  <RotateCw size={13} />
                  다시 시도
                </button>
                <a className="btn btn-ghost btn-sm" href={info.channelUrl} target="_blank" rel="noopener noreferrer">
                  채널 열기
                </a>
              </div>
            </>
          ) : (
            '연결 중…'
          )}
        </div>
      )}
    </div>
  );
}

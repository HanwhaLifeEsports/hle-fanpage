"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { PlayCircle } from "lucide-react";
import { CHANNELS } from "@/lib/lck2026";
import type { ChzzkStream } from "@/lib/chzzk";
import CheerChat from "./CheerChat";

// hls.js 를 끌고 오므로 방송이 켜졌을 때만 불러온다
const StreamTile = dynamic(() => import("./StreamTile"), { ssr: false });

const KST = "Asia/Seoul";
const full = (iso: string) =>
  new Intl.DateTimeFormat("ko-KR", {
    timeZone: KST,
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));

/**
 * 앱 중계 탭과 같은 구성: 영상(방송이 없으면 자리만) + 바로 아래 응원 채팅.
 * 영상은 멀티뷰와 같은 플레이어(StreamTile)라 PiP·전체화면·소리 조절이 그대로 된다.
 * 방송이 없을 때 다시보기·다른 플랫폼 링크는 띄우지 않는다 (다시보기는 경기 상세).
 */
export default function LiveScreen({
  match,
}: {
  match: { id: string; startTime: string } | null;
}) {
  const [live, setLive] = useState<boolean | null>(null);
  const [audio, setAudio] = useState(false);

  // 방송이 시작되는 순간을 놓치지 않게 30초마다 확인한다
  useEffect(() => {
    let alive = true;
    const check = () =>
      fetch("/api/chzzk/stream", { cache: "no-store" })
        .then((r) => r.json())
        .then((d: ChzzkStream) => alive && setLive(!!d.live && !!d.hls))
        .catch(() => alive && setLive(false));
    void check();
    const t = setInterval(check, 30_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  return (
    <div className="ui-live-grid">
      <div className="ui-live-main">
        {live ? (
          <div className="ui-player">
            <StreamTile
              channelId={CHANNELS.chzzk}
              audioOn={audio}
              onAudio={() => setAudio((a) => !a)}
              onRemove={() => setLive(false)}
            />
          </div>
        ) : (
          <div className="ui-player-wait glass">
            <PlayCircle size={30} />
            <b>
              {live === null
                ? "방송 상태를 확인하는 중이에요"
                : "방송이 시작되면 여기서 바로 볼 수 있어요"}
            </b>
            {match && <span>{full(match.startTime)} 시작</span>}
          </div>
        )}
      </div>
      {match && <CheerChat matchId={match.id} kickoff={match.startTime} />}
    </div>
  );
}

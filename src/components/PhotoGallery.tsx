'use client';

import { useState } from 'react';
import { ArrowLeft, Flag, Heart, ImagePlus, Trash2, X } from 'lucide-react';
import PhotoCropper from './PhotoCropper';
import {
  cardFanPhoto,
  heartFanPhoto,
  removeFanPhoto,
  reportFanPhoto,
  sharedHearts,
  useFanPhotos,
  visibleFor,
  type FanPhoto,
} from '@/lib/photos';
import { toast } from '@/lib/useAppState';
import type { PlayerPhoto } from '@/lib/lck2026';

/** 운영자 사진 확대 보기. 하트도 신고도 없다 — 검증된 사진이라 신고 한 번에
 *  내려가면 안 되고, 하트 경쟁에 끼지도 않는다. 대신 출처를 여기서 보여준다 */
function OfficialViewer({ photo, onBack }: { photo: PlayerPhoto; onBack: () => void }) {
  return (
    <section className="gwrap">
      <div className="ghead">
        <button className="btn btn-ghost btn-sm" onClick={onBack}>
          <ArrowLeft size={14} />
          갤러리
        </button>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element -- 갤러리 안에서만 쓰는 확대 보기 */}
      <img className="gbig" src={photo.src} alt="" />
      <div className="gbar">
        <span className="cap">{photo.credit}</span>
      </div>
    </section>
  );
}

/** 확대 보기 — 하트와 신고는 여기서만 받는다. 격자 칸은 너무 작아 오조작이 난다 */
function Viewer({ photo, onBack }: { photo: FanPhoto; onBack: () => void }) {
  const [confirming, setConfirming] = useState(false);

  const report = () => {
    void reportFanPhoto(photo.id);
    toast('신고를 접수했습니다', '해당 사진을 즉시 내렸습니다.');
    onBack();
  };

  const drop = () => {
    void removeFanPhoto(photo.id);
    toast('사진을 지웠습니다', '갤러리에서 제거했습니다.');
    onBack();
  };

  return (
    <section className="gwrap">
      <div className="ghead">
        <button className="btn btn-ghost btn-sm" onClick={onBack}>
          <ArrowLeft size={14} />
          갤러리
        </button>
      </div>

      {/* eslint-disable-next-line @next/next/no-img-element -- 브라우저 저장소의 objectURL */}
      <img className="gbig" src={photo.url} alt="" />

      <div className="gbar">
        <button
          className={`heart${photo.mine ? ' on' : ''}`}
          onClick={() => void heartFanPhoto(photo.id)}
          aria-pressed={photo.mine}
          aria-label={photo.mine ? '하트 취소' : '하트'}
        >
          <Heart size={18} fill={photo.mine ? 'currentColor' : 'none'} />
          <span>{photo.hearts}</span>
        </button>

        {confirming ? (
          <span className="greport">
            <span className="cap">{photo.owned ? '지울까요?' : '내릴까요?'}</span>
            <button className="btn btn-ghost btn-sm" onClick={photo.owned ? drop : report}>
              {photo.owned ? '삭제' : '신고'}
            </button>
            <button className="iconbtn" onClick={() => setConfirming(false)} aria-label="취소">
              <X size={13} />
            </button>
          </span>
        ) : (
          // 내가 올린 사진은 신고가 아니라 삭제다. 남의 사진을 내리는 것과
          // 내 사진을 거두는 것은 다른 행동이라 버튼도 다르게 둔다
          <button
            className="iconbtn"
            onClick={() => setConfirming(true)}
            aria-label={photo.owned ? '삭제' : '신고'}
          >
            {photo.owned ? <Trash2 size={14} /> : <Flag size={14} />}
          </button>
        )}
      </div>
    </section>
  );
}

/** 운영자 사진 칸의 고정 id. 팬 사진 id 와 겹칠 일이 없다 */
const OFFICIAL = '__official__';

export default function PhotoGallery({
  playerId,
  playerName,
  official,
}: {
  playerId: string;
  playerName: string;
  /** 코드에 박힌 검증된 사진. 있으면 격자의 첫 칸이 된다 */
  official?: PlayerPhoto;
}) {
  const all = useFanPhotos();
  const photos = visibleFor(all, playerId);
  const [adding, setAdding] = useState(false);
  const [viewing, setViewing] = useState<string | null>(null);

  // 카드 렌더와 같은 판단을 쓴다. 여기서 따로 계산하면 언젠가 서로 다른 사진을
  // 대표라고 부르게 된다
  const repId = cardFanPhoto(all, playerId, !!official)?.id ?? null;

  if (viewing === OFFICIAL && official)
    return <OfficialViewer photo={official} onBack={() => setViewing(null)} />;
  const open = viewing ? photos.find((p) => p.id === viewing) : null;
  if (open) return <Viewer photo={open} onBack={() => setViewing(null)} />;

  if (adding) {
    return (
      <section className="gwrap">
        <div className="ghead">
          <h3 className="grouphead">사진 올리기</h3>
          <button className="btn btn-ghost btn-sm" onClick={() => setAdding(false)}>
            취소
          </button>
        </div>
        <PhotoCropper playerId={playerId} playerName={playerName} onDone={() => setAdding(false)} />
      </section>
    );
  }

  return (
    <section className="gwrap">
      <div className="ghead">
        <h3 className="grouphead">
          사진 <span className="cap">{photos.length + (official ? 1 : 0)}</span>
        </h3>
        <button className="btn btn-ghost btn-sm" onClick={() => setAdding(true)}>
          <ImagePlus size={14} />
          올리기
        </button>
      </div>

      {photos.length === 0 && !official ? (
        <div className="empty">
          <b>아직 올라온 사진이 없습니다</b>
          <span>직접 촬영한 {playerName} 사진을 올리면 여기에 쌓입니다.</span>
        </div>
      ) : (
        <>
          {/* 하트 많은 순으로 3열 */}
          <div className="ggrid">
            {official && (
              <button className="gtile" onClick={() => setViewing(OFFICIAL)}>
                {/* eslint-disable-next-line @next/next/no-img-element -- 격자 썸네일 */}
                <img src={official.src} alt="" />
              </button>
            )}
            {photos.map((p) => (
              <button key={p.id} className="gtile" onClick={() => setViewing(p.id)}>
                {/* eslint-disable-next-line @next/next/no-img-element -- 저장소가 준 주소 */}
                <img src={p.url} alt="" />
                {/* 지금 실제로 카드에 걸려 있는 사진에만 붙인다 */}
                {p.id === repId && <span className="rtag">대표사진</span>}
                <span className={`hcount${p.mine ? ' on' : ''}`}>
                  <Heart size={11} fill={p.mine ? 'currentColor' : 'none'} />
                  {p.hearts}
                </span>
              </button>
            ))}
          </div>
          {/* 하트가 공유되지 않는 상태를 조용히 두면, 사용자는 자기 하트가
              남에게 보인다고 오해한다. 어느 쪽인지 그대로 말한다 */}
          <p className="note">
            하트가 가장 많은 사진이 선수 카드에 걸립니다. 하트를 받기 전까지는 공식 사진이 걸립니다.
            {!sharedHearts && ' 지금은 이 브라우저에만 저장되어 하트도 이 기기에서만 세어집니다.'}
          </p>
        </>
      )}
    </section>
  );
}

'use client';

import { useState } from 'react';
import { ArrowLeft, Flag, Heart, ImagePlus, X } from 'lucide-react';
import PhotoCropper from './PhotoCropper';
import { heartFanPhoto, reportFanPhoto, useFanPhotos, visibleFor, type FanPhoto } from '@/lib/fanPhotos';
import { toast } from '@/lib/useAppState';

/** 확대 보기 — 하트와 신고는 여기서만 받는다. 격자 칸은 너무 작아 오조작이 난다 */
function Viewer({ photo, onBack }: { photo: FanPhoto; onBack: () => void }) {
  const [confirming, setConfirming] = useState(false);

  const report = () => {
    void reportFanPhoto(photo.id);
    toast('신고를 접수했습니다', '해당 사진을 화면에서 즉시 내렸습니다.');
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
            <span className="cap">내릴까요?</span>
            <button className="btn btn-ghost btn-sm" onClick={report}>
              신고
            </button>
            <button className="iconbtn" onClick={() => setConfirming(false)} aria-label="취소">
              <X size={13} />
            </button>
          </span>
        ) : (
          <button className="iconbtn" onClick={() => setConfirming(true)} aria-label="신고">
            <Flag size={14} />
          </button>
        )}
      </div>
    </section>
  );
}

export default function PhotoGallery({
  playerId,
  playerName,
}: {
  playerId: string;
  playerName: string;
}) {
  const all = useFanPhotos();
  const photos = visibleFor(all, playerId);
  const [adding, setAdding] = useState(false);
  const [viewing, setViewing] = useState<string | null>(null);

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
          팬 사진 {photos.length > 0 && <span className="cap">{photos.length}</span>}
        </h3>
        <button className="btn btn-ghost btn-sm" onClick={() => setAdding(true)}>
          <ImagePlus size={14} />
          올리기
        </button>
      </div>

      {photos.length === 0 ? (
        <div className="empty">
          <b>아직 올라온 사진이 없습니다</b>
          <span>직접 촬영한 {playerName} 사진을 올리면 여기에 쌓입니다.</span>
        </div>
      ) : (
        <>
          {/* 하트 많은 순으로 3열. 첫 칸이 곧 지금 카드에 걸려 있는 사진이다 */}
          <div className="ggrid">
            {photos.map((p) => (
              <button key={p.id} className="gtile" onClick={() => setViewing(p.id)}>
                {/* eslint-disable-next-line @next/next/no-img-element -- 브라우저 저장소의 objectURL */}
                <img src={p.url} alt="" />
                <span className={`hcount${p.mine ? ' on' : ''}`}>
                  <Heart size={11} fill={p.mine ? 'currentColor' : 'none'} />
                  {p.hearts}
                </span>
              </button>
            ))}
          </div>
          <p className="note">
            하트가 가장 많은 사진이 선수 카드에 걸립니다. 지금은 이 브라우저에만 저장되어 하트도 이 기기에서만
            세어집니다.
          </p>
        </>
      )}
    </section>
  );
}

'use client';

import { useState } from 'react';
import { Flag, Heart, ImagePlus, X } from 'lucide-react';
import PhotoCropper from './PhotoCropper';
import { heartFanPhoto, reportFanPhoto, useFanPhotos, visibleFor } from '@/lib/fanPhotos';
import { toast } from '@/lib/useAppState';

function Slide({ id, url, hearts, mine }: { id: string; url: string; hearts: number; mine: boolean }) {
  const [confirming, setConfirming] = useState(false);

  const report = () => {
    void reportFanPhoto(id);
    setConfirming(false);
    toast('신고를 접수했습니다', '해당 사진을 화면에서 즉시 내렸습니다.');
  };

  return (
    <figure className="gslide">
      {/* eslint-disable-next-line @next/next/no-img-element -- 브라우저 저장소의 objectURL 이라 최적화 대상이 아니다 */}
      <img src={url} alt="" />
      <figcaption>
        <button
          className={`heart${mine ? ' on' : ''}`}
          onClick={() => void heartFanPhoto(id)}
          aria-pressed={mine}
          aria-label={mine ? '하트 취소' : '하트'}
        >
          <Heart size={17} fill={mine ? 'currentColor' : 'none'} />
          <span>{hearts}</span>
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
      </figcaption>
    </figure>
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
        <h3 className="grouphead">팬 사진 {photos.length > 0 && <span className="cap">{photos.length}</span>}</h3>
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
          {/* 옆으로 넘기는 방식. 세로로 쌓으면 모달이 스크롤만 남는다 */}
          <div className="gstrip">
            {photos.map((p) => (
              <Slide key={p.id} id={p.id} url={p.url} hearts={p.hearts} mine={p.mine} />
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

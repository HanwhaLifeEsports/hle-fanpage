'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ImagePlus, Loader2, RotateCcw } from 'lucide-react';
import { IDENTITY, baseScale, clampView, cropToBlob, loadImage, type CropView } from '@/lib/crop';
import { FAN_OUT_H, FAN_OUT_W, addFanPhoto } from '@/lib/fanPhotos';
import { toast } from '@/lib/useAppState';

/** 원본 상한. 이보다 큰 파일은 디코드부터 느려지고, 어차피 잘라서 줄여 내보낸다 */
const MAX_BYTES = 25 * 1024 * 1024;

export default function PhotoCropper({
  playerId,
  playerName,
  onDone,
}: {
  playerId: string;
  playerName: string;
  onDone: () => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [preview, setPreview] = useState<string | null>(null);
  const [nat, setNat] = useState({ w: 0, h: 0 });
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [view, setView] = useState<CropView>(IDENTITY);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);

  /* 뷰포트 크기는 반응형이라 실제 픽셀을 재야 자르는 위치가 맞는다 */
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [preview]);

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  const pick = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast('사진이 아닙니다', '이미지 파일만 올릴 수 있습니다.');
      return;
    }
    if (file.size > MAX_BYTES) {
      toast('파일이 너무 큽니다', '25MB 이하 사진만 올릴 수 있습니다.');
      return;
    }
    try {
      const img = await loadImage(file);
      imgRef.current = img;
      setNat({ w: img.naturalWidth, h: img.naturalHeight });
      setPreview(URL.createObjectURL(file));
      setView(IDENTITY);
    } catch {
      toast('사진을 읽지 못했습니다', '다른 파일로 시도해 주세요.');
    }
  };

  /* 끌어서 위치 잡기 */
  const drag = useRef<{ id: number; x: number; y: number; from: CropView } | null>(null);
  const onDown = (e: React.PointerEvent) => {
    if (!preview) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, from: view };
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const next = { ...d.from, x: d.from.x + (e.clientX - d.x), y: d.from.y + (e.clientY - d.y) };
    setView(clampView(next, nat.w, nat.h, box.w, box.h));
  };
  const onUp = () => void (drag.current = null);

  const zoomTo = useCallback(
    (zoom: number) => setView((v) => clampView({ ...v, zoom }, nat.w, nat.h, box.w, box.h)),
    [nat.w, nat.h, box.w, box.h],
  );

  const submit = async () => {
    const img = imgRef.current;
    if (!img || !agreed || busy) return;
    setBusy(true);
    try {
      const blob = await cropToBlob(img, view, box.w, box.h, FAN_OUT_W, FAN_OUT_H);
      await addFanPhoto(playerId, blob);
      toast('사진을 올렸습니다', `${playerName} 갤러리에 추가했습니다.`);
      onDone();
    } catch {
      toast('올리지 못했습니다', '잠시 뒤 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  };

  const s = nat.w && box.w ? baseScale(nat.w, nat.h, box.w, box.h) * view.zoom : 1;

  return (
    <div className="cropper">
      {!preview ? (
        <button className="cropdrop" onClick={() => fileRef.current?.click()}>
          <ImagePlus size={22} />
          <b>사진 고르기</b>
          <span className="cap">직접 촬영한 {playerName} 사진</span>
        </button>
      ) : (
        <>
          {/* 4:5 로 고정한다. 카드와 갤러리가 같은 비율이라 두 번 자를 일이 없다 */}
          <div
            ref={boxRef}
            className="cropbox"
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- 화면에서만 쓰는 objectURL 미리보기 */}
            <img
              src={preview}
              alt=""
              draggable={false}
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: nat.w * s,
                height: nat.h * s,
                transform: `translate(-50%,-50%) translate(${view.x}px, ${view.y}px)`,
              }}
            />
            <span className="crophint">끌어서 위치를 맞추세요</span>
          </div>

          <div className="croptools">
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={view.zoom}
              onChange={(e) => zoomTo(+e.target.value)}
              aria-label="확대"
            />
            <button className="btn btn-ghost btn-sm" onClick={() => setView(IDENTITY)}>
              <RotateCcw size={14} />
              처음으로
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}>
              다른 사진
            </button>
          </div>
        </>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = ''; // 같은 파일을 다시 골라도 change 가 오게
          if (f) void pick(f);
        }}
      />

      {/*
        고지를 업로드 버튼 바로 위에 둔다. 별도 약관 페이지로 빼면 아무도 읽지 않고,
        저작권법 제103조에 따른 중단 요구가 들어왔을 때 "무엇을 근거로 올렸는지"가 남지 않는다.
      */}
      <div className="croplaw">
        <b>직접 촬영한 사진만 올릴 수 있습니다</b>
        <ul>
          <li>다른 사람이 찍은 사진, 방송 화면, 기사 사진, 구단이나 멤버십에 올라온 사진은 올릴 수 없습니다.</li>
          <li>AI 로 만들거나 합성한 선수 이미지는 올릴 수 없습니다.</li>
          <li>
            저작권자의 중단 요구가 있으면 저작권법 제103조에 따라 <b>즉시</b> 내립니다.
          </li>
          <li>
            직접 촬영한 사진이어도 선수에게는 <b>초상권</b>이 따로 있습니다. 선수 본인이나 구단이 요청하면
            즉시 삭제합니다.
          </li>
        </ul>
      </div>

      <label className="cropagree">
        <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
        <span>이 사진은 제가 직접 촬영했으며, 위 내용을 확인했습니다.</span>
      </label>

      <button
        className="btn btn-primary btn-block"
        disabled={!preview || !agreed || busy}
        onClick={submit}
      >
        {busy ? <Loader2 size={16} className="spin" /> : <ImagePlus size={16} />}
        {busy ? '올리는 중' : '갤러리에 올리기'}
      </button>
    </div>
  );
}

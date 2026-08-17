'use client';

import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Loader2, TriangleAlert } from 'lucide-react';
import {
  SHARP_MIN_W,
  clampRect,
  containFit,
  cropToBlob,
  initialRect,
  loadImage,
  resizeRect,
  type Corner,
  type CropRect,
} from '@/lib/crop';
import { FAN_OUT_H, FAN_OUT_W, FAN_RATIO, addFanPhoto } from '@/lib/photos';
import { toast } from '@/lib/useAppState';

/** 원본 상한. 이보다 크면 디코드부터 느려지고, 어차피 잘라서 줄여 내보낸다 */
const MAX_BYTES = 25 * 1024 * 1024;

const CORNERS: Corner[] = ['nw', 'ne', 'sw', 'se'];

export default function PhotoCropper({
  playerId,
  playerName,
  onDone,
}: {
  playerId: string;
  playerName: string;
  onDone: () => void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [preview, setPreview] = useState<string | null>(null);
  const [nat, setNat] = useState({ w: 0, h: 0 });
  const [stage, setStage] = useState({ w: 0, h: 0 });
  const [rect, setRect] = useState<CropRect | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);

  /* 무대 크기는 반응형이라 실제 픽셀을 재야 화면 좌표를 원본 좌표로 되돌릴 수 있다 */
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => setStage({ w: el.clientWidth, h: el.clientHeight });
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
      setRect(initialRect(img.naturalWidth, img.naturalHeight, FAN_RATIO));
      setPreview(URL.createObjectURL(file));
    } catch {
      toast('사진을 읽지 못했습니다', '다른 파일로 시도해 주세요.');
    }
  };

  const fit = nat.w && stage.w ? containFit(nat.w, nat.h, stage.w, stage.h) : null;

  /* 화면 좌표 → 원본 좌표 */
  const toNat = (clientX: number, clientY: number) => {
    const box = stageRef.current!.getBoundingClientRect();
    return {
      x: (clientX - box.left - fit!.dx) / fit!.scale,
      y: (clientY - box.top - fit!.dy) / fit!.scale,
    };
  };

  const drag = useRef<
    | { kind: 'move'; id: number; from: CropRect; ox: number; oy: number }
    | { kind: 'resize'; id: number; corner: Corner }
    | null
  >(null);

  const startMove = (e: React.PointerEvent) => {
    if (!rect || !fit) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = toNat(e.clientX, e.clientY);
    drag.current = { kind: 'move', id: e.pointerId, from: rect, ox: p.x - rect.x, oy: p.y - rect.y };
  };

  const startResize = (e: React.PointerEvent, corner: Corner) => {
    if (!rect || !fit) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { kind: 'resize', id: e.pointerId, corner };
  };

  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId || !rect || !fit) return;
    const p = toNat(e.clientX, e.clientY);
    if (d.kind === 'move') {
      setRect(clampRect({ ...d.from, x: p.x - d.ox, y: p.y - d.oy }, nat.w, nat.h));
    } else {
      setRect(resizeRect(rect, d.corner, p.x, p.y, nat.w, nat.h, FAN_RATIO));
    }
  };

  const endDrag = () => void (drag.current = null);

  const submit = async () => {
    const img = imgRef.current;
    if (!img || !rect || !agreed || busy) return;
    setBusy(true);
    try {
      const blob = await cropToBlob(img, rect, FAN_OUT_W, FAN_OUT_H);
      await addFanPhoto(playerId, blob);
      toast('사진을 올렸습니다', `${playerName} 갤러리에 추가했습니다.`);
      onDone();
    } catch {
      toast('올리지 못했습니다', '잠시 뒤 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  };

  /* 선택 영역을 화면 좌표로 옮긴 값 */
  const box =
    rect && fit
      ? {
          left: fit.dx + rect.x * fit.scale,
          top: fit.dy + rect.y * fit.scale,
          width: rect.w * fit.scale,
          height: rect.h * fit.scale,
        }
      : null;

  const soft = rect ? rect.w < SHARP_MIN_W : false;

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
          {/* 사진 전체를 펼쳐 놓고 그 위에서 사각형을 잡는다.
              무대에 max-height 를 걸어도 사진은 contain 으로 담기므로 비율이 안 깨진다. */}
          <div ref={stageRef} className="cropstage" onPointerMove={onMove} onPointerUp={endDrag} onPointerCancel={endDrag}>
            {fit && (
              // eslint-disable-next-line @next/next/no-img-element -- 화면에서만 쓰는 objectURL 미리보기
              <img
                src={preview}
                alt=""
                draggable={false}
                style={{
                  position: 'absolute',
                  left: fit.dx,
                  top: fit.dy,
                  width: nat.w * fit.scale,
                  height: nat.h * fit.scale,
                }}
              />
            )}
            {box && (
              <div className="cropsel" style={box} onPointerDown={startMove}>
                {CORNERS.map((c) => (
                  <span
                    key={c}
                    className={`crophandle h-${c}`}
                    onPointerDown={(e) => startResize(e, c)}
                    role="presentation"
                  />
                ))}
              </div>
            )}
          </div>

          <div className="croptools">
            <span className="cap">
              모서리를 끌어 크기를, 안쪽을 끌어 위치를 맞추세요. 카드에 이 비율 그대로 걸립니다.
            </span>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setRect(initialRect(nat.w, nat.h, FAN_RATIO))}
            >
              전체
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}>
              다른 사진
            </button>
          </div>

          {soft && (
            <p className="cropwarn">
              <TriangleAlert size={14} />
              고른 영역이 작아 늘려 그리게 됩니다. 더 넓게 잡으면 선명해집니다.
            </p>
          )}
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
          <li>저작권자의 중단 요구가 있으면 저작권법 제103조에 따라 즉시 내립니다.</li>
          <li>
            직접 촬영한 사진이어도 선수에게는 초상권이 따로 있습니다. 선수 본인이나 구단이 요청하면 즉시
            삭제합니다.
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

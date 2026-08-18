'use client';

/**
 * 사진에서 잘라낼 사각형을 고르고, 그 부분만 캔버스로 옮긴다.
 *
 * 증명사진 업로드와 같은 방식이다. 사진 전체를 펼쳐 놓고 그 위에서 선택 영역을
 * 잡는다. 반대로 고정된 창 뒤에서 사진을 움직이게 하면(인스타 방식) 화면 밖으로
 * 나간 부분이 안 보여서 무엇이 잘리는지 알 수 없다.
 *
 * 좌표는 전부 '원본 사진 픽셀'로 다룬다. 화면 크기는 반응형이라 계속 바뀌지만
 * 원본 좌표는 안 바뀌므로, 창 크기가 달라져도 고른 영역이 그대로 남는다.
 *
 * 라이브러리를 쓰지 않는 이유: 비율이 4:5 로 고정이라 회전·자유비율이 필요 없고,
 * 남는 계산은 사각형 하나를 옮겨 그리는 것뿐이다.
 * 자르면서 크기까지 줄여 내보내므로 올라가는 용량이 원본의 10분의 1 아래로 떨어진다.
 */

/** 잘라낼 영역 — 원본 사진 픽셀 좌표 */
export interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type Corner = 'nw' | 'ne' | 'sw' | 'se';

/** 선택 영역이 이보다 작으면 늘려 그리게 되어 흐려진다 */
export const SHARP_MIN_W = 900;

/** 원본 픽셀 기준 최소 선택 크기 */
const MIN_W = 50;

/**
 * 사진 전체가 보이도록 담는다(contain). 화면 좌표와 원본 좌표를 오갈 때
 * 필요한 값이라, object-fit 에 맡기지 않고 직접 계산한다.
 */
export function containFit(iw: number, ih: number, cw: number, ch: number) {
  const scale = Math.min(cw / iw, ch / ih);
  return { scale, dx: (cw - iw * scale) / 2, dy: (ch - ih * scale) / 2 };
}

/** 사진 안에 들어가는 가장 큰 비율 사각형을 가운데 놓는다 */
export function initialRect(iw: number, ih: number, ratio: number): CropRect {
  let w = iw;
  let h = w / ratio;
  if (h > ih) {
    h = ih;
    w = h * ratio;
  }
  return { x: (iw - w) / 2, y: (ih - h) / 2, w, h };
}

/** 사진 밖으로 나가지 않게 민다. 크기는 유지하고 위치만 바꾼다 */
export function clampRect(r: CropRect, iw: number, ih: number): CropRect {
  const w = Math.min(r.w, iw);
  const h = Math.min(r.h, ih);
  return {
    w,
    h,
    x: Math.min(Math.max(0, r.x), iw - w),
    y: Math.min(Math.max(0, r.y), ih - h),
  };
}

/**
 * 모서리를 끌어 크기를 바꾼다. 반대쪽 모서리를 고정점으로 잡고,
 * 비율을 지키면서 사진 경계 안에 들어오도록 폭을 줄인다.
 */
export function resizeRect(
  r: CropRect,
  corner: Corner,
  px: number,
  py: number,
  iw: number,
  ih: number,
  ratio: number,
): CropRect {
  const east = corner === 'ne' || corner === 'se';
  const south = corner === 'se' || corner === 'sw';
  // 고정점 = 끄는 모서리의 대각선 반대쪽
  const ax = east ? r.x : r.x + r.w;
  const ay = south ? r.y : r.y + r.h;

  // 가로·세로 중 더 많이 끈 쪽을 따라간다. 그래야 손을 따라오는 느낌이 난다
  const wantW = Math.max(Math.abs(px - ax), Math.abs(py - ay) * ratio);

  // 고정점에서 사진 경계까지가 최대치. 세로 한계도 폭으로 환산해 함께 적용한다
  const maxW = east ? iw - ax : ax;
  const maxH = south ? ih - ay : ay;
  const w = Math.max(MIN_W, Math.min(wantW, maxW, maxH * ratio));
  const h = w / ratio;

  return { x: east ? ax : ax - w, y: south ? ay : ay - h, w, h };
}

/** 파일을 디코드한다. 실패하면 이미지가 아니거나 브라우저가 못 읽는 형식이다 */
export function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('이미지를 읽지 못했습니다'));
    };
    img.src = url;
  });
}

/**
 * 고른 사각형만 잘라 JPEG 으로 내보낸다.
 *
 * outW:outH 는 rect 와 같은 비율이어야 한다. 다르면 그리는 과정에서 늘어나거나
 * 눌린다. 호출하는 쪽에서 비율을 하나로 고정해 두는 이유다.
 */
export function cropToBlob(
  img: HTMLImageElement,
  rect: CropRect,
  outW: number,
  outH: number,
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.reject(new Error('캔버스를 만들지 못했습니다'));
  ctx.imageSmoothingQuality = 'high'; // 축소는 계단이 지기 쉽다
  ctx.drawImage(img, rect.x, rect.y, rect.w, rect.h, 0, 0, outW, outH);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('사진을 저장하지 못했습니다'))),
      'image/jpeg',
      0.82,
    );
  });
}

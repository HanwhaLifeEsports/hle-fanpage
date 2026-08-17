'use client';

/**
 * 브라우저에서 사진을 잘라 내보낸다.
 *
 * 라이브러리를 쓰지 않는 이유: 필요한 건 사각형 하나를 캔버스에 옮겨 그리는 일이고,
 * 그 계산은 아래 스무 줄이 전부다. 크로퍼 라이브러리는 대부분 제스처 처리와
 * 회전·자유비율까지 들고 오는데 여기서는 비율이 4:5 로 고정이다.
 *
 * 자르면서 크기까지 줄여 내보내므로 올라가는 용량이 원본의 10분의 1 아래로 떨어진다.
 * 휴대폰 사진은 2MB 를 넘기 쉬운데, 서버가 붙으면 그 차이가 그대로 비용이 된다.
 */

/** 화면에서 사진을 어떻게 놓았는가 — 확대율과 중심 이동량 */
export interface CropView {
  /** 1 = 뷰포트를 꽉 채우는 최소 크기 */
  zoom: number;
  /** 뷰포트 중심 기준 이동(px, 화면 좌표) */
  x: number;
  y: number;
}

export const IDENTITY: CropView = { zoom: 1, x: 0, y: 0 };

/**
 * 사진이 뷰포트를 덮는 최소 배율.
 * cover 와 같은 계산이다 — 짧은 쪽을 기준으로 맞춰야 빈 곳이 안 생긴다.
 */
export function baseScale(iw: number, ih: number, vw: number, vh: number): number {
  return Math.max(vw / iw, vh / ih);
}

/**
 * 이동 가능한 범위. 사진이 뷰포트 밖으로 밀려 빈 곳이 보이면 안 되므로,
 * 넘치는 폭의 절반까지만 움직인다.
 */
export function clampView(v: CropView, iw: number, ih: number, vw: number, vh: number): CropView {
  const s = baseScale(iw, ih, vw, vh) * v.zoom;
  const maxX = Math.max(0, (iw * s - vw) / 2);
  const maxY = Math.max(0, (ih * s - vh) / 2);
  return {
    zoom: v.zoom,
    x: Math.min(maxX, Math.max(-maxX, v.x)),
    y: Math.min(maxY, Math.max(-maxY, v.y)),
  };
}

/**
 * 화면에서 보고 있는 사각형을 원본 사진의 좌표로 되돌린다.
 * 이 사각형만 캔버스로 옮기면 화면에서 본 그대로가 저장된다.
 */
export function sourceRect(v: CropView, iw: number, ih: number, vw: number, vh: number) {
  const s = baseScale(iw, ih, vw, vh) * v.zoom;
  // 뷰포트 왼쪽 위 모서리가 확대된 사진 위 어디에 있는가
  const left = (iw * s - vw) / 2 - v.x;
  const top = (ih * s - vh) / 2 - v.y;
  return { sx: left / s, sy: top / s, sw: vw / s, sh: vh / s };
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

/** 잘라서 JPEG 으로 내보낸다. 품질 0.82 는 운영자 사진과 같은 기준이다 */
export function cropToBlob(
  img: HTMLImageElement,
  v: CropView,
  vw: number,
  vh: number,
  outW: number,
  outH: number,
): Promise<Blob> {
  const { sx, sy, sw, sh } = sourceRect(v, img.naturalWidth, img.naturalHeight, vw, vh);
  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.reject(new Error('캔버스를 만들지 못했습니다'));
  // 축소는 계단이 지기 쉬워 보간 품질을 올린다
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('사진을 저장하지 못했습니다'))),
      'image/jpeg',
      0.82,
    );
  });
}

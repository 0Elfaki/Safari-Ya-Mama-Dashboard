// Image preparation before upload, done in the browser (nothing is sent until it is converted).
// App pictures: WebP, cropped from the centre to the picture's shape (4:3 → 1200×900, 16:10 → 1200×750,
// 1:1 → 800×800, transparency kept), under 150 KB, named by picture ID.
// Website images: WebP, a full copy (at most 1600 px wide, or the exact frame size) and a small copy
// (760 px wide), under 2 MB.
import { tr } from './i18n';
export const APP_PICTURE_ID = /^[A-Z]{2,5}(-[A-Z0-9]+)+$/;
export const LESSON_PICTURE_ID = /^[A-Z]{2,5}(-[A-Z0-9]+)+-P[0-9]{1,2}$/;
export const SITE_IMAGE_NAME = /^[a-z0-9][a-z0-9/_.-]{0,190}$/;

export type AppShape = '4:3' | '16:10' | '1:1';
export const APP_SHAPES: Record<AppShape, { w: number; h: number }> = { '4:3': { w: 1200, h: 900 }, '16:10': { w: 1200, h: 750 }, '1:1': { w: 800, h: 800 } };

/** A part of the source image, in source pixels. */
export interface Crop { sx: number; sy: number; sw: number; sh: number }

async function load(file: Blob): Promise<ImageBitmap> {
  try { return await createImageBitmap(file); } catch { throw new Error(tr('This file is not a picture this browser can read. Use PNG, JPEG or WebP.')); }
}
function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((ok, fail) => canvas.toBlob((b) => (b && b.type === 'image/webp' ? ok(b) : fail(new Error(tr('This browser cannot make WebP images. Use Chrome, Edge or Firefox.')))), 'image/webp', quality));
}
async function squeeze(canvas: HTMLCanvasElement, maxBytes: number): Promise<Blob> {
  for (let q = 0.86; q >= 0.4; q -= 0.08) {
    const b = await toBlob(canvas, q);
    if (b.size <= maxBytes) return b;
  }
  throw new Error(tr('The picture is still over {kb} KB at the lowest quality. Use a simpler image.', { kb: Math.round(maxBytes / 1024) }));
}
function draw(img: ImageBitmap, c: Crop, w: number, h: number) {
  const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, c.sx, c.sy, c.sw, c.sh, 0, 0, w, h);
  return canvas;
}
/** The largest centred part of the image with this width/height ratio. */
export function centreCrop(w: number, h: number, ratio: number): Crop {
  let sw = w, sh = h;
  if (sw / sh > ratio) sw = Math.round(sh * ratio); else sh = Math.round(sw / ratio);
  return { sx: Math.round((w - sw) / 2), sy: Math.round((h - sh) / 2), sw, sh };
}
export async function imageSize(file: Blob) { const i = await load(file); return { width: i.width, height: i.height }; }

export async function prepareAppPicture(file: Blob, shape: AppShape = '4:3', crop?: Crop): Promise<{ blob: Blob; width: number; height: number }> {
  const img = await load(file);
  const { w, h } = APP_SHAPES[shape];
  const c = draw(img, crop ?? centreCrop(img.width, img.height, w / h), w, h);
  return { blob: await squeeze(c, 150 * 1024), width: w, height: h };
}

/** Website image: full + small copies. With a frame (w×h) the crop is fixed to that shape. */
export async function prepareSiteImage(file: Blob, opts: { frame?: { w: number; h: number }; crop?: Crop } = {}) {
  const img = await load(file);
  const crop = opts.crop ?? (opts.frame ? centreCrop(img.width, img.height, opts.frame.w / opts.frame.h) : { sx: 0, sy: 0, sw: img.width, sh: img.height });
  const fullW = opts.frame ? Math.min(opts.frame.w, crop.sw) : Math.min(1600, crop.sw);
  const fullH = Math.round(fullW * (crop.sh / crop.sw));
  const full = await squeeze(draw(img, crop, fullW, fullH), 2 * 1024 * 1024);
  const smallW = Math.min(760, fullW), smallH = Math.round(smallW * (crop.sh / crop.sw));
  const small = smallW < fullW ? await squeeze(draw(img, crop, smallW, smallH), 600 * 1024) : null;
  return { full, small, width: fullW, height: fullH, sourceWidth: crop.sw, tooSmall: opts.frame ? crop.sw < opts.frame.w : false };
}

/** "Mother at clinic.JPG" → "mother-at-clinic" */
export const slugify = (s: string) => s.toLowerCase().replace(/\.[a-z0-9]+$/, '').normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'image';

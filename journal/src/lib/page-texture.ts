import { exportPagePng } from './export';
import type { JournalEntry, JournalObject } from './model';

export interface BookPaperObject {
  id: string;
  kind: 'photo' | 'sticker';
  src: string;
  x: number; y: number; width: number; height: number; rotation: number;
}

const frameCache = new Map<string, Promise<string>>();
function readBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('纸页读取失败'));
    reader.readAsDataURL(blob);
  });
}

function roundedPhoto(object: JournalObject, src: string): Promise<string> {
  const key = `photo|${src}|${object.width}|${object.height}`;
  const cached = frameCache.get(key);
  if (cached) return cached;
  const job = (async () => {
    const image = new Image(); image.src = src; await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(object.width * 2); canvas.height = Math.round(object.height * 2);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('照片纸片无法读取');
    context.scale(2, 2);
    context.beginPath(); context.roundRect(0, 0, object.width, object.height, 14); context.clip();
    const factor = Math.max(object.width / image.naturalWidth, object.height / image.naturalHeight);
    const cropWidth = object.width / factor, cropHeight = object.height / factor;
    context.drawImage(image, (image.naturalWidth - cropWidth) / 2, (image.naturalHeight - cropHeight) / 2, cropWidth, cropHeight, 0, 0, object.width, object.height);
    return canvas.toDataURL('image/png');
  })();
  frameCache.set(key, job);
  if (frameCache.size > 36) frameCache.delete(frameCache.keys().next().value!);
  job.catch(() => frameCache.delete(key));
  return job;
}

/** Match native object-fit:contain rather than stretching a cropped alpha sprite. */
function containedSticker(object: JournalObject, src: string): Promise<string> {
  const key = `sticker|${src}|${object.width}|${object.height}`;
  const cached = frameCache.get(key);
  if (cached) return cached;
  const job = (async () => {
    const image = new Image(); image.src = src; await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(object.width * 2)); canvas.height = Math.max(1, Math.round(object.height * 2));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('素材无法读取');
    const factor = Math.min(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight);
    const width = image.naturalWidth * factor, height = image.naturalHeight * factor;
    context.drawImage(image, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
    return canvas.toDataURL('image/png');
  })();
  frameCache.set(key, job);
  if (frameCache.size > 36) frameCache.delete(frameCache.keys().next().value!);
  job.catch(() => frameCache.delete(key));
  return job;
}

/** Digital page content becomes a shallow curved canvas; artwork remains independent 3D meshes. */
export async function renderBookPage(entry: JournalEntry, title: string, getArt: (id: string) => string | undefined) {
  const [pageSrc, objects] = await Promise.all([
    exportPagePng({ ...entry, objects: [] }, getArt, { appearance: 'print', bookTitle: title, roundCorners: true }).then(readBlob),
    Promise.all(entry.objects.map(async object => {
      let src = object.kind === 'photo' ? object.src : getArt(object.assetId ?? '');
      if (!src) throw new Error('这页含有无法读取的纸品');
      const photo = object.kind === 'photo' || object.assetId === 'demo-landscape';
      src = photo ? await roundedPhoto(object, src) : await containedSticker(object, src);
      return { ...object, kind: photo ? 'photo' : 'sticker', src } as BookPaperObject;
    })),
  ]);
  return { pageSrc, objects };
}

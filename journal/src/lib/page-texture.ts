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

function framedPhoto(object: JournalObject, src: string, date: string): Promise<string> {
  const key = `${src}|${object.width}|${object.height}|${date}`;
  const cached = frameCache.get(key);
  if (cached) return cached;
  const job = (async () => {
    const image = new Image(); image.src = src; await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(object.width * 2); canvas.height = Math.round(object.height * 2);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('照片纸片无法读取');
    context.scale(2, 2); context.fillStyle = '#FFFEF9';
    context.fillRect(0, 0, object.width, object.height);
    const width = Math.max(1, object.width - 16), height = Math.max(1, object.height - 28);
    const factor = Math.max(width / image.naturalWidth, height / image.naturalHeight);
    const cropWidth = width / factor, cropHeight = height / factor;
    context.drawImage(image, (image.naturalWidth - cropWidth) / 2, (image.naturalHeight - cropHeight) / 2, cropWidth, cropHeight, 8, 8, width, height);
    context.fillStyle = '#85877F'; context.textAlign = 'center'; context.textBaseline = 'top';
    context.font = '10px "PingFang SC", "Microsoft YaHei", sans-serif';
    context.fillText(date.replace(/-/g, '.'), object.width / 2, object.height - 15);
    return canvas.toDataURL('image/png');
  })();
  frameCache.set(key, job);
  if (frameCache.size > 36) frameCache.delete(frameCache.keys().next().value!);
  job.catch(() => frameCache.delete(key));
  return job;
}

/** Text is printed onto the curved sheet; paper pieces are independent 3D meshes. */
export async function renderBookPage(entry: JournalEntry, title: string, getArt: (id: string) => string | undefined) {
  const [pageSrc, objects] = await Promise.all([
    exportPagePng({ ...entry, objects: [] }, getArt, { appearance: 'print', bookTitle: title }).then(readBlob),
    Promise.all(entry.objects.map(async object => {
      let src = object.kind === 'photo' ? object.src : getArt(object.assetId ?? '');
      if (!src) throw new Error('这页含有无法读取的纸品');
      const photo = object.kind === 'photo' || object.assetId === 'demo-landscape';
      if (photo) src = await framedPhoto(object, src, entry.date);
      return { ...object, kind: photo ? 'photo' : 'sticker', src } as BookPaperObject;
    })),
  ]);
  return { pageSrc, objects };
}

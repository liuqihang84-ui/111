import { floatAtlasSrc, floatAtlasSize, floatStickerCells } from '../data/float-art';

export const floatArt = new Map<string, string>();
let ready: Promise<void> | undefined;

/** Prepare isolated alpha sprites; the original atlas bytes stay untouched. */
export function prepareFloatArt(): Promise<void> {
  if (ready) return ready;
  ready = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('浮笺素材读取失败'));
    image.src = floatAtlasSrc;
  }).then(image => {
    if (image.naturalWidth !== floatAtlasSize.width || image.naturalHeight !== floatAtlasSize.height) {
      throw new Error('浮笺素材尺寸不一致');
    }
    for (const cell of floatStickerCells) {
      const rect = cell.source;
      const canvas = document.createElement('canvas');
      canvas.width = rect.width;
      canvas.height = rect.height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('浏览器无法准备浮笺素材');
      context.drawImage(image, rect.x, rect.y, rect.width, rect.height, 0, 0, rect.width, rect.height);
      floatArt.set(cell.id, canvas.toDataURL('image/png'));
    }
  });
  return ready;
}

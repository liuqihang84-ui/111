import { jadeAtlasSrc, jadeAtlasSize, jadeStickerCells } from '../data/jade-art';

export const jadeArt = new Map<string, string>();
let ready: Promise<void> | undefined;

/** Crop original alpha sprites at runtime; never rewrite the source atlas. */
export function prepareJadeArt(): Promise<void> {
  if (ready) return ready;
  ready = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('薄玉素材读取失败'));
    image.src = jadeAtlasSrc;
  }).then(image => {
    if (image.naturalWidth !== jadeAtlasSize.width || image.naturalHeight !== jadeAtlasSize.height) {
      throw new Error('薄玉素材尺寸不一致');
    }
    for (const cell of jadeStickerCells) {
      const rect = cell.source;
      const canvas = document.createElement('canvas');
      canvas.width = rect.width;
      canvas.height = rect.height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('浏览器无法准备薄玉素材');
      context.drawImage(image, rect.x, rect.y, rect.width, rect.height, 0, 0, rect.width, rect.height);
      jadeArt.set(cell.id, canvas.toDataURL('image/png'));
    }
  });
  return ready;
}

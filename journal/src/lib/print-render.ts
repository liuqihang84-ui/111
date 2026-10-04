import { printAtlasSrc, printAtlasSize, printStickerCells } from '../data/print';
export const printArt = new Map<string, string>();
let ready: Promise<void> | undefined;
/** Frame the original transparent atlas without modifying the source asset. */
export function preparePrintArt(): Promise<void> {
  if (ready) return ready;
  ready = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('纸品素材读取失败'));
    image.src = printAtlasSrc;
  }).then(image => {
    if (image.naturalWidth !== printAtlasSize.width || image.naturalHeight !== printAtlasSize.height) throw new Error('纸品素材尺寸不一致');
    for (const cell of printStickerCells) {
      const canvas = document.createElement('canvas');
      const rect = cell.source;
      canvas.width = rect.width; canvas.height = rect.height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('浏览器无法准备纸品');
      context.drawImage(image, rect.x, rect.y, rect.width, rect.height, 0, 0, rect.width, rect.height);
      printArt.set(cell.id, canvas.toDataURL('image/png'));
    }
  });
  return ready;
}

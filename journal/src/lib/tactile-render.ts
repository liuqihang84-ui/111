import { atlasSrc, atlasSize, stickerCells, tactileCoverSrc } from '../data/tactile';

/** Frames are rendered from one packed texture, like a normal game sprite atlas. */
export const tactileArt = new Map<string, string>();
let ready: Promise<void> | undefined;

export function prepareTactileArt(): Promise<void> {
  if (ready) return ready;
  const decode = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('材质图读取失败'));
    image.src = src;
  });
  ready = Promise.all([decode(atlasSrc), decode(tactileCoverSrc)]).then(([image, cover]) => {
    if (image.naturalWidth !== atlasSize.width || image.naturalHeight !== atlasSize.height) throw new Error('材质图尺寸不一致');
    const width = atlasSize.width / 4, height = atlasSize.height / 3;
    for (const cell of stickerCells) {
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(width); canvas.height = Math.round(height);
      const context = canvas.getContext('2d');
      if (!context) throw new Error('浏览器无法准备素材');
      context.drawImage(image, cell.column * width, cell.row * height, width, height, 0, 0, canvas.width, canvas.height);
      tactileArt.set(cell.id, canvas.toDataURL('image/png'));
    }
    const postcard = document.createElement('canvas');
    postcard.width = 900; postcard.height = 600;
    const context = postcard.getContext('2d');
    if (!context) throw new Error('浏览器无法准备山水小景');
    const cropHeight = cover.naturalWidth * 2 / 3;
    context.drawImage(cover, 0, cover.naturalHeight - cropHeight, cover.naturalWidth, cropHeight, 0, 0, 900, 600);
    tactileArt.set('demo-landscape', postcard.toDataURL('image/png'));
  });
  return ready;
}

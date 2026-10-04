import atlasPng from '../assets/float-kit.png?inline';

/** Original low-relief celadon family for the digital-first Floating Notes UI. */
export const floatAtlasSrc: string = atlasPng;
export const floatAtlasSize = { width: 1774, height: 887 } as const;

/**
 * Four columns × two rows. Source frames follow measured alpha > 4 bounds
 * with eight pixels of padding. This retains the original generated file,
 * avoids adjacent cells and gives each visible silhouette a useful hit area.
 * These pieces are optional: a fresh entry contains no decorative objects.
 */
export const floatStickerCells = [
  {
    id: 'float-arc', label: '弧光', column: 0, row: 0,
    source: { x: 150, y: 138, width: 212, height: 212 },
    width: 96, height: 96,
  },
  {
    id: 'float-fold', label: '小折', column: 1, row: 0,
    source: { x: 591, y: 133, width: 196, height: 227 },
    width: 90, height: 104,
  },
  {
    id: 'float-steps', label: '云阶', column: 2, row: 0,
    source: { x: 980, y: 145, width: 231, height: 215 },
    width: 124, height: 115,
  },
  {
    id: 'float-frame', label: '留白框', column: 3, row: 0,
    source: { x: 1398, y: 133, width: 218, height: 228 },
    width: 140, height: 146,
  },
  {
    id: 'float-ripple', label: '波纹', column: 0, row: 1,
    source: { x: 136, y: 568, width: 266, height: 134 },
    width: 170, height: 86,
  },
  {
    id: 'float-crescent', label: '月牙', column: 1, row: 1,
    source: { x: 591, y: 514, width: 195, height: 238 },
    width: 92, height: 112,
  },
  {
    id: 'float-glow', label: '微光', column: 2, row: 1,
    source: { x: 1008, y: 557, width: 191, height: 173 },
    width: 72, height: 65,
  },
  {
    id: 'float-bookmark', label: '书签', column: 3, row: 1,
    source: { x: 1481, y: 513, width: 106, height: 231 },
    width: 44, height: 96,
  },
] as const;

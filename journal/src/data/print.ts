import atlasPng from '../assets/print-stickers.png?inline';

/** Original restrained paper / ink atlas, embedded in portable exports. */
export const printAtlasSrc: string = atlasPng;
export const printAtlasSize = { width: 1774, height: 887 } as const;

/**
 * Four columns × two rows; fractional cell edges are intentional.
 * `source` contains each visible piece plus four pixels of alpha padding.
 * Draw these source rectangles at runtime to avoid oversized empty hit areas.
 */
export const printStickerCells = [
  {
    id: 'print-sun', label: '日印', column: 0, row: 0,
    source: { x: 150, y: 184, width: 161, height: 161 },
    width: 84, height: 84,
  },
  {
    id: 'print-mountain', label: '远山', column: 1, row: 0,
    source: { x: 512, y: 240, width: 317, height: 72 },
    width: 176, height: 40,
  },
  {
    id: 'print-sprig', label: '枝影', column: 2, row: 0,
    source: { x: 1032, y: 141, width: 181, height: 240 },
    width: 80, height: 106,
  },
  {
    id: 'print-strip', label: '纸条', column: 3, row: 0,
    source: { x: 1410, y: 237, width: 253, height: 48 },
    width: 200, height: 38,
  },
  {
    id: 'print-seal', label: '朱印', column: 0, row: 1,
    source: { x: 148, y: 562, width: 165, height: 161 },
    width: 84, height: 82,
  },
  {
    id: 'print-label', label: '题签', column: 1, row: 1,
    source: { x: 530, y: 592, width: 276, height: 104 },
    width: 180, height: 68,
  },
  {
    id: 'print-frame', label: '双线框', column: 2, row: 1,
    source: { x: 987, y: 578, width: 245, height: 130 },
    width: 190, height: 101,
  },
  {
    id: 'print-index', label: '索引签', column: 3, row: 1,
    source: { x: 1510, y: 527, width: 78, height: 216 },
    width: 40, height: 110,
  },
] as const;

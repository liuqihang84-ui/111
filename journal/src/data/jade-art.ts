import atlasPng from '../assets/jade-kit.png?inline';

/** Original thin-jade compositional family; older material IDs stay separate. */
export const jadeAtlasSrc: string = atlasPng;
export const jadeAtlasSize = { width: 1774, height: 887 } as const;

/**
 * Four columns × two rows. Each source follows the actual alpha > 4
 * silhouette with eight pixels of padding, safely inside its own cell.
 * Width/height are the optional page object's initial box; display the
 * original silhouette with contain semantics rather than stretching it.
 */
export const jadeStickerCells = [
  {
    id: 'jade-title', label: '玉题签', column: 0, row: 0,
    source: { x: 96, y: 221, width: 292, height: 97 },
    width: 180, height: 52,
  },
  {
    id: 'jade-frame', label: '玉界框', column: 1, row: 0,
    source: { x: 556, y: 132, width: 253, height: 258 },
    width: 164, height: 164,
  },
  {
    id: 'jade-line', label: '清流线', column: 2, row: 0,
    source: { x: 951, y: 239, width: 334, height: 79 },
    width: 210, height: 56,
  },
  {
    id: 'jade-arc', label: '薄玉弧', column: 3, row: 0,
    source: { x: 1424, y: 165, width: 281, height: 177 },
    width: 138, height: 104,
  },
  {
    id: 'jade-index', label: '玉索引', column: 0, row: 1,
    source: { x: 171, y: 491, width: 111, height: 293 },
    width: 56, height: 134,
  },
  {
    id: 'jade-fold', label: '轻折片', column: 1, row: 1,
    source: { x: 573, y: 505, width: 194, height: 277 },
    width: 104, height: 118,
  },
  {
    id: 'jade-stack', label: '玉叠片', column: 2, row: 1,
    source: { x: 982, y: 547, width: 286, height: 211 },
    width: 148, height: 106,
  },
  {
    id: 'jade-dot', label: '玉朱点', column: 3, row: 1,
    source: { x: 1492, y: 589, width: 124, height: 125 },
    width: 56, height: 56,
  },
] as const;

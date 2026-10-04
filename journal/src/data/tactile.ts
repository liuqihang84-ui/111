import atlasPng from '../assets/tactile-stickers.png?inline';
import coverPng from '../assets/tactile-cover.png?inline';
import paperPng from '../assets/tactile-paper.png?inline';

/** Inline PNGs remain self-contained in portable builds and exported pages. */
export const atlasSrc: string = atlasPng;
export const tactileCoverSrc: string = coverPng;
export const tactilePaperSrc: string = paperPng;

export const atlasSize = { width: 1448, height: 1086 } as const;

/** Four columns × three rows, with 362 × 362 source pixels per cell. */
export const stickerCells = [
  { id: 'icon-orchid', column: 0, row: 0 },
  { id: 'icon-plum', column: 1, row: 0 },
  { id: 'icon-bamboo', column: 2, row: 0 },
  { id: 'icon-lotus', column: 3, row: 0 },
  { id: 'icon-ginkgo', column: 0, row: 1 },
  { id: 'icon-fan', column: 1, row: 1 },
  { id: 'icon-teacup', column: 2, row: 1 },
  { id: 'icon-book', column: 3, row: 1 },
  { id: 'icon-umbrella', column: 0, row: 2 },
  { id: 'icon-moon', column: 1, row: 2 },
  { id: 'icon-seal', column: 2, row: 2 },
  { id: 'icon-swallow', column: 3, row: 2 },
] as const;

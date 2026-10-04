import red from '../assets/cover-print-red.svg?raw';
import ink from '../assets/cover-print-ink.svg?raw';
import paper from '../assets/cover-print-paper.svg?raw';
import type { CoverArt } from './art';
const url = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
/** Stable IDs keep existing notebooks and JSON backups compatible. */
export const covers: CoverArt[] = [
  { id: 'mountain', name: '朱页', src: url(red) },
  { id: 'orchid', name: '墨页', src: url(ink) },
  { id: 'indigo', name: '素页', src: url(paper) },
];

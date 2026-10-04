import jade from '../assets/cover-float-jade.svg?raw';
import clay from '../assets/cover-float-clay.svg?raw';
import mist from '../assets/cover-float-mist.svg?raw';
import type { CoverArt } from './art';
const url = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
/** Stable IDs keep existing collections and JSON backups compatible. */
export const covers: CoverArt[] = [
  { id: 'mountain', name: '青釉', src: url(jade) },
  { id: 'orchid', name: '陶朱', src: url(clay) },
  { id: 'indigo', name: '玉白', src: url(mist) },
];

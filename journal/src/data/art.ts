import orchidSvg from '../assets/icon-orchid.svg?raw';
import plumSvg from '../assets/icon-plum.svg?raw';
import bambooSvg from '../assets/icon-bamboo.svg?raw';
import fanSvg from '../assets/icon-fan.svg?raw';
import moonSvg from '../assets/icon-moon.svg?raw';
import sealSvg from '../assets/icon-seal.svg?raw';
import teacupSvg from '../assets/icon-teacup.svg?raw';
import bookSvg from '../assets/icon-book.svg?raw';
import lotusSvg from '../assets/icon-lotus.svg?raw';
import ginkgoSvg from '../assets/icon-ginkgo.svg?raw';
import umbrellaSvg from '../assets/icon-umbrella.svg?raw';
import swallowSvg from '../assets/icon-swallow.svg?raw';
import mountainCoverSvg from '../assets/cover-mountain.svg?raw';
import orchidCoverSvg from '../assets/cover-orchid.svg?raw';
import indigoCoverSvg from '../assets/cover-indigo.svg?raw';
import paperTextureSvg from '../assets/texture-paper-fibers.svg?raw';
import frameSvg from '../assets/frame-key-corners.svg?raw';
import demoPhotoSvg from '../assets/demo-landscape.svg?raw';

/** Self-contained SVG URLs work in the app, exported pages, and offline builds. */
const svgUrl = (svg: string): string => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

export type StickerGroup = '草木' | '日常' | '时光';
export interface StickerArt {
  id: string;
  name: string;
  group: StickerGroup;
  src: string;
  width: number;
  height: number;
}

export const stickers: StickerArt[] = [
  { id: 'icon-orchid', name: '兰草', group: '草木', src: svgUrl(orchidSvg), width: 144, height: 144 },
  { id: 'icon-plum', name: '梅枝', group: '草木', src: svgUrl(plumSvg), width: 144, height: 144 },
  { id: 'icon-bamboo', name: '竹叶', group: '草木', src: svgUrl(bambooSvg), width: 144, height: 144 },
  { id: 'icon-lotus', name: '莲瓣', group: '草木', src: svgUrl(lotusSvg), width: 144, height: 144 },
  { id: 'icon-ginkgo', name: '银杏', group: '草木', src: svgUrl(ginkgoSvg), width: 144, height: 144 },
  { id: 'icon-fan', name: '团扇', group: '日常', src: svgUrl(fanSvg), width: 144, height: 144 },
  { id: 'icon-teacup', name: '茶盏', group: '日常', src: svgUrl(teacupSvg), width: 144, height: 144 },
  { id: 'icon-book', name: '线装书', group: '日常', src: svgUrl(bookSvg), width: 144, height: 144 },
  { id: 'icon-umbrella', name: '油纸伞', group: '日常', src: svgUrl(umbrellaSvg), width: 144, height: 144 },
  { id: 'icon-moon', name: '月钩', group: '时光', src: svgUrl(moonSvg), width: 144, height: 144 },
  { id: 'icon-seal', name: '闲章', group: '时光', src: svgUrl(sealSvg), width: 144, height: 144 },
  { id: 'icon-swallow', name: '燕归', group: '时光', src: svgUrl(swallowSvg), width: 144, height: 144 },
];

export interface CoverArt {
  id: 'mountain' | 'orchid' | 'indigo';
  name: string;
  src: string;
}

export const covers: CoverArt[] = [
  { id: 'mountain', name: '青山', src: svgUrl(mountainCoverSvg) },
  { id: 'orchid', name: '幽兰', src: svgUrl(orchidCoverSvg) },
  { id: 'indigo', name: '蓝花', src: svgUrl(indigoCoverSvg) },
];

export const paperTexture: string = svgUrl(paperTextureSvg);
export const frameKeyCorners: string = svgUrl(frameSvg);
export const demoPhoto: string = svgUrl(demoPhotoSvg);

import type { AssetKind, ProjectTarget } from '../types';

export type MaterialCategory = 'icon' | 'pattern' | 'frame' | 'texture' | 'interface' | 'prop' | 'scene';
export interface LibraryMaterial {
  id: string;
  name: string;
  category: MaterialCategory;
  family: string;
  traditionIds: string[];
  targets: ProjectTarget[];
  tags: string[];
  description: string;
  usage: string;
  width: number;
  height: number;
  transparent: boolean;
  tileable: boolean;
  assetKind: AssetKind;
  svg: string;
}
export interface ReferenceBoard {
  id: string;
  name: string;
  category: 'character' | 'scene' | 'prop' | 'interface' | 'pattern' | 'architecture';
  description: string;
  traditionIds: string[];
  tags: string[];
  image: string;
  filename: string;
}

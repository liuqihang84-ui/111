export type CitationStatus = 'reference' | 'verified';
export interface SourceReference {
  id: string;
  title: string;
  institution: string;
  url: string;
  period: string;
  medium: string;
  status: CitationStatus;
  note: string;
  checkedAt?: string;
}
export interface PaletteColor { name: string; hex: string; role: string }
export interface ArtTradition {
  id: string;
  name: string;
  subtitle: string;
  era: string;
  eraGroup?: string;
  medium: string;
  keywords: string[];
  shortDescription: string;
  overview: string;
  principles: { title: string; detail: string }[];
  palette: PaletteColor[];
  composition: string;
  silhouette: string;
  materials: string;
  gameTranslation: string[];
  appTranslation: string[];
  pitfalls: string[];
  sourceIds: string[];
  image: 'landscape' | 'forms';
  imagePosition: 'left' | 'center' | 'right';
  promptCore: string;
}
export interface ResearchConcept {
  id: string;
  name: string;
  historicalBasis: string;
  explanation: string;
  gameUse: string;
  appUse: string;
  commonMistake: string;
}
export type ProjectTarget = 'game' | 'app';
export type AssetKind = 'scene' | 'character' | 'prop' | 'icon' | 'interface';
export interface BriefInput {
  traditionId: string;
  target: ProjectTarget;
  assetKind: AssetKind;
  subject: string;
  feeling: string;
  format: string;
  detail: number;
  colorIntensity: number;
  whitespace: number;
}
export interface GeneratedBrief {
  title: string;
  positive: string;
  negative: string;
  specification: string;
  checklist: string[];
  tokens: Record<string, string>;
  markdown: string;
}
export interface SavedProject {
  id: string;
  name: string;
  createdAt: string;
  input: BriefInput;
  brief: GeneratedBrief;
}

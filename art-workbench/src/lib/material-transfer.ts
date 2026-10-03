import { traditions } from '../data/traditions';
import { materials } from '../data/materials';
import type { LibraryMaterial } from '../data/material-types';
import type { ArtTradition, BriefInput, GeneratedBrief, ProjectTarget } from '../types';
import { briefMarkdown, defaultInput, generateBrief } from './brief';

function attachMaterial(brief: GeneratedBrief, input: BriefInput, tradition: ArtTradition, material: LibraryMaterial): GeneratedBrief {
  const format = `素材来源：观物原创现代矢量素材 ${material.name}（${material.id}.svg）；原始画布 ${material.width} × ${material.height}；${material.transparent ? '透明底' : '含背景'}；${material.tileable ? '可平铺单元' : '独立画面，不作为无缝纹理'}。用途：${material.usage}`;
  const next = {
    ...brief,
    specification: `${brief.specification}\n\n${format}`,
    checklist: [...brief.checklist, '衍生素材需与原素材核对轮廓、线宽及材质职责；原图可从素材库下载。'],
    tokens: { ...brief.tokens,
      'material.id': material.id,
      'material.category': material.category,
      'material.filename': `${material.id}.svg`,
      'material.width': String(material.width),
      'material.height': String(material.height),
      'material.transparent': String(material.transparent),
      'material.tileable': String(material.tileable),
      'material.license': '观物原创现代素材，可用于项目与修改；不代表历史复原或馆藏授权。',
      'material.record': JSON.stringify({ id: material.id, traditionId: tradition.id, target: input.target, assetKind: input.assetKind }),
    },
  };
  return { ...next, markdown: briefMarkdown(next, input, tradition) };
}

export function transferMaterial(material: LibraryMaterial, target?: ProjectTarget, traditionId?: string): { input: BriefInput; brief: GeneratedBrief } {
  const tradition = traditions.find(item => item.id === traditionId && material.traditionIds.includes(item.id)) ?? traditions.find(item => material.traditionIds.includes(item.id)) ?? traditions[0];
  const input: BriefInput = {
    ...defaultInput(tradition.id), target: target && material.targets.includes(target) ? target : material.targets.includes('app') && (!material.targets.includes('game') || material.assetKind === 'interface') ? 'app' : 'game',
    assetKind: material.assetKind, subject: `${material.name} · 制作同套衍生素材`,
    feeling: `${material.description}；${material.usage}`, format: 'vector',
  };
  return { input, brief: attachMaterial(generateBrief(input, tradition), input, tradition, material) };
}

export function retainMaterial(brief: GeneratedBrief, input: BriefInput, tradition: ArtTradition, saved?: GeneratedBrief): GeneratedBrief {
  try {
    const record = JSON.parse(saved?.tokens['material.record'] ?? 'null');
    if (!record || record.traditionId !== tradition.id || record.target !== input.target || record.assetKind !== input.assetKind) return brief;
    const material = materials.find(item => item.id === record.id);
    return material && material.traditionIds.includes(tradition.id) && material.targets.includes(input.target) ? attachMaterial(brief, input, tradition, material) : brief;
  } catch { return brief; }
}

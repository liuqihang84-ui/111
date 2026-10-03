import { traditions } from '../data/traditions';
import type { ArtTradition, BriefInput, GeneratedBrief } from '../types';
import type { StudyTransfer } from './study';
import { briefMarkdown, defaultInput, generateBrief } from './brief';

/** Preserve the actual modern experiment in every production/export representation. */
export function transferStudy(payload: StudyTransfer): { input: BriefInput; brief: GeneratedBrief } {
  const tradition = traditions.find(item => item.id === payload.traditionId);
  if (!tradition) throw new Error('这条研究路线不存在，请重新选择。');
  const parameters = Object.fromEntries(Object.entries(payload.parameters).filter(([, value]) => Number.isFinite(value)));
  const input: BriefInput = {
    ...defaultInput(tradition.id),
    target: payload.target,
    assetKind: payload.assetKind,
    subject: payload.subject,
    feeling: '结构清楚、主次有序，以当前研究实验为制作依据',
    format: payload.target === 'app' ? 'vector' : 'painted',
  };
  const whitespace = parameters.emptySpace ?? parameters.whitespace;
  if (whitespace !== undefined) input.whitespace = Math.max(0, Math.min(100, Math.round(whitespace)));
  if (parameters.detail !== undefined) input.detail = Math.max(0, Math.min(100, Math.round(parameters.detail)));
  if (parameters.colorIntensity !== undefined) input.colorIntensity = Math.max(0, Math.min(100, Math.round(parameters.colorIntensity)));
  return { input, brief: attachStudy(generateBrief(input, tradition), input, tradition, payload) };
}

function attachStudy(generated: GeneratedBrief, input: BriefInput, tradition: ArtTradition, payload: StudyTransfer): GeneratedBrief {
  const parameters = Object.fromEntries(Object.entries(payload.parameters).filter(([, value]) => Number.isFinite(value)));
  const parameterRecord = Object.entries(parameters).map(([key, value]) => `${key} = ${value}`).join('；');
  const studyRecord = [
    `研究实验：${payload.experimentTitle}。`,
    parameterRecord ? `当前结构实验参数：${parameterRecord}。` : '',
    '这些参数是本次现代实验的约束，不是原作测量、历史标准或最终素材合格证明。',
    ...payload.constraints,
  ].filter(Boolean).join('\n');
  const checklist = [...generated.checklist, ...payload.checklist];
  const brief: GeneratedBrief = {
    ...generated,
    title: `${generated.title} · 深研实验`,
    positive: `${generated.positive}\n\n${studyRecord}`,
    specification: `${generated.specification}\n\n${studyRecord}`,
    checklist,
    tokens: {
      ...generated.tokens,
      'study.experimentTitle': payload.experimentTitle,
      'study.sourceIds': payload.sourceIds.filter(id => tradition.sourceIds.includes(id)).join(', '),
      'study.parameterScope': 'modern structural experiment; not historical measurement',
      'study.record': JSON.stringify({ ...payload, parameters, sourceIds: payload.sourceIds.filter(id => tradition.sourceIds.includes(id)) }),
      ...Object.fromEntries(Object.entries(parameters).map(([key, value]) => [`study.parameter.${key}`, String(value)])),
    },
  };
  brief.markdown = briefMarkdown(brief, input, tradition);
  return brief;
}

/** Rebuild ordinary fields while keeping a compatible saved structural experiment. */
export function retainStudy(generated: GeneratedBrief, input: BriefInput, tradition: ArtTradition, saved?: GeneratedBrief): GeneratedBrief {
  if (!saved?.tokens['study.record']) return generated;
  try {
    const value: unknown = JSON.parse(saved.tokens['study.record']);
    if (!value || typeof value !== 'object') return generated;
    const p = value as StudyTransfer;
    if (p.traditionId !== tradition.id || p.target !== input.target || p.assetKind !== input.assetKind
      || typeof p.subject !== 'string' || typeof p.experimentTitle !== 'string'
      || !p.parameters || typeof p.parameters !== 'object' || Array.isArray(p.parameters)
      || Object.values(p.parameters).some(item => typeof item !== 'number' || !Number.isFinite(item))
      || ![p.constraints, p.checklist, p.sourceIds].every(items => Array.isArray(items) && items.every(item => typeof item === 'string'))) return generated;
    return attachStudy(generated, input, tradition, p);
  } catch { return generated; }
}

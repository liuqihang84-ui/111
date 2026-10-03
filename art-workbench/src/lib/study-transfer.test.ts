import { describe, expect, it } from 'vitest';
import { retainStudy, transferStudy } from './study-transfer';
import { generateBrief } from './brief';
import { traditions } from '../data/traditions';
import type { StudyTransfer } from './study';

const research: StudyTransfer = {
  traditionId: 'blue-green-landscape', target: 'game', assetKind: 'scene',
  subject: '渡口与临水步道的结构实验', experimentTitle: '开放区实验 · 采用 B 方案',
  parameters: { opening: 67, mass: 45, invalid: Number.NaN },
  constraints: ['只改变开放水面的面积，主峰和渡口位置固定。'],
  checklist: ['待人工检查：缩到实际镜头后路径仍可辨。'],
  sourceIds: ['thousand-li', 'not-a-real-source'],
};

describe('research experiment becomes a persistent production specification', () => {
  it('keeps the actual experimental constraint and parameter in every export', () => {
    const { input, brief } = transferStudy(research);
    expect(input.whitespace).toBe(42);
    expect(input.subject).toBe(research.subject);
    for (const text of [brief.positive, brief.specification, brief.markdown]) {
      expect(text).toContain('开放区实验');
      expect(text).toContain('只改变开放水面的面积');
      expect(text).toContain('opening = 67');
    }
    expect(brief.tokens['study.parameter.opening']).toBe('67');
    expect(brief.tokens['study.parameter.invalid']).toBeUndefined();
    expect(brief.tokens['study.sourceIds']).toBe('thousand-li');
    expect(brief.checklist).toContain(research.checklist[0]);
    expect(brief.markdown).toContain('待人工检查');
  });

  it('uses App specifications while retaining the same research record', () => {
    const { input, brief } = transferStudy({ ...research, target: 'app', assetKind: 'interface' });
    expect(input.format).toBe('vector');
    expect(brief.positive).toContain('App');
    expect(brief.specification).toContain('390');
    expect(brief.tokens['study.experimentTitle']).toBe(research.experimentTitle);
    expect(brief.positive).toContain('不是原作测量');
  });

  it('rejects a nonexistent tradition instead of silently using another source', () => {
    expect(() => transferStudy({ ...research, traditionId: 'unknown' })).toThrow('研究路线不存在');
  });

  it('rebuilds a changed subject without losing its compatible research record', () => {
    const { input, brief } = transferStudy(research);
    const changed = { ...input, subject: '新渡口主体' };
    const tradition = traditions.find(t => t.id === input.traditionId)!;
    const next = retainStudy(generateBrief(changed, tradition), changed, tradition, brief);
    expect(next.positive).toContain('新渡口主体');
    expect(next.positive).toContain('只改变开放水面的面积');
    expect(next.tokens['study.parameter.opening']).toBe('67');
    expect(next.markdown).toContain('待人工检查');
    const app = { ...changed, target: 'app' as const };
    expect(retainStudy(generateBrief(app, tradition), app, tradition, brief).tokens['study.parameter.opening']).toBeUndefined();
  });

  it('ignores malformed imported experiment metadata without breaking normal production', () => {
    const { input, brief } = transferStudy(research);
    const tradition = traditions.find(t => t.id === input.traditionId)!;
    const generated = generateBrief(input, tradition);
    const malformed = { ...brief, tokens: { ...brief.tokens, 'study.record': '{bad json' } };
    expect(retainStudy(generated, input, tradition, malformed)).toBe(generated);
  });
});

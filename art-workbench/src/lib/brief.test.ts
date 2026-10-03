import { describe, expect, it } from 'vitest';
import { traditions, sources } from '../data/traditions';
import { defaultInput, generateBrief } from './brief';

describe('historical art production briefs', () => {
  it('translates game and App needs into materially different interface deliverables', () => {
    const tradition = traditions[0];
    const game = generateBrief({ ...defaultInput(tradition.id), assetKind: 'interface', target: 'game' }, tradition);
    const app = generateBrief({ ...defaultInput(tradition.id), assetKind: 'interface', target: 'app' }, tradition);
    expect(game.specification).toContain('9-slice');
    expect(game.positive).toContain('中央保留动作区域');
    expect(app.specification).toContain('390 × 844');
    expect(app.specification).toContain('4.5:1');
    expect(app.positive).toContain(tradition.appTranslation[0]);
    expect(app.specification).not.toEqual(game.specification);
  });

  it('uses valid frame geometry for game pixel characters and semantic grid rules for App icons', () => {
    const tradition = traditions[0];
    const character = generateBrief({ ...defaultInput(tradition.id), assetKind: 'character', format: 'pixel' }, tradition);
    const icon = generateBrief({ ...defaultInput(tradition.id), target: 'app', assetKind: 'icon', format: 'vector' }, tradition);
    expect(character.specification).toContain('64 × 96');
    expect(character.specification).toContain('384 × 384');
    expect(character.specification).toContain('(32, 88)');
    expect(icon.specification).toContain('24 × 24');
    expect(icon.specification).toContain('currentColor');
    expect(icon.specification).toContain('44 × 44');
    expect(icon.specification).not.toContain('图集');
  });

  it('carries exact curated palette values, source titles and source IDs instead of generic ancient-style words', () => {
    for (const tradition of traditions) {
      const brief = generateBrief(defaultInput(tradition.id), tradition);
      for (const color of tradition.palette) expect(brief.positive).toContain(color.hex);
      expect(brief.tokens['color.primary']).toBe(tradition.palette[0].hex);
      expect(brief.tokens['source.traditionId']).toBe(tradition.id);
      expect(brief.positive).toContain(tradition.composition);
      expect(brief.positive).toContain(tradition.materials);
      const cited = sources.filter((source) => tradition.sourceIds.includes(source.id));
      expect(cited.length).toBeGreaterThan(0);
      for (const source of cited) {
        expect(brief.markdown).toContain(source.url);
        expect(brief.positive).toContain(source.title);
      }
    }
  });

  it('treats a user subject as plain text and prevents raw HTML in Markdown exports', () => {
    const tradition = traditions[0];
    const subject = '<img src=x onerror=alert(1)> ``` <script>bad()</script>';
    const brief = generateBrief({ ...defaultInput(tradition.id), subject }, tradition);
    expect(brief.positive).toContain(subject);
    expect(brief.markdown).not.toContain('<img');
    expect(brief.markdown).not.toContain('<script>');
    expect(brief.markdown).toContain('&lt;img');
    expect(brief.markdown).toContain('````text');
    expect(brief.tokens).not.toHaveProperty('onerror');
  });

  it('does not turn a static character illustration into a claimed animation atlas', () => {
    const tradition = traditions[0];
    const brief = generateBrief({ ...defaultInput(tradition.id), assetKind: 'character', format: 'painted' }, tradition);
    expect(brief.specification).toContain('三视图不能直接宣称可用动画图集');
    expect(brief.checklist.some((item) => item.includes('静态稿先不冒充动画'))).toBe(true);
  });

  it('clamps exported percentages and provides genuinely readable UI text tokens', () => {
    const tradition = traditions[0];
    const brief = generateBrief({ ...defaultInput(tradition.id), target: 'app', whitespace: 150, detail: -9, colorIntensity: Number.NaN }, tradition);
    expect(brief.tokens['composition.emptySpace']).toBe('100%');
    expect(brief.tokens['rendering.detail']).toBe('0%');
    expect(brief.tokens['rendering.colorIntensity']).toBe('50%');
    expect(parseFloat(brief.tokens['color.textOnSurfaceContrast'])).toBeGreaterThanOrEqual(4.5);
  });

  it('changes structure and deliverables when the same subject switches from scene to prop', () => {
    const tradition = traditions[0];
    const input = { ...defaultInput(tradition.id), format: 'vector', subject: '河边一盏灯' };
    const scene = generateBrief({ ...input, assetKind: 'scene' }, tradition);
    const prop = generateBrief({ ...input, assetKind: 'prop' }, tradition);
    expect(scene.positive).toContain('前景遮挡、中景行走面、远景三层');
    expect(prop.positive).toContain('3/4 视角');
    expect(prop.specification).toContain('256 × 256');
    expect(scene.specification).toContain('1280 × 720');
    expect(prop.specification).not.toEqual(scene.specification);
  });
});

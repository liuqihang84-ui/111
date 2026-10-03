import { describe, expect, it } from 'vitest';
import { analyzePixels, contrastRatio, hexToRgb, normalizeHex, relativeLuminance } from './color';

describe('strict CSS hex colors and WCAG contrast', () => {
  it('normalizes three and six digit hex without accepting missing or alpha values', () => {
    expect(normalizeHex('  #aB3 ')).toBe('#AABB33');
    expect(hexToRgb('#123456')).toEqual([18, 52, 86]);
    for (const invalid of ['', ' ', '000000', '#abcd', '#00000000', '#GGGGGG', '#12', 'red']) {
      expect(normalizeHex(invalid)).toBeNull();
      expect(relativeLuminance(invalid)).toBeNull();
      expect(contrastRatio(invalid, '#ffffff')).toBeNull();
    }
  });
  it('calculates known reference pairs and is symmetrical', () => {
    expect(contrastRatio('#000', '#fff')).toBeCloseTo(21, 8);
    expect(contrastRatio('#777777', '#FFFFFF')).toBeCloseTo(4.478089453577214, 8);
    expect(contrastRatio('#FF0000', '#FFFFFF')).toBeCloseTo(3.9984767707539985, 8);
    expect(contrastRatio('#123456', '#abcdef')).toBe(contrastRatio('#abcdef', '#123456'));
    expect(contrastRatio('#2A2A2A', '#2A2A2A')).toBe(1);
  });
  it('uses exact values for threshold decisions rather than display rounding', () => {
    expect(contrastRatio('#777', '#fff')!).toBeLessThan(4.5);
    expect(contrastRatio('#767676', '#fff')!).toBeGreaterThan(4.5);
    expect(relativeLuminance('#000')).toBe(0);
    expect(relativeLuminance('#fff')).toBe(1);
  });
});

describe('alpha-aware representative colors', () => {
  it('ignores hidden colors in fully transparent pixels and preserves gray', () => {
    const result = analyzePixels(new Uint8ClampedArray([
      128, 128, 128, 255,
      128, 128, 128, 128,
      255, 0, 0, 0,
      0, 255, 0, 0,
    ]));
    expect(result.colors).toEqual([{ hex: '#808080', share: 1 }]);
    expect(result.transparentRatio).toBe(0.75);
    expect(result.fullyTransparentRatio).toBe(0.5);
    expect(result.partiallyTransparentRatio).toBe(0.25);
    expect(result.meanOpacity).toBeCloseTo((1 + 128 / 255) / 4);
  });
  it('returns no artificial black palette for a fully transparent image', () => {
    const result = analyzePixels(new Uint8ClampedArray([45, 90, 120, 0, 255, 255, 255, 0]));
    expect(result.colors).toEqual([]);
    expect(result.transparentRatio).toBe(1);
    expect(result.meanOpacity).toBe(0);
  });
  it('extracts the five visible colors with alpha-weighted shares', () => {
    const result = analyzePixels(new Uint8ClampedArray([
      255, 0, 0, 255, 255, 0, 0, 255,
      0, 255, 0, 255, 0, 0, 255, 255,
      255, 255, 255, 255, 0, 0, 0, 128,
    ]));
    expect(result.colors).toHaveLength(5);
    expect(result.colors[0].hex).toBe('#FF0000');
    expect(result.colors.reduce((sum, color) => sum + color.share, 0)).toBeCloseTo(1);
    expect(result.colors.find((color) => color.hex === '#000000')!.share).toBeCloseTo((128 / 255) / (5 + 128 / 255));
  });
  it('handles one-color inputs and rejects malformed pixel buffers', () => {
    expect(analyzePixels(new Uint8ClampedArray([9, 12, 18, 255])).colors).toEqual([{ hex: '#090C12', share: 1 }]);
    for (const invalid of [[], [0, 0, 0], [NaN, 0, 0, 255], [0, 0, 0, 256]]) {
      expect(() => analyzePixels(invalid)).toThrow();
    }
    expect(() => analyzePixels([0, 0, 0, 255], 0)).toThrow();
    expect(() => analyzePixels([0, 0, 0, 255], 2.5)).toThrow();
  });
});

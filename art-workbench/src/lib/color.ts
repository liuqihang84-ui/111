/** Browser-independent color tools. Values use the WCAG 2.x sRGB formula. */
export function normalizeHex(value: string): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (/^#[0-9a-f]{3}$/i.test(trimmed)) {
    return `#${trimmed.slice(1).split('').map((part) => part + part).join('')}`.toUpperCase();
  }
  return /^#[0-9a-f]{6}$/i.test(trimmed) ? trimmed.toUpperCase() : null;
}

export function hexToRgb(value: string): [number, number, number] | null {
  const normalized = normalizeHex(value);
  if (!normalized) return null;
  return [1, 3, 5].map((offset) => Number.parseInt(normalized.slice(offset, offset + 2), 16)) as [number, number, number];
}

export function relativeLuminance(value: string): number | null {
  const rgb = hexToRgb(value);
  if (!rgb) return null;
  const linear = rgb.map((channel) => {
    const unit = channel / 255;
    return unit <= 0.04045 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

export function contrastRatio(foreground: string, background: string): number | null {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  if (a === null || b === null) return null;
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

export interface DominantColor {
  hex: string;
  /** Visible alpha-weighted share; these shares add up to one. */
  share: number;
}

export interface PixelAnalysis {
  colors: DominantColor[];
  samplePixels: number;
  transparentRatio: number;
  fullyTransparentRatio: number;
  partiallyTransparentRatio: number;
  meanOpacity: number;
}

interface ColorBin {
  weight: number;
  red: number;
  green: number;
  blue: number;
}

interface ColorBucket {
  bins: ColorBin[];
  weight: number;
  ranges: [number, number, number];
}

function bucketOf(bins: ColorBin[]): ColorBucket {
  const mins = [255, 255, 255];
  const maxs = [0, 0, 0];
  let weight = 0;
  for (const bin of bins) {
    weight += bin.weight;
    const rgb = [bin.red, bin.green, bin.blue];
    rgb.forEach((channel, axis) => {
      mins[axis] = Math.min(mins[axis], channel);
      maxs[axis] = Math.max(maxs[axis], channel);
    });
  }
  return { bins, weight, ranges: maxs.map((maximum, axis) => maximum - mins[axis]) as [number, number, number] };
}

function toHex(channels: number[]): string {
  return `#${channels.map((channel) => Math.round(channel).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

/**
 * Extract up to five representative colors with weighted median-cut quantization.
 * Transparent pixels do not contribute hidden RGB colors. Partial alpha weights
 * their contribution rather than flattening against an invented background.
 * Transparency is measured on the supplied pixels, which may be a downsample.
 */
export function analyzePixels(pixels: ArrayLike<number>, colorCount = 5): PixelAnalysis {
  if (!Number.isInteger(pixels.length) || pixels.length === 0 || pixels.length % 4 !== 0) {
    throw new Error('Pixel data must contain complete, nonempty RGBA pixels.');
  }
  if (!Number.isInteger(colorCount) || colorCount < 1 || colorCount > 16) {
    throw new Error('Color count must be an integer from 1 to 16.');
  }
  const bins = new Map<number, ColorBin>();
  const samplePixels = pixels.length / 4;
  let full = 0;
  let partial = 0;
  let opacitySum = 0;
  for (let index = 0; index < pixels.length; index += 4) {
    const rgba = [pixels[index], pixels[index + 1], pixels[index + 2], pixels[index + 3]];
    if (rgba.some((channel) => !Number.isFinite(channel) || channel < 0 || channel > 255)) {
      throw new Error('RGBA channels must be finite values from 0 to 255.');
    }
    const [red, green, blue, alpha] = rgba;
    const weight = alpha / 255;
    opacitySum += weight;
    if (alpha === 0) { full += 1; continue; }
    if (alpha < 255) partial += 1;
    // Five-bit bins bound memory while retaining weighted mean source colors.
    const key = ((red >> 3) << 10) | ((green >> 3) << 5) | (blue >> 3);
    const existing = bins.get(key);
    if (existing) {
      const total = existing.weight + weight;
      existing.red = (existing.red * existing.weight + red * weight) / total;
      existing.green = (existing.green * existing.weight + green * weight) / total;
      existing.blue = (existing.blue * existing.weight + blue * weight) / total;
      existing.weight = total;
    } else {
      bins.set(key, { weight, red, green, blue });
    }
  }
  const buckets: ColorBucket[] = bins.size ? [bucketOf([...bins.values()])] : [];
  while (buckets.length < colorCount) {
    let choice = -1;
    let highestScore = -1;
    buckets.forEach((bucket, index) => {
      if (bucket.bins.length < 2) return;
      const score = Math.max(...bucket.ranges) * Math.sqrt(bucket.weight);
      if (score > highestScore) { highestScore = score; choice = index; }
    });
    if (choice < 0) break;
    const bucket = buckets[choice];
    const axis = bucket.ranges.indexOf(Math.max(...bucket.ranges));
    const channel = (bin: ColorBin) => [bin.red, bin.green, bin.blue][axis];
    const sorted = [...bucket.bins].sort((a, b) => channel(a) - channel(b));
    let cumulative = 0;
    let split = 1;
    for (let index = 0; index < sorted.length - 1; index += 1) {
      cumulative += sorted[index].weight;
      split = index + 1;
      if (cumulative >= bucket.weight / 2) break;
    }
    buckets.splice(choice, 1, bucketOf(sorted.slice(0, split)), bucketOf(sorted.slice(split)));
  }
  const combined = new Map<string, number>();
  for (const bucket of buckets) {
    const sums = [0, 0, 0];
    for (const bin of bucket.bins) {
      sums[0] += bin.red * bin.weight;
      sums[1] += bin.green * bin.weight;
      sums[2] += bin.blue * bin.weight;
    }
    const hex = toHex(sums.map((sum) => sum / bucket.weight));
    combined.set(hex, (combined.get(hex) ?? 0) + bucket.weight / opacitySum);
  }
  return {
    colors: [...combined].map(([hex, share]) => ({ hex, share })).sort((a, b) => b.share - a.share || a.hex.localeCompare(b.hex)),
    samplePixels,
    transparentRatio: (full + partial) / samplePixels,
    fullyTransparentRatio: full / samplePixels,
    partiallyTransparentRatio: partial / samplePixels,
    meanOpacity: opacitySum / samplePixels,
  };
}

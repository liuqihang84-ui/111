import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { materials } from '../data/materials';
import { traditions } from '../data/traditions';
import { createMaterialPack } from './material-export';
import { generateBrief } from './brief';
import { retainMaterial, transferMaterial } from './material-transfer';

const decoder = new TextDecoder();

/** Independent reader: validate the produced ZIP, rather than trusting its manifest. */
function readStoredZip(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  expect(view.getUint32(bytes.length - 22, true)).toBe(0x06054b50);
  expect(view.getUint16(bytes.length - 18, true)).toBe(0);
  expect(view.getUint16(bytes.length - 16, true)).toBe(0);
  const count = view.getUint16(bytes.length - 12, true);
  expect(view.getUint16(bytes.length - 14, true)).toBe(count);
  const centralSize = view.getUint32(bytes.length - 10, true);
  const centralOffset = view.getUint32(bytes.length - 6, true);
  expect(centralOffset + centralSize).toBe(bytes.length - 22);
  const files = new Map<string, Uint8Array>();
  let cursor = centralOffset;
  for (let index = 0; index < count; index += 1) {
    expect(view.getUint32(cursor, true)).toBe(0x02014b50);
    expect(view.getUint16(cursor + 10, true)).toBe(0);
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const nameBytes = bytes.subarray(cursor + 46, cursor + 46 + nameLength);
    const name = decoder.decode(nameBytes);
    expect(files.has(name), `Duplicate archive entry: ${name}`).toBe(false);
    expect(name).not.toMatch(/(?:^\/|(^|\/)\.\.(\/|$)|\\)/);
    const local = view.getUint32(cursor + 42, true);
    expect(view.getUint32(local, true)).toBe(0x04034b50);
    expect(view.getUint16(local + 8, true)).toBe(0);
    const localNameLength = view.getUint16(local + 26, true);
    expect(decoder.decode(bytes.subarray(local + 30, local + 30 + localNameLength))).toBe(name);
    const size = view.getUint32(cursor + 24, true);
    expect(view.getUint32(cursor + 20, true)).toBe(size);
    expect(view.getUint32(local + 18, true)).toBe(size);
    expect(view.getUint32(local + 22, true)).toBe(size);
    const dataStart = local + 30 + localNameLength + view.getUint16(local + 28, true);
    const content = bytes.subarray(dataStart, dataStart + size);
    expect(content.length).toBe(size);
    expect(dataStart + size).toBeLessThanOrEqual(centralOffset);
    // Bit-at-a-time implementation, independent of the producer's lookup table.
    let checksum = 0xffffffff;
    for (const byte of content) {
      checksum ^= byte;
      for (let bit = 0; bit < 8; bit += 1) checksum = (checksum >>> 1) ^ ((checksum & 1) ? 0xedb88320 : 0);
    }
    checksum = (checksum ^ 0xffffffff) >>> 0;
    expect(view.getUint32(cursor + 16, true), `Central CRC: ${name}`).toBe(checksum);
    expect(view.getUint32(local + 14, true), `Local CRC: ${name}`).toBe(checksum);
    files.set(name, content);
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  expect(cursor).toBe(centralOffset + centralSize);
  return files;
}

function geometryFingerprint(svg: string) {
  const geometryNames = new Set(['d', 'x', 'y', 'width', 'height', 'cx', 'cy', 'r', 'rx', 'ry', 'x1', 'x2', 'y1', 'y2', 'fx', 'fy', 'fr', 'offset', 'gradientTransform', 'gradientUnits', 'points', 'transform', 'viewBox', 'baseFrequency', 'seed', 'scale', 'numOctaves']);
  const geometry = [...svg.matchAll(/<(svg|path|rect|circle|ellipse|line|polyline|polygon|g|use|linearGradient|radialGradient|stop|feTurbulence|feDisplacementMap)\b([^>]*)>/g)].map(([, tag, attributes]) => {
    const values = [...attributes.matchAll(/([\w:-]+)\s*=\s*["']([^"']*)["']/g)]
      .filter(([, name]) => geometryNames.has(name))
      .map(([, name, value]) => [name, value.trim().replace(/\s+/g, ' ')])
      .sort((a, b) => a[0].localeCompare(b[0]));
    return [tag, values];
  });
  return createHash('sha256').update(JSON.stringify(geometry)).digest('hex');
}

describe('the downloadable material collection', () => {
  it('contains 192 individually identified assets across seven game and App categories', () => {
    expect(materials).toHaveLength(192);
    expect(new Set(materials.map(material => material.id)).size).toBe(materials.length);
    const counts = Object.fromEntries(['icon', 'pattern', 'frame', 'texture', 'interface', 'prop', 'scene'].map(category => [category, materials.filter(material => material.category === category).length]));
    expect(counts).toEqual({ icon: 60, pattern: 32, frame: 24, texture: 24, interface: 16, prop: 20, scene: 16 });
    for (const material of materials) {
      expect(material.id).toMatch(/^[a-z0-9-]+$/);
      expect(material.name.trim().length).toBeGreaterThanOrEqual(2);
      expect(material.description.length).toBeGreaterThan(8);
      expect(material.usage.length).toBeGreaterThan(8);
      expect(material.tags.length).toBeGreaterThan(0);
      expect(material.targets.length).toBeGreaterThan(0);
      expect(material.targets.every(target => target === 'game' || target === 'app')).toBe(true);
      expect(material.width).toBeGreaterThan(0);
      expect(material.height).toBeGreaterThan(0);
      expect(Number.isInteger(material.width) && Number.isInteger(material.height)).toBe(true);
    }
  });

  it('links every one of the 48 research traditions to real assets without orphan route IDs', () => {
    expect(traditions).toHaveLength(48);
    const validIds = new Set(traditions.map(tradition => tradition.id));
    const linkedIds = new Set<string>();
    for (const material of materials) {
      expect(material.traditionIds.length).toBeGreaterThan(0);
      for (const id of material.traditionIds) {
        expect(validIds.has(id), `${material.id} links unknown tradition ${id}`).toBe(true);
        linkedIds.add(id);
      }
    }
    expect([...linkedIds].sort()).toEqual([...validIds].sort());
  });

  it('contains different drawn geometry for every asset, rather than counting recolors as new material', () => {
    const seen = new Map<string, string>();
    for (const material of materials) {
      const fingerprint = geometryFingerprint(material.svg);
      expect(seen.get(fingerprint), `${material.id} repeats geometry of ${seen.get(fingerprint)}`).toBeUndefined();
      seen.set(fingerprint, material.id);
    }
  });

  it('ships complete SVGs with correct canvas sizes and no remote, script or font dependency', () => {
    for (const material of materials) {
      expect(material.svg).toMatch(/^\s*<svg\b/);
      expect(material.svg).toMatch(/xmlns=["']http:\/\/www\.w3\.org\/2000\/svg["']/);
      expect(material.svg).toContain(`viewBox="0 0 ${material.width} ${material.height}"`);
      expect(material.svg).toMatch(/<\/(?:svg)>\s*$/);
      expect(material.svg).not.toMatch(/<(?:script|foreignObject|image|text)\b|\son\w+\s*=|@import|@font-face|javascript:/i);
      for (const [, reference] of material.svg.matchAll(/(?:href|src)\s*=\s*["']([^"']+)["']/gi)) expect(reference).toMatch(/^#/);
      for (const [, reference] of material.svg.matchAll(/url\(([^)]+)\)/gi)) expect(reference.trim().replace(/^["']|["']$/g, '')).toMatch(/^#/);
      expect(material.svg).toMatch(/<(?:path|rect|circle|ellipse|line|polyline|polygon)\b/);
    }
  });

  it('exports the complete ZIP with independently checked CRCs and byte-identical editable SVG sources', async () => {
    const blob = createMaterialPack(materials);
    expect(blob.type).toBe('application/zip');
    const archive = readStoredZip(new Uint8Array(await blob.arrayBuffer()));
    expect(archive.size).toBe(materials.length + 2);
    const manifest = JSON.parse(decoder.decode(archive.get('manifest.json')));
    expect(manifest.kind).toBe('guanwu-material-pack');
    expect(manifest.count).toBe(materials.length);
    expect(manifest.materials.map((material: { id: string }) => material.id)).toEqual(materials.map(material => material.id));
    expect(manifest.usageNotice).toContain('原创现代视觉转译');
    expect(manifest.license).toContain('commercial use');
    expect(decoder.decode(archive.get('README.txt'))).toContain('Godot');
    for (const material of materials) expect(decoder.decode(archive.get(`svg/${material.id}.svg`))).toBe(material.svg);
  });

  it('exports only selected materials, deduplicates IDs and rejects empty or unsafe filenames', async () => {
    const selected = [materials[0], materials[17], materials[81], materials[0]];
    const archive = readStoredZip(new Uint8Array(await createMaterialPack(selected).arrayBuffer()));
    const manifest = JSON.parse(decoder.decode(archive.get('manifest.json')));
    expect(manifest.count).toBe(3);
    expect(manifest.materials.map((material: { id: string }) => material.id)).toEqual(selected.slice(0, 3).map(material => material.id));
    expect([...archive.keys()].sort()).toEqual(['manifest.json', 'README.txt', ...selected.slice(0, 3).map(material => `svg/${material.id}.svg`)].sort());
    expect(() => createMaterialPack([])).toThrow(/选择/);
    expect(() => createMaterialPack([{ ...materials[0], id: '../escape' }])).toThrow(/文件名/);
  });

  it('transfers a real material into production with its dimensions, filename and editable record', () => {
    const material = materials.find(item => item.targets.length === 1 && item.targets[0] === 'app')
      ?? materials.find(item => item.assetKind === 'interface' && item.targets.includes('app'));
    expect(material, 'The collection includes App interface assets').toBeDefined();
    const result = transferMaterial(material!);
    expect(result.input.target).toBe('app');
    expect(result.input.assetKind).toBe(material!.assetKind);
    expect(material!.traditionIds).toContain(result.input.traditionId);
    expect(result.brief.tokens['material.id']).toBe(material!.id);
    expect(result.brief.tokens['material.filename']).toBe(`${material!.id}.svg`);
    expect(result.brief.tokens['material.width']).toBe(String(material!.width));
    expect(result.brief.tokens['material.height']).toBe(String(material!.height));
    expect(result.brief.specification).toContain(`${material!.width} × ${material!.height}`);
    expect(result.brief.markdown).toContain(`${material!.id}.svg`);
    expect(JSON.parse(result.brief.tokens['material.record'])).toEqual({ id: material!.id, traditionId: result.input.traditionId, target: 'app', assetKind: material!.assetKind });
  });

  it('retains material provenance on compatible edits and discards it after an incompatible target change', () => {
    const original = transferMaterial(materials[0]);
    const tradition = traditions.find(item => item.id === original.input.traditionId)!;
    const input = { ...original.input, subject: '素材延展后的新主体', detail: 42 };
    const fresh = generateBrief(input, tradition);
    const retained = retainMaterial(fresh, input, tradition, original.brief);
    expect(retained.positive).toContain(input.subject);
    expect(retained.tokens['rendering.detail']).toBe('42%');
    expect(retained.tokens['material.record']).toBe(original.brief.tokens['material.record']);
    expect(retained.specification).toContain(`${materials[0].id}.svg`);
    const incompatible = { ...input, target: input.target === 'game' ? 'app' as const : 'game' as const };
    const unlinked = generateBrief(incompatible, tradition);
    expect(retainMaterial(unlinked, incompatible, tradition, retained)).toEqual(unlinked);
    const malformed = { ...retained, tokens: { ...retained.tokens, 'material.record': '{broken' } };
    expect(retainMaterial(fresh, input, tradition, malformed)).toEqual(fresh);
  });
});

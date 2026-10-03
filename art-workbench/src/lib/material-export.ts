import type { LibraryMaterial } from '../data/material-types';

const encoder = new TextEncoder();
const usageNotice = '这些素材是观物为游戏与 App 制作的原创现代视觉转译，不是博物馆藏品图像、古代图样复刻或历史复原。允许下载、修改并用于个人或商业游戏、App、网站和展示；无需署名。禁止将其说明为特定古代原件的精确复原。SVG 保持可编辑，PNG 是浏览器按所选尺寸栅格化的结果。';

export function svgDataUrl(material: LibraryMaterial): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(material.svg)}`;
}

function saveBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function downloadMaterial(material: LibraryMaterial): void {
  saveBlob(`${material.id}.svg`, new Blob([material.svg], { type: 'image/svg+xml;charset=utf-8' }));
}

export async function downloadMaterialPng(material: LibraryMaterial, size = 1024): Promise<void> {
  if (!Number.isFinite(size) || size < 16 || size > 4096) throw new Error('PNG 最大边须为 16 至 4096 像素。');
  const ratio = Math.round(size) / Math.max(material.width, material.height);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(material.width * ratio));
  canvas.height = Math.max(1, Math.round(material.height * ratio));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('浏览器无法建立 PNG 画布。');
  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('素材预览无法解码，请下载 SVG 版本。'));
    image.src = svgDataUrl(material);
  });
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('PNG 导出失败。')), 'image/png'));
  saveBlob(`${material.id}-${canvas.width}x${canvas.height}.png`, blob);
}

export function materialManifest(list: LibraryMaterial[]) {
  return {
    version: 1,
    kind: 'guanwu-material-pack',
    license: 'Guanwu original assets — personal and commercial use, modification permitted, attribution optional.',
    usageNotice,
    count: list.length,
    materials: list.map(({ svg: _svg, ...metadata }) => ({ ...metadata, file: `svg/${metadata.id}.svg` })),
  };
}

export function downloadMaterialManifest(list: LibraryMaterial[]): void {
  saveBlob('guanwu-material-manifest.json', new Blob([JSON.stringify(materialManifest(list), null, 2)], { type: 'application/json;charset=utf-8' }));
}

const crcTable = Uint32Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit += 1) crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  return crc >>> 0;
});

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/** ZIP method 0 (stored). No library, network request or service is needed. */
export function createMaterialPack(list: LibraryMaterial[]): Blob {
  if (!list.length) throw new Error('请先选择至少一个素材。');
  const unique = [...new Map(list.map(material => [material.id, material])).values()];
  if (unique.length > 10_000) throw new Error('一次打包最多 10,000 个素材。');
  if (unique.some(material => !/^[a-z0-9-]+$/.test(material.id))) throw new Error('素材文件名含不支持的字符。');
  const manifest = materialManifest(unique);
  const files = [
    ...unique.map(material => ({ name: `svg/${material.id}.svg`, bytes: encoder.encode(material.svg) })),
    { name: 'manifest.json', bytes: encoder.encode(JSON.stringify(manifest, null, 2)) },
    { name: 'README.txt', bytes: encoder.encode(`观物原创素材包\n\n${usageNotice}\n\n目录：svg/ 中为完整可编辑 SVG；manifest.json 包含分类、用途、尺寸、透明与平铺标记、研究路线。\n\n透明标记指画布背景透明；非透明素材包含自身背景。平铺标记仅适用于对应可重复纹样/材质，其他文件作为单幅素材使用。\n\n导入 Godot：拖入 SVG，按项目需要调整导入栅格尺寸。导入 Web/App：作为 img、CSS 背景或内联 SVG；纹样可使用 repeat。SVG 内部不含外部字体、脚本或远程资源。\n\n若需要 PNG，请在观物素材详情中按最大边尺寸导出；ZIP 保留矢量源文件。`) },
  ];
  const localParts: Uint8Array<ArrayBuffer>[] = [];
  const centralParts: Uint8Array<ArrayBuffer>[] = [];
  let offset = 0;
  let centralSize = 0;
  for (const file of files) {
    const name = encoder.encode(file.name);
    const crc = crc32(file.bytes);
    const local = new Uint8Array(30 + name.length);
    const view = new DataView(local.buffer);
    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, 0x0800, true); // UTF-8.
    view.setUint16(12, 0x0021, true); // 1980-01-01, deterministic file date.
    view.setUint32(14, crc, true);
    view.setUint32(18, file.bytes.length, true);
    view.setUint32(22, file.bytes.length, true);
    view.setUint16(26, name.length, true);
    local.set(name, 30);
    localParts.push(local, file.bytes);

    const central = new Uint8Array(46 + name.length);
    const centralView = new DataView(central.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0x0800, true);
    centralView.setUint16(14, 0x0021, true);
    centralView.setUint32(16, crc, true);
    centralView.setUint32(20, file.bytes.length, true);
    centralView.setUint32(24, file.bytes.length, true);
    centralView.setUint16(28, name.length, true);
    centralView.setUint32(42, offset, true);
    central.set(name, 46);
    centralParts.push(central);
    offset += local.length + file.bytes.length;
    centralSize += central.length;
  }
  if (offset + centralSize > 0xffffffff) throw new Error('素材包超过 ZIP 容量。');
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, files.length, true);
  endView.setUint16(10, files.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, offset, true);
  return new Blob([...localParts, ...centralParts, end], { type: 'application/zip' });
}

export async function downloadMaterialPack(list: LibraryMaterial[]): Promise<void> {
  saveBlob(`guanwu-materials-${new Set(list.map(material => material.id)).size}.zip`, createMaterialPack(list));
}

import { isSafePhotoSource, type JournalEntry, type JournalObject } from './model';

export type MemoryCardKind = 'note' | 'photo' | 'tasks';
export interface MemoryCardTexture {
  id: string;
  kind: MemoryCardKind;
  canvas: HTMLCanvasElement;
  hash: string;
  width: number;
  height: number;
  empty: boolean;
  sourceId?: string;
}
export interface MemoryTextureSet {
  cards: MemoryCardTexture[];
  actualPhotoCount: number;
  taskCount: number;
}

const SERIF = '"Guanwu Serif", "Songti SC", "STSong", serif';
const SANS = '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif';
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function surface(width: number, height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('无法绘制记忆卡片');
  return { canvas, context };
}

/** This checksum comes from rendered pixels, not a content ID or an incrementing counter. */
function pixelHash(canvas: HTMLCanvasElement): string {
  const { canvas: sample, context } = surface(64, 48);
  context.drawImage(canvas, 0, 0, sample.width, sample.height);
  let hash = 2166136261;
  for (const value of context.getImageData(0, 0, sample.width, sample.height).data) {
    hash ^= value; hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function ellipsis(context: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (context.measureText(text).width <= maxWidth) return text;
  const letters = Array.from(text);
  while (letters.length && context.measureText(`${letters.join('')}…`).width > maxWidth) letters.pop();
  return `${letters.join('')}…`;
}

function lines(context: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const result: string[] = [];
  let line = '';
  let truncated = false;
  const characters = Array.from(text.replace(/\r\n?/g, '\n'));
  for (let index = 0; index < characters.length; index++) {
    const character = characters[index];
    if (character === '\n' || context.measureText(line + character).width > maxWidth) {
      result.push(line); line = character === '\n' ? '' : character;
      if (result.length === maxLines) { truncated = index < characters.length - 1 || !!line; break; }
    } else line += character;
  }
  if (result.length < maxLines && line) result.push(line);
  if (truncated && result.length) result[result.length - 1] = ellipsis(context, `${result[result.length - 1]}…`, maxWidth);
  return result;
}

function noteTexture(entry: JournalEntry, bookTitle: string): MemoryCardTexture {
  const { canvas, context } = surface(1100, 760);
  const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#173f39'); gradient.addColorStop(0.56, '#113b34'); gradient.addColorStop(1, '#0b2928');
  context.fillStyle = gradient; context.fillRect(0, 0, canvas.width, canvas.height);

  // A single tonal curve supplies a digital identity without imitating paper fibres or a printed border.
  context.save(); context.beginPath(); context.rect(0, 0, canvas.width, canvas.height); context.clip();
  context.strokeStyle = 'rgba(184,218,193,0.075)'; context.lineWidth = 1.6;
  context.beginPath(); context.arc(1030, 750, 315, Math.PI * 0.85, Math.PI * 1.64); context.stroke(); context.restore();
  context.textBaseline = 'top'; context.fillStyle = '#c4d3bd'; context.font = `29px ${SANS}`;
  context.fillText(ellipsis(context, bookTitle.trim() || '日常', 350), 76, 58);
  if (entry.mood !== '平静' && entry.mood.trim()) {
    context.font = `27px ${SERIF}`;
    const mood = ellipsis(context, entry.mood.trim(), 190);
    const width = context.measureText(mood).width + 38;
    context.fillStyle = 'rgba(220,231,205,0.09)'; context.beginPath(); context.roundRect(690 - width, 51, width, 46, 23); context.fill();
    context.fillStyle = '#dde5cd'; context.fillText(mood, 709 - width, 61);
  }

  const empty = !entry.title.trim() && !entry.body.trim();
  const title = entry.title.trim() || (entry.body.trim() ? '无题' : '今天，尚未落笔');
  context.font = `500 82px ${SERIF}`; context.fillStyle = '#f4f1df';
  const titleLines = lines(context, title, 680, 2);
  titleLines.forEach((line, index) => context.fillText(line, 72, 163 + index * 100));
  const bodyY = titleLines.length > 1 ? 404 : 313;
  context.font = `52px ${SANS}`; context.fillStyle = empty ? '#b8cab9' : '#dce4d4';
  const body = entry.body.trim() || (empty ? '点开卡片，写下今天的一刻。' : '点开卡片，继续这段记录。');
  // Keep the preview in a safe text column: front-side photo cards can overlap the unused right half.
  lines(context, body, 560, titleLines.length > 1 ? 3 : 5).forEach((line, index) => context.fillText(line, 76, bodyY + index * 70));
  // Date is actual entry metadata. An empty card remains a prompt, never persisted sample content.
  context.font = `25px ${SANS}`; context.fillStyle = '#a6bfae';
  context.fillText(entry.date.replaceAll('-', ' / '), 76, 681);
  context.fillStyle = '#bc745e'; context.beginPath(); context.arc(1005, 696, 6, 0, Math.PI * 2); context.fill();
  return { id: `note:${entry.date}`, kind: 'note', canvas, hash: pixelHash(canvas), width: 4.4, height: 3.04, empty };
}

function taskTexture(entry: JournalEntry): MemoryCardTexture | undefined {
  const tasks = entry.tasks.filter(task => task.text.trim());
  if (!tasks.length) return undefined;
  const { canvas, context } = surface(940, 640);
  const gradient = context.createLinearGradient(0, 0, 940, 640);
  gradient.addColorStop(0, '#e8ecd7'); gradient.addColorStop(1, '#d1debd');
  context.fillStyle = gradient; context.fillRect(0, 0, 940, 640); context.textBaseline = 'top';
  context.fillStyle = '#254a3a'; context.font = `58px ${SERIF}`; context.fillText('今日小事', 64, 43);
  tasks.slice(0, 5).forEach((task, index) => {
    const y = 149 + index * 83;
    context.strokeStyle = task.done ? '#647e5f' : '#7f9672'; context.lineWidth = 2.5;
    context.beginPath(); context.arc(79, y + 28, 16, 0, Math.PI * 2); context.stroke();
    if (task.done) {
      context.beginPath(); context.moveTo(70, y + 28); context.lineTo(77, y + 35); context.lineTo(89, y + 20); context.stroke();
    }
    context.font = `54px ${SANS}`; context.fillStyle = task.done ? '#62725e' : '#254a3a';
    const text = ellipsis(context, task.text.trim(), 752); context.fillText(text, 116, y);
    if (task.done) { context.lineWidth = 1; context.beginPath(); context.moveTo(116, y + 29); context.lineTo(116 + context.measureText(text).width, y + 29); context.stroke(); }
  });
  return { id: `tasks:${entry.date}`, kind: 'tasks', canvas, hash: pixelHash(canvas), width: 3.15, height: 2.145, empty: false };
}

async function photoTexture(object: JournalObject): Promise<MemoryCardTexture> {
  if (!isSafePhotoSource(object.src)) throw new Error('记忆卡片仅支持已保存在本机的照片');
  const image = new Image(); image.decoding = 'async'; image.src = object.src; await image.decode();
  if (!image.naturalWidth || !image.naturalHeight) throw new Error('照片无法读取');
  const ratio = clamp(image.naturalWidth / image.naturalHeight, 0.78, 1.36);
  const height = 1000, width = Math.round(height * ratio);
  const { canvas, context } = surface(width, height);
  context.fillStyle = '#edf0e2'; context.fillRect(0, 0, width, height);
  const inset = 16, targetW = width - inset * 2, targetH = height - inset * 2;
  context.save(); context.beginPath(); context.roundRect(inset, inset, targetW, targetH, 25); context.clip();
  const factor = Math.max(targetW / image.naturalWidth, targetH / image.naturalHeight);
  const cropW = targetW / factor, cropH = targetH / factor;
  context.drawImage(image, (image.naturalWidth - cropW) / 2, (image.naturalHeight - cropH) / 2, cropW, cropH, inset, inset, targetW, targetH);
  context.restore();
  return { id: `photo:${object.id}`, sourceId: object.id, kind: 'photo', canvas, hash: pixelHash(canvas), width: 2.5 * ratio, height: 2.5, empty: false };
}

/** A read-only projection of model v1. Stickers remain exclusively in the original composition editor. */
export async function createMemoryTextures(entry: JournalEntry, bookTitle: string): Promise<MemoryTextureSet> {
  await Promise.all([document.fonts.load(`500 82px ${SERIF}`), document.fonts.load(`52px ${SANS}`)]);
  const photos = entry.objects.filter(object => object.kind === 'photo' && isSafePhotoSource(object.src));
  const photoCards = await Promise.all(photos.slice(-6).map(photoTexture));
  const task = taskTexture(entry);
  return { cards: [noteTexture(entry, bookTitle), ...photoCards, ...(task ? [task] : [])], actualPhotoCount: photos.length, taskCount: entry.tasks.filter(item => item.text.trim()).length };
}

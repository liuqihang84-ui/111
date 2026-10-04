import {
  MAX_BACKUP_LENGTH, PAGE_HEIGHT, PAGE_WIDTH, isSafePhotoSource, localDate, validateState,
  type JournalEntry, type JournalState,
} from './model';

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export function downloadBackup(state: JournalState): void {
  const verified = validateState(state);
  downloadBlob(new Blob([JSON.stringify(verified, null, 2)], { type: 'application/json;charset=utf-8' }), `一日手账备份-${localDate()}.json`);
}

export function parseBackup(text: string): JournalState {
  if (text.length > MAX_BACKUP_LENGTH) throw new Error('备份文件过大，请选择较小的文件');
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('无法读取备份，请选择一日手账导出的 JSON 文件');
  }
  return validateState(parsed);
}

function decodeImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    // Local assets may redirect; an off-origin image must pass CORS rather than
    // decode successfully and make the eventual canvas download unreadable.
    if (!/^(?:data|blob):/i.test(src)) img.crossOrigin = 'anonymous';
    const timer = window.setTimeout(() => {
      img.onload = null;
      img.onerror = null;
      img.src = '';
      reject(new Error('图片读取超时，请重新选择图片'));
    }, 15_000);
    img.onload = () => {
      window.clearTimeout(timer);
      if (!img.naturalWidth || !img.naturalHeight) reject(new Error('图片尺寸无效'));
      else resolve(img);
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      reject(new Error('图片无法读取，请选择有效的 PNG、JPEG 或 WebP 图片'));
    };
    img.src = src;
  });
}

const MAX_IMPORT_BYTES = 15 * 1024 * 1024;
const MAX_OUTPUT_LENGTH = 1_200_000;

/** Decode and re-encode uploaded photos; original metadata and active formats are discarded. */
export async function normalizePhoto(file: File): Promise<{ src: string; width: number; height: number }> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('请选择 PNG、JPEG 或 WebP 照片，不支持 SVG 文件');
  }
  if (!file.size || file.size > MAX_IMPORT_BYTES) throw new Error('照片需小于 15 MB');
  const header = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const isPng = header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47;
  const isJpeg = header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
  const isWebp = String.fromCharCode(...header.slice(0, 4)) === 'RIFF' && String.fromCharCode(...header.slice(8, 12)) === 'WEBP';
  if ((file.type === 'image/png' && !isPng) || (file.type === 'image/jpeg' && !isJpeg) || (file.type === 'image/webp' && !isWebp)) {
    throw new Error('照片格式与文件内容不一致，请选择有效的 PNG、JPEG 或 WebP 图片');
  }
  const originalUrl = URL.createObjectURL(file);
  let img: HTMLImageElement;
  try {
    img = await decodeImage(originalUrl);
  } finally {
    URL.revokeObjectURL(originalUrl);
  }
  let scale = Math.min(1, 1_600 / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) throw new Error('浏览器无法处理图片');
  let src = '';
  let quality = 0.86;
  for (let attempt = 0; attempt < 12; attempt++) {
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(img, 0, 0, canvas.width, canvas.height);
    // Small PNGs retain transparency; larger images become bounded JPEGs.
    if (attempt === 0 && file.type === 'image/png') {
      src = canvas.toDataURL('image/png');
      if (src.length <= MAX_OUTPUT_LENGTH) break;
    }
    context.globalCompositeOperation = 'destination-over';
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.globalCompositeOperation = 'source-over';
    src = canvas.toDataURL('image/jpeg', quality);
    if (src.length <= MAX_OUTPUT_LENGTH) break;
    if (quality > 0.55) quality -= 0.1;
    else scale *= 0.78;
  }
  if (src.length > MAX_OUTPUT_LENGTH || !isSafePhotoSource(src)) throw new Error('照片太复杂，请选择尺寸较小的图片');
  return { src, width: canvas.width, height: canvas.height };
}

function wrapLines(context: CanvasRenderingContext2D, text: string, width: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.replace(/\r\n?/g, '\n').split('\n')) {
    if (!paragraph) { lines.push(''); continue; }
    let line = '';
    for (const character of Array.from(paragraph)) {
      if (line && context.measureText(line + character).width > width) {
        lines.push(line);
        line = character;
      } else line += character;
    }
    lines.push(line);
  }
  return lines;
}

function ellipsis(context: CanvasRenderingContext2D, text: string, width: number): string {
  let result = text;
  while (result && context.measureText(`${result}…`).width > width) result = Array.from(result).slice(0, -1).join('');
  return `${result}…`;
}

function drawTextBlock(context: CanvasRenderingContext2D, text: string, x: number, y: number, width: number, lineHeight: number, maxLines: number): void {
  const lines = wrapLines(context, text, width);
  lines.slice(0, maxLines).forEach((line, index) => {
    const content = index === maxLines - 1 && lines.length > maxLines ? ellipsis(context, line, width) : line;
    context.fillText(content, x, y + index * lineHeight);
  });
}

function trustedStickerSource(src: string): boolean {
  // Asset IDs are mapped by the application; imported backups cannot supply SVGs.
  if (/^data:image\/(?:svg\+xml|png|jpeg|webp)[;,]/.test(src)) return true;
  try {
    const resolved = new URL(src, window.location.href);
    return resolved.origin === window.location.origin && ['http:', 'https:'].includes(resolved.protocol);
  } catch {
    return false;
  }
}

export interface PagePngOptions {
  paperTexture?: string;
  bookTitle?: string;
}

/** Render the paper without editor controls, at 2× resolution for a clear download. */
export async function exportPagePng(
  entry: JournalEntry,
  getStickerSrc: (assetId: string) => string | undefined,
  options: PagePngOptions = {},
): Promise<Blob> {
  if (document.fonts) await document.fonts.ready;
  if (options.paperTexture && !trustedStickerSource(options.paperTexture)) {
    throw new Error('纸张纹理无法读取，请使用当前页面的本地素材');
  }
  const [decoded, paper] = await Promise.all([
    Promise.all(entry.objects.map(async (object) => {
      const src = object.kind === 'photo' ? object.src : (object.assetId ? getStickerSrc(object.assetId) : object.src);
      if (!src || (object.kind === 'photo' ? !isSafePhotoSource(src) : !trustedStickerSource(src))) {
        throw new Error('有素材无法读取，请移除该素材后重试');
      }
      return { object, image: await decodeImage(src) };
    })),
    options.paperTexture ? decodeImage(options.paperTexture) : Promise.resolve(undefined),
  ]);
  const canvas = document.createElement('canvas');
  canvas.width = PAGE_WIDTH * 2;
  canvas.height = PAGE_HEIGHT * 2;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('浏览器暂不支持图片导出');
  context.scale(2, 2);
  context.fillStyle = '#fbf8ef';
  context.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);
  if (paper) {
    context.drawImage(paper, 0, 0, PAGE_WIDTH, PAGE_HEIGHT);
    context.fillStyle = 'rgba(251, 248, 239, 0.28)';
    context.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);
  }
  context.textBaseline = 'top';
  const serif = '"Guanwu Serif", "Noto Serif SC", "Songti SC", "SimSun", serif';
  const sans = '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif';
  const date = new Date(`${entry.date}T12:00:00`);
  const dateText = `${date.getMonth() + 1}月${date.getDate()}日 · 星期${'日一二三四五六'[date.getDay()]}`;
  context.font = `13px ${sans}`;
  context.fillStyle = '#737369';
  context.fillText(`${entry.date.slice(0, 4)}年 ${dateText}`, 48, 48);
  const mood = entry.mood || '平静';
  const moodWidth = context.measureText(mood).width + 28;
  context.fillStyle = '#eeecdf';
  context.beginPath();
  context.roundRect(PAGE_WIDTH - 48 - moodWidth, 41, moodWidth, 30, 15);
  context.fill();
  context.fillStyle = '#65735c';
  context.fillText(mood, PAGE_WIDTH - 34 - moodWidth, 48);
  context.strokeStyle = '#e4e3d6';
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(48, 86);
  context.lineTo(592, 86);
  context.stroke();
  context.fillStyle = '#343d34';
  const title = entry.title || '此刻，值得记下';
  for (let size = 30; size >= 18; size -= 1) {
    context.font = `${size}px ${serif}`;
    if (context.measureText(title).width <= 544) break;
  }
  context.fillText(context.measureText(title).width > 544 ? ellipsis(context, title, 544) : title, 48, 104);
  let bodyLineHeight = 30;
  let bodyMaxLines = 6;
  for (const [size, lineHeight] of [[16, 30], [15, 27], [14, 24], [13, 22], [12, 20]]) {
    context.font = `${size}px ${serif}`;
    bodyLineHeight = lineHeight;
    bodyMaxLines = Math.floor(180 / lineHeight);
    if (wrapLines(context, entry.body, 544).length <= bodyMaxLines) break;
  }
  context.fillStyle = '#55584c';
  drawTextBlock(context, entry.body, 48, 166, 544, bodyLineHeight, bodyMaxLines);

  context.strokeStyle = '#b3b7a2';
  context.lineWidth = 1;
  context.font = `12px ${serif}`;
  context.fillStyle = '#8e947b';
  context.fillText('今日小事', 48, 380);
  context.beginPath();
  context.moveTo(112, 388);
  context.lineTo(172, 388);
  context.strokeStyle = '#e2e3d3';
  context.stroke();
  context.strokeStyle = '#b3b7a2';
  entry.tasks.forEach((task, index) => {
    const y = 414 + index * 28;
    context.strokeRect(48, y + 2, 14, 14);
    if (task.done) {
      context.beginPath();
      context.moveTo(51, y + 9);
      context.lineTo(55, y + 13);
      context.lineTo(60, y + 5);
      context.stroke();
    }
    context.fillStyle = task.done ? '#96998b' : '#55584c';
    const text = context.measureText(task.text).width > 520 ? ellipsis(context, task.text, 520) : task.text;
    context.fillText(text, 74, y);
    if (task.done) {
      context.beginPath();
      context.moveTo(74, y + 10);
      context.lineTo(74 + context.measureText(text).width, y + 10);
      context.stroke();
    }
  });
  for (const { object, image } of decoded) {
    context.save();
    context.translate(object.x + object.width / 2, object.y + object.height / 2);
    context.rotate(object.rotation * Math.PI / 180);
    if (object.kind === 'photo' || object.assetId === 'demo-landscape') {
      context.fillStyle = '#fffef9';
      context.shadowColor = '#31382a20';
      context.shadowBlur = 7;
      context.shadowOffsetY = 3;
      context.fillRect(-object.width / 2, -object.height / 2, object.width, object.height);
      context.shadowColor = 'transparent';
      const frame = 9;
      const innerWidth = Math.max(1, object.width - frame * 2);
      const innerHeight = Math.max(1, object.height - 38);
      const coverScale = Math.max(innerWidth / image.naturalWidth, innerHeight / image.naturalHeight);
      const sourceWidth = innerWidth / coverScale;
      const sourceHeight = innerHeight / coverScale;
      context.drawImage(image, (image.naturalWidth - sourceWidth) / 2, (image.naturalHeight - sourceHeight) / 2, sourceWidth, sourceHeight, -innerWidth / 2, -object.height / 2 + frame, innerWidth, innerHeight);
      context.font = `11px ${serif}`;
      context.fillStyle = '#85806a';
      context.textAlign = 'center';
      context.fillText('拾一片风景，留给今天。', 0, object.height / 2 - 20);
    } else {
      context.drawImage(image, -object.width / 2, -object.height / 2, object.width, object.height);
    }
    context.restore();
  }
  context.font = `10px ${sans}`;
  context.fillStyle = '#a4a594';
  if (options.bookTitle) {
    context.textAlign = 'left';
    const bookTitle = context.measureText(options.bookTitle).width > 400 ? ellipsis(context, options.bookTitle, 400) : options.bookTitle;
    context.fillText(bookTitle, 48, PAGE_HEIGHT - 28);
    context.textAlign = 'right';
    context.fillText('一日一笺 · 记', PAGE_WIDTH - 48, PAGE_HEIGHT - 28);
  } else {
    context.textAlign = 'center';
    context.fillText('一 日  ·  把 日 子 过 成 诗', PAGE_WIDTH / 2, PAGE_HEIGHT - 28);
  }
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('图片导出失败，请重试')), 'image/png');
  });
}

import { isSafePhotoSource, type JournalEntry } from './model';

const WIDTH = 1_440;
const HEIGHT = 1_024;
const SERIF = '"Guanwu Serif", "Songti SC", "STSong", serif';
const SANS = '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif';
const COLORS = {
  background: '#F3F2EC',
  white: '#FCFBF6',
  ink: '#183B35',
  jade: '#E0E8DF',
  muted: '#61716A',
};

/** Embedded raster data only: this export never requests an external image. */
function decodePhoto(src: string): Promise<HTMLImageElement> {
  if (!isSafePhotoSource(src)) return Promise.reject(new Error('照片必须是有效的内嵌 PNG、JPEG 或 WebP 图片'));
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      image.onload = null;
      image.onerror = null;
      if (error) {
        image.src = '';
        reject(error);
      } else resolve(image);
    };
    const timer = window.setTimeout(() => finish(new Error('照片读取超时，请重新选择图片')), 15_000);
    image.onerror = () => finish(new Error('照片无法读取，请选择有效的 PNG、JPEG 或 WebP 图片'));
    image.onload = () => {
      void (async () => {
        try {
          if (typeof image.decode === 'function') await image.decode();
          if (!image.naturalWidth || !image.naturalHeight || image.getAttribute('src') !== src
            || (image.currentSrc && image.currentSrc !== src) || !isSafePhotoSource(src)) {
            throw new Error('照片内容或尺寸无效');
          }
          finish();
        } catch {
          finish(new Error('照片无法解码，请重新选择图片'));
        }
      })();
    };
    image.src = src;
  });
}

function roundedPath(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius = 30): void {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
}

function card(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, fill: string | CanvasGradient): void {
  context.save();
  context.shadowColor = 'rgba(24, 59, 53, 0.08)';
  context.shadowBlur = 26;
  context.shadowOffsetY = 10;
  roundedPath(context, x, y, width, height);
  context.fillStyle = fill;
  context.fill();
  context.shadowColor = 'transparent';
  context.lineWidth = 1;
  context.strokeStyle = 'rgba(24, 59, 53, 0.06)';
  context.stroke();
  context.restore();
}

function linesFor(context: CanvasRenderingContext2D, source: string, width: number): string[] {
  const result: string[] = [];
  for (const paragraph of source.replace(/\r\n?/g, '\n').split('\n')) {
    if (!paragraph) { result.push(''); continue; }
    let line = '';
    for (const character of Array.from(paragraph)) {
      if (line && context.measureText(line + character).width > width) {
        result.push(line);
        line = character;
      } else line += character;
    }
    result.push(line);
  }
  return result;
}

function fittedLabel(context: CanvasRenderingContext2D, text: string, width: number): string {
  if (context.measureText(text).width <= width) return text;
  const characters = Array.from(text);
  while (characters.length && context.measureText(`${characters.join('')}…`).width > width) characters.pop();
  return `${characters.join('')}…`;
}

function textLines(context: CanvasRenderingContext2D, lines: string[], x: number, y: number, width: number, lineHeight: number, maxLines: number): void {
  lines.slice(0, maxLines).forEach((line, index) => {
    const display = index === maxLines - 1 && lines.length > maxLines
      ? fittedLabel(context, `${line}…`, width)
      : line;
    context.fillText(display, x, y + index * lineHeight);
  });
}

function drawPhoto(context: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, width: number, height: number): void {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const sourceWidth = width / scale;
  const sourceHeight = height / scale;
  context.save();
  roundedPath(context, x, y, width, height, 15);
  context.clip();
  context.fillStyle = COLORS.white;
  context.fillRect(x, y, width, height);
  context.drawImage(image, (image.naturalWidth - sourceWidth) / 2, (image.naturalHeight - sourceHeight) / 2,
    sourceWidth, sourceHeight, x, y, width, height);
  context.restore();
}

function checkedDate(value: string): { year: string; month: string; day: string; weekday: string } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('记录日期无效');
  const [year, month, day] = value.split('-').map(Number);
  // setUTCFullYear avoids Date.UTC's special interpretation of years 0–99.
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(12, 0, 0, 0);
  if (year < 1 || date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new Error('记录日期无效');
  }
  return { year: value.slice(0, 4), month: value.slice(5, 7), day: value.slice(8, 10), weekday: `星期${'日一二三四五六'[date.getUTCDay()]}` };
}

/**
 * Share a horizontal composition of actual memory cards, rather than a screenshot
 * of the editor. The most recently added six photos and first five nonempty tasks
 * appear; any omitted photo/task count is stated in the footer. Old stickers are
 * deliberately absent from this card layout.
 */
export async function exportMemoryPng(entry: JournalEntry, bookTitle: string): Promise<Blob> {
  const date = checkedDate(entry.date);
  const photoObjects = entry.objects.filter((object) => object.kind === 'photo');
  // Validate every source before any decode, including photos outside the six-card
  // selection. Neither remote URLs nor active formats can reach an Image element.
  for (const photo of photoObjects) {
    if (!isSafePhotoSource(photo.src)) throw new Error('照片必须是有效的内嵌 PNG、JPEG 或 WebP 图片');
  }
  const photos = await Promise.all(photoObjects.slice(-6).map((photo) => decodePhoto(photo.src!)));
  if (document.fonts) await document.fonts.ready;
  const nonemptyTasks = entry.tasks.filter((task) => task.text.trim());
  const tasks = nonemptyTasks.slice(0, 5);
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('浏览器暂不支持图片导出');
  context.fillStyle = COLORS.background;
  context.fillRect(0, 0, WIDTH, HEIGHT);
  context.textBaseline = 'top';

  context.fillStyle = COLORS.ink;
  context.font = `500 26px ${SERIF}`;
  context.fillText('一日一笺', 64, 56);
  context.font = `17px ${SANS}`;
  context.fillStyle = COLORS.muted;
  context.fillText(fittedLabel(context, bookTitle.trim(), 590), 210, 62);
  context.textAlign = 'right';
  context.font = `18px ${SANS}`;
  context.fillStyle = COLORS.ink;
  context.fillText(`${date.year} / ${date.month} / ${date.day}`, WIDTH - 64, 53);
  context.font = `15px ${SANS}`;
  context.fillStyle = COLORS.muted;
  context.fillText(date.weekday, WIDTH - 64, 82);
  context.textAlign = 'left';
  context.strokeStyle = 'rgba(24, 59, 53, 0.12)';
  context.lineWidth = 1;
  context.beginPath(); context.moveTo(64, 122); context.lineTo(WIDTH - 64, 122); context.stroke();

  const hasSideCards = photos.length > 0 || tasks.length > 0;
  const noteWidth = hasSideCards ? 832 : 1_312;
  const noteX = 64;
  const noteY = 160;
  const cardHeight = 704;
  const noteFill = context.createLinearGradient(noteX, noteY, noteX + noteWidth, noteY + cardHeight);
  noteFill.addColorStop(0, '#183B35');
  noteFill.addColorStop(1, '#234940');
  card(context, noteX, noteY, noteWidth, cardHeight, noteFill);
  context.save();
  roundedPath(context, noteX, noteY, noteWidth, cardHeight); context.clip();
  const insetX = noteX + 58;
  const contentWidth = Math.min(noteWidth - 116, 990);
  context.font = `17px ${SANS}`;
  context.fillStyle = '#CAD8CA';
  context.fillText('文字记忆', insetX, noteY + 45);
  const title = entry.title.trim();
  const body = entry.body.trim();
  let bodyY = noteY + 120;
  if (title) {
    let titleSize = 52;
    let titleLines: string[] = [];
    for (; titleSize >= 36; titleSize -= 2) {
      context.font = `500 ${titleSize}px ${SERIF}`;
      titleLines = linesFor(context, title, contentWidth);
      if (titleLines.length <= 2) break;
    }
    const titleHeight = Math.round(titleSize * 1.37);
    context.fillStyle = COLORS.white;
    textLines(context, titleLines, insetX, bodyY, contentWidth, titleHeight, 2);
    bodyY += Math.min(2, titleLines.length) * titleHeight + 30;
  }
  if (body) {
    const availableHeight = noteY + cardHeight - 82 - bodyY;
    let bodySize = 26;
    let bodyLines: string[] = [];
    let lineHeight = 42;
    for (; bodySize >= 20; bodySize -= 1) {
      lineHeight = Math.round(bodySize * 1.6);
      context.font = `${bodySize}px ${SANS}`;
      bodyLines = linesFor(context, body, contentWidth);
      if (bodyLines.length * lineHeight <= availableHeight) break;
    }
    context.fillStyle = '#EEF1E8';
    textLines(context, bodyLines, insetX, bodyY, contentWidth, lineHeight, Math.max(1, Math.floor(availableHeight / lineHeight)));
  } else if (!title) {
    context.font = `40px ${SERIF}`;
    context.fillStyle = '#E0E8DB';
    context.fillText('暂无文字', insetX, bodyY);
    context.font = `20px ${SANS}`;
    context.fillStyle = '#B7C9BC';
    context.fillText('记录的文字会出现在这里', insetX, bodyY + 67);
  }
  if (entry.mood.trim() && entry.mood !== '平静') {
    context.font = `16px ${SANS}`;
    context.fillStyle = '#CAD8CA';
    context.textAlign = 'right';
    context.fillText(fittedLabel(context, entry.mood.trim(), 220), noteX + noteWidth - 58, noteY + cardHeight - 47);
    context.textAlign = 'left';
  }
  context.restore();

  const sideX = 924;
  const sideWidth = 452;
  const taskHeight = photos.length ? 94 + tasks.length * 54 : cardHeight;
  const photoHeight = tasks.length ? cardHeight - taskHeight - 20 : cardHeight;
  if (photos.length) {
    card(context, sideX, noteY, sideWidth, photoHeight, COLORS.white);
    context.font = `18px ${SANS}`;
    context.fillStyle = COLORS.ink;
    context.fillText('影像记忆', sideX + 24, noteY + 23);
    context.font = `14px ${SANS}`;
    context.textAlign = 'right';
    context.fillStyle = COLORS.muted;
    context.fillText(`${photos.length} 张`, sideX + sideWidth - 24, noteY + 27);
    context.textAlign = 'left';
    const columns = photos.length > 1 ? 2 : 1;
    const rows = Math.ceil(photos.length / columns);
    const gap = 10;
    const innerWidth = sideWidth - 48;
    const innerHeight = photoHeight - 82;
    const tileWidth = (innerWidth - gap * (columns - 1)) / columns;
    const tileHeight = (innerHeight - gap * (rows - 1)) / rows;
    photos.forEach((photo, index) => {
      const row = Math.floor(index / columns);
      const column = index % columns;
      const lastWide = columns === 2 && photos.length % 2 !== 0 && index === photos.length - 1;
      drawPhoto(context, photo, sideX + 24 + column * (tileWidth + gap), noteY + 58 + row * (tileHeight + gap),
        lastWide ? innerWidth : tileWidth, tileHeight);
    });
  }
  if (tasks.length) {
    const taskY = photos.length ? noteY + photoHeight + 20 : noteY;
    card(context, sideX, taskY, sideWidth, taskHeight, COLORS.jade);
    context.font = `22px ${SERIF}`;
    context.fillStyle = COLORS.ink;
    context.fillText('今天的小事', sideX + 28, taskY + 25);
    const rowHeight = photos.length ? 54 : 84;
    const taskTextSize = photos.length ? 18 : 24;
    const firstTaskY = taskY + (photos.length ? 76 : 103);
    tasks.forEach((task, index) => {
      const y = firstTaskY + index * rowHeight;
      context.save();
      roundedPath(context, sideX + 28, y, 20, 20, 5);
      context.fillStyle = task.done ? COLORS.ink : 'rgba(252, 251, 246, 0.68)';
      context.fill();
      context.strokeStyle = task.done ? COLORS.ink : '#718777';
      context.lineWidth = 1; context.stroke();
      if (task.done) {
        context.beginPath(); context.moveTo(sideX + 33, y + 10); context.lineTo(sideX + 37, y + 14); context.lineTo(sideX + 43, y + 6);
        context.strokeStyle = COLORS.white; context.lineWidth = 2; context.lineCap = 'round'; context.stroke();
      }
      context.font = `${taskTextSize}px ${SANS}`;
      context.fillStyle = task.done ? '#5D7467' : COLORS.ink;
      const taskLines = linesFor(context, task.text.trim(), sideWidth - 104);
      taskLines.slice(0, 2).forEach((line, lineIndex) => {
        const fitted = lineIndex === 1 && taskLines.length > 2 ? fittedLabel(context, `${line}…`, sideWidth - 104) : line;
        const textY = y - 1 + lineIndex * Math.round(taskTextSize * 1.35);
        context.fillText(fitted, sideX + 63, textY);
        if (task.done) {
          context.beginPath(); context.moveTo(sideX + 63, textY + taskTextSize / 2); context.lineTo(sideX + 63 + context.measureText(fitted).width, textY + taskTextSize / 2);
          context.strokeStyle = '#718777'; context.lineWidth = 1; context.stroke();
        }
      });
      context.restore();
    });
  }

  context.font = `15px ${SANS}`;
  context.fillStyle = COLORS.muted;
  context.fillText('数字记忆 · 一日一笺', 64, 926);
  const omissions: string[] = [];
  if (photoObjects.length > photos.length) omissions.push(`另有 ${photoObjects.length - photos.length} 张照片未收入此图`);
  if (nonemptyTasks.length > tasks.length) omissions.push(`另有 ${nonemptyTasks.length - tasks.length} 项小事未收入此图`);
  if (omissions.length) {
    context.textAlign = 'right';
    context.fillText(omissions.join(' · '), WIDTH - 64, 926);
  }
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('图片导出失败，请重试')), 'image/png');
  });
}

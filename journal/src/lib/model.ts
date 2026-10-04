export const STORAGE_KEY = 'yiri-journal-v1';
export const PAGE_WIDTH = 640;
export const PAGE_HEIGHT = 840;

export interface JournalObject {
  id: string;
  kind: 'sticker' | 'photo';
  assetId?: string;
  src?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

export interface JournalTask {
  id: string;
  text: string;
  done: boolean;
}

export interface JournalEntry {
  date: string;
  title: string;
  body: string;
  mood: string;
  tasks: JournalTask[];
  objects: JournalObject[];
}

export interface JournalBook {
  id: string;
  title: string;
  subtitle: string;
  cover: 'mountain' | 'orchid' | 'indigo';
  entries: Record<string, JournalEntry>;
}

export interface JournalState {
  version: 1;
  books: JournalBook[];
  activeBookId: string;
  activeDate: string;
}

// These limits keep imported backups finite and prevent unexpected storage growth.
export const MAX_PHOTO_DATA_LENGTH = 1_400_000;
export const MAX_BACKUP_LENGTH = 24_000_000;
const MAX_BOOKS = 20;
const MAX_ENTRIES = 6_000;
const MAX_TASKS = 5;
const MAX_OBJECTS = 30;

export function uid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `j-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/** A local calendar date: UTC conversion would shift late-night journal entries. */
export function localDate(date: Date = new Date()): string {
  if (!Number.isFinite(date.getTime())) throw new Error('日期无效');
  const year = date.getFullYear();
  if (year < 1 || year > 9999) throw new Error('日期超出支持范围');
  return `${String(year).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function validDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  if (year < 1 || month < 1 || month > 12 || day < 1) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= days[month - 1];
}

export function createEntry(date: string): JournalEntry {
  if (!validDate(date)) throw new Error('日期无效');
  return { date, title: '', body: '', mood: '平静', tasks: [], objects: [] };
}

export function createInitialState(): JournalState {
  const today = localDate();
  const firstId = uid();
  const entry = createEntry(today);
  entry.title = '把日子，慢慢写成诗';
  entry.body = '晨光落在窗边，茶还温着。\n走过熟悉的小路，发现桂花又开了。\n\n不必把每一天填满。留一点空白，给风、给花，也给自己。';
  entry.tasks = [
    { id: uid(), text: '读几页喜欢的书', done: true },
    { id: uid(), text: '出门散步，收集一片秋色', done: false },
    { id: uid(), text: '给远方的人写一封信', done: false },
  ];
  return {
    version: 1,
    books: [
      { id: firstId, title: '山水有清音', subtitle: '日常，亦有山河', cover: 'mountain', entries: { [today]: entry } },
      { id: uid(), title: '一笺风月', subtitle: '收集生活里的微光', cover: 'orchid', entries: {} },
    ],
    activeBookId: firstId,
    activeDate: today,
  };
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Clamp the full rotated bounding box, with the same centre-origin rotation as CSS. */
export function clampObject<T extends JournalObject>(object: T): T {
  let width = clamp(Number.isFinite(object.width) ? object.width : 120, 24, PAGE_WIDTH);
  let height = clamp(Number.isFinite(object.height) ? object.height : 120, 24, PAGE_HEIGHT);
  const rawRotation = Number.isFinite(object.rotation) ? object.rotation : 0;
  const rotation = ((rawRotation + 180) % 360 + 360) % 360 - 180;
  const radians = rotation * Math.PI / 180;
  const cosine = Math.abs(Math.cos(radians));
  const sine = Math.abs(Math.sin(radians));
  let boundWidth = width * cosine + height * sine;
  let boundHeight = width * sine + height * cosine;
  const fit = Math.min(1, PAGE_WIDTH / boundWidth, PAGE_HEIGHT / boundHeight);
  width *= fit;
  height *= fit;
  boundWidth *= fit;
  boundHeight *= fit;
  const originalX = Number.isFinite(object.x) ? object.x : 0;
  const originalY = Number.isFinite(object.y) ? object.y : 0;
  const centreX = clamp(originalX + width / 2, boundWidth / 2, PAGE_WIDTH - boundWidth / 2);
  const centreY = clamp(originalY + height / 2, boundHeight / 2, PAGE_HEIGHT - boundHeight / 2);
  return { ...object, width, height, rotation, x: centreX - width / 2, y: centreY - height / 2 };
}

function fail(message = '备份格式无效'): never {
  throw new Error(message);
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail();
  return value as Record<string, unknown>;
}

function string(value: unknown, max: number, label: string, nonempty = false): string {
  if (typeof value !== 'string' || value.length > max || (nonempty && !value.trim())) {
    return fail(`${label}无效或过长`);
  }
  return value;
}

function id(value: unknown): string {
  const result = string(value, 100, '标识', true);
  if (!/^[A-Za-z0-9_-]+$/.test(result)) return fail('标识无效');
  return result;
}

function finite(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fail('素材位置无效');
  return value;
}

function array(value: unknown, max: number, label: string): unknown[] {
  if (!Array.isArray(value) || value.length > max) return fail(`${label}数量超出限制`);
  return value;
}

/** Only embedded raster images are accepted from an untrusted backup. */
export function isSafePhotoSource(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > MAX_PHOTO_DATA_LENGTH) return false;
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match || match[2].length % 4 !== 0) return false;
  // Check the declared media type against its bytes, without decoding the full file.
  try {
    const first = atob(match[2].slice(0, 24));
    if (match[1] === 'png') return first.startsWith('\x89PNG\r\n\x1a\n');
    if (match[1] === 'jpeg') return first.startsWith('\xff\xd8\xff');
    return first.startsWith('RIFF') && first.slice(8, 12) === 'WEBP';
  } catch {
    return false;
  }
}

function validateObject(value: unknown): JournalObject {
  const object = record(value);
  if (object.kind !== 'photo' && object.kind !== 'sticker') return fail('素材类型无效');
  const result: JournalObject = {
    id: id(object.id), kind: object.kind,
    x: finite(object.x), y: finite(object.y),
    width: finite(object.width), height: finite(object.height), rotation: finite(object.rotation),
  };
  if (result.width <= 0 || result.height <= 0) return fail('素材尺寸无效');
  if (object.assetId !== undefined) result.assetId = id(object.assetId);
  if (object.src !== undefined) {
    if (!isSafePhotoSource(object.src)) return fail('照片必须为内嵌的 PNG、JPEG 或 WebP 图片');
    result.src = object.src;
  }
  if (result.kind === 'photo' && !result.src) return fail('照片内容缺失');
  if (result.kind === 'sticker' && !result.assetId && !result.src) return fail('贴纸内容缺失');
  return clampObject(result);
}

function ensureUnique(items: { id: string }[]): void {
  if (new Set(items.map((item) => item.id)).size !== items.length) fail('备份中有重复标识');
}

function validateEntry(value: unknown, date: string): JournalEntry {
  const entry = record(value);
  if (entry.date !== date) return fail('日记日期与目录不一致');
  const tasks = array(entry.tasks, MAX_TASKS, '待办').map((value): JournalTask => {
    const task = record(value);
    if (typeof task.done !== 'boolean') return fail('待办状态无效');
    return { id: id(task.id), text: string(task.text, 28, '待办文字'), done: task.done };
  });
  const objects = array(entry.objects, MAX_OBJECTS, '素材').map(validateObject);
  ensureUnique(tasks);
  ensureUnique(objects);
  return {
    date,
    title: string(entry.title, 24, '日记标题'),
    body: string(entry.body, 260, '日记正文'),
    mood: string(entry.mood, 32, '心情'),
    tasks, objects,
  };
}

/** Validate and copy a backup, retaining only this application's known fields. */
export function validateState(value: unknown): JournalState {
  const state = record(value);
  if (state.version !== 1) return fail('不支持此备份版本');
  let entryCount = 0;
  let embeddedImageLength = 0;
  const books = array(state.books, MAX_BOOKS, '手账本').map((value): JournalBook => {
    const book = record(value);
    if (!['mountain', 'orchid', 'indigo'].includes(String(book.cover))) return fail('封面类型无效');
    const sourceEntries = record(book.entries);
    const dates = Object.keys(sourceEntries);
    entryCount += dates.length;
    if (entryCount > MAX_ENTRIES) return fail('日记数量超出限制');
    const entries: Record<string, JournalEntry> = {};
    for (const date of dates) {
      if (!validDate(date)) return fail('备份中有无效日期');
      const entry = validateEntry(sourceEntries[date], date);
      for (const object of entry.objects) embeddedImageLength += object.src?.length ?? 0;
      if (embeddedImageLength > MAX_BACKUP_LENGTH) return fail('备份图片总大小超出限制');
      entries[date] = entry;
    }
    return {
      id: id(book.id), title: string(book.title, 28, '手账本名称', true),
      subtitle: string(book.subtitle, 240, '手账本副标题'),
      cover: book.cover as JournalBook['cover'], entries,
    };
  });
  if (!books.length) return fail('备份中没有手账本');
  ensureUnique(books);
  const activeBookId = id(state.activeBookId);
  if (!books.some((book) => book.id === activeBookId)) return fail('当前手账本不存在');
  if (!validDate(state.activeDate)) return fail('当前日期无效');
  return { version: 1, books, activeBookId, activeDate: state.activeDate };
}

/** Storage may be unavailable in private browsing or during server rendering. */
export function loadState(storage?: Storage): JournalState {
  try {
    const source = storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
    const saved = source?.getItem(STORAGE_KEY);
    if (saved) {
      if (saved.length > MAX_BACKUP_LENGTH) throw new Error('备份过大');
      return validateState(JSON.parse(saved));
    }
  } catch {
    // Keep the original corrupt value untouched, so the UI can offer recovery.
  }
  return createInitialState();
}

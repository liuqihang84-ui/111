import { describe, expect, it } from 'vitest';
import { clampObject, createEntry, createInitialState, loadState, localDate, PAGE_HEIGHT, PAGE_WIDTH, STORAGE_KEY, validateState, type JournalObject } from './model';
import { normalizePhoto, parseBackup } from './export';

const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j5T0AAAAASUVORK5CYII=';

function object(overrides: Partial<JournalObject> = {}): JournalObject {
  return { id: 'object-1', kind: 'photo', src: png, x: 50, y: 70, width: 180, height: 120, rotation: 0, ...overrides };
}

function storage(value: string | null): Storage {
  return {
    length: value ? 1 : 0,
    clear() {}, key: () => STORAGE_KEY,
    getItem: () => value, setItem() {}, removeItem() {},
  };
}

describe('journal backup and recovery', () => {
  it('roundtrips multiple books, tasks and embedded photos without sharing references', () => {
    const state = createInitialState();
    state.books[0].entries[state.activeDate].objects.push(object());
    const restored = parseBackup(JSON.stringify(state));
    expect(restored).toEqual(state);
    expect(restored.books[0]).not.toBe(state.books[0]);
    expect(restored.books[0].entries[state.activeDate].objects[0].src).toBe(png);
    expect(loadState(storage(JSON.stringify(state)))).toEqual(state);
  });

  it('recovers safely from corruption or unavailable browser storage', () => {
    expect(loadState(storage('{broken')).books).toHaveLength(2);
    expect(loadState(storage('null')).books).toHaveLength(2);
    const blockedStorage = storage(null);
    blockedStorage.getItem = () => { throw new Error('blocked'); };
    expect(() => loadState(blockedStorage)).not.toThrow();
  });

  it.each([
    'https://example.com/track.png',
    'javascript:alert(1)',
    'data:image/svg+xml;base64,PHN2Zy8+',
    'data:text/html;base64,PHNjcmlwdD4=',
    'data:image/png;base64,PHNjcmlwdD4=',
  ])('rejects unsafe image source %s', (src) => {
    const state = createInitialState();
    state.books[0].entries[state.activeDate].objects.push(object({ src }));
    expect(() => validateState(state)).toThrow();
  });

  it('rejects unknown versions, missing active books and mismatched entry dates', () => {
    const state = createInitialState();
    expect(() => validateState({ ...state, version: 2 })).toThrow();
    expect(() => validateState({ ...state, activeBookId: 'missing' })).toThrow();
    state.books[0].entries[state.activeDate].date = '2024-02-29';
    expect(() => validateState(state)).toThrow();
  });

  it('bounds imported arrays and text, and rejects duplicate IDs', () => {
    const state = createInitialState();
    const entry = state.books[0].entries[state.activeDate];
    entry.body = '字'.repeat(261);
    expect(() => validateState(state)).toThrow();
    entry.body = '';
    entry.tasks = Array.from({ length: 6 }, (_, index) => ({ id: `task-${index}`, text: '', done: false }));
    expect(() => validateState(state)).toThrow();
    entry.tasks = [{ id: 'same', text: '甲', done: false }, { id: 'same', text: '乙', done: true }];
    expect(() => validateState(state)).toThrow();
  });

  it('accepts the UI text limits and rejects a longer title or task', () => {
    const state = createInitialState();
    const entry = state.books[0].entries[state.activeDate];
    entry.title = '字'.repeat(24);
    entry.body = '字'.repeat(260);
    entry.tasks[0].text = '字'.repeat(28);
    expect(() => validateState(state)).not.toThrow();
    entry.title += '字';
    expect(() => validateState(state)).toThrow();
    entry.title = '';
    entry.tasks[0].text += '字';
    expect(() => validateState(state)).toThrow();
  });

  it('rejects more objects than the editor can display and overlong book names', () => {
    const state = createInitialState();
    state.books[0].entries[state.activeDate].objects = Array.from({ length: 31 }, (_, index) => object({ id: `photo-${index}` }));
    expect(() => validateState(state)).toThrow();
    state.books[0].entries[state.activeDate].objects = [];
    state.books[0].title = '字'.repeat(29);
    expect(() => validateState(state)).toThrow();
  });

  it('strips unknown fields while retaining trusted sticker asset IDs', () => {
    const state = createInitialState();
    state.books[0].entries[state.activeDate].objects.push(object({ kind: 'sticker', src: undefined, assetId: 'demo-landscape' }));
    const validated = validateState({ ...state, injected: 'unwanted' });
    expect(validated).not.toHaveProperty('injected');
    expect(validated.books[0].entries[state.activeDate].objects[0].assetId).toBe('demo-landscape');
  });
});

describe('calendar dates', () => {
  it('uses the local day at midnight and year boundaries', () => {
    expect(localDate(new Date(2025, 11, 31, 23, 59, 59))).toBe('2025-12-31');
    expect(localDate(new Date(2026, 0, 1, 0, 0, 0))).toBe('2026-01-01');
    expect(localDate(new Date(2024, 1, 29, 12))).toBe('2024-02-29');
  });

  it('rejects impossible dates instead of rolling them into another month', () => {
    expect(() => createEntry('2023-02-29')).toThrow();
    expect(() => createEntry('2024-04-31')).toThrow();
    expect(() => createEntry('2024-2-09')).toThrow();
    expect(() => localDate(new Date('invalid'))).toThrow();
    expect(createEntry('2024-02-29').date).toBe('2024-02-29');
    expect(createEntry('2000-02-29').date).toBe('2000-02-29');
    expect(() => createEntry('1900-02-29')).toThrow();
  });
});

describe('photo import guards', () => {
  it('rejects active image formats and MIME-spoofed SVG before decoding', async () => {
    await expect(normalizePhoto(new File(['<svg/>'], 'active.svg', { type: 'image/svg+xml' }))).rejects.toThrow('不支持 SVG');
    await expect(normalizePhoto(new File(['<svg/>'], 'spoofed.jpg', { type: 'image/jpeg' }))).rejects.toThrow('格式与文件内容不一致');
  });

  it('rejects empty and oversized photos before allocating a canvas', async () => {
    await expect(normalizePhoto(new File([], 'empty.png', { type: 'image/png' }))).rejects.toThrow('15 MB');
    await expect(normalizePhoto({ type: 'image/jpeg', size: 15 * 1024 * 1024 + 1 } as File)).rejects.toThrow('15 MB');
  });
});

describe('paper object bounds', () => {
  it('clamps edges and normalizes angles without mutating the input', () => {
    const source = object({ x: -90, y: 10_000, rotation: 720 });
    const result = clampObject(source);
    expect(result.x).toBe(0);
    expect(result.y + result.height).toBe(PAGE_HEIGHT);
    expect(result.rotation).toBe(0);
    expect(source.x).toBe(-90);
  });

  it('fits every corner of an oversized rotated object onto the physical page', () => {
    const result = clampObject(object({ x: -1_000, y: 10_000, width: 2_000, height: 2_000, rotation: 45 }));
    const radians = result.rotation * Math.PI / 180;
    const boundWidth = Math.abs(Math.cos(radians)) * result.width + Math.abs(Math.sin(radians)) * result.height;
    const boundHeight = Math.abs(Math.sin(radians)) * result.width + Math.abs(Math.cos(radians)) * result.height;
    const centreX = result.x + result.width / 2;
    const centreY = result.y + result.height / 2;
    expect(centreX - boundWidth / 2).toBeGreaterThanOrEqual(-1e-8);
    expect(centreX + boundWidth / 2).toBeLessThanOrEqual(PAGE_WIDTH + 1e-8);
    expect(centreY - boundHeight / 2).toBeGreaterThanOrEqual(-1e-8);
    expect(centreY + boundHeight / 2).toBeLessThanOrEqual(PAGE_HEIGHT + 1e-8);
  });

  it('rejects nonfinite geometry in backups', () => {
    const state = createInitialState();
    state.books[0].entries[state.activeDate].objects.push(object({ x: Number.NaN }));
    expect(() => validateState(state)).toThrow();
  });
});

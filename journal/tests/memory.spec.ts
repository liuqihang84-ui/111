import { test, expect, type Download, type Page } from '@playwright/test';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { STORAGE_KEY, type JournalState, type JournalEntry } from '../src/lib/model';
import { capturePortableDocument } from './portable-capture';

const canvas = (page: Page) => page.locator('canvas[data-renderer="memory-webgl"]');
const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
const title = (page: Page) => page.getByRole('textbox', { name: '记忆标题', exact: true });
const body = (page: Page) => page.getByRole('textbox', { name: '记忆随笔', exact: true });
const errors = new WeakMap<Page, string[]>();

interface MemoryInspection {
  triangles: number;
  frames: number;
  cameraMatrix: number[];
  cards: Array<{
    id: string;
    kind: string;
    empty: boolean;
    planeNormal: number[];
    planeRange: { min: number; max: number };
    measuredDepth: number;
    matrix: number[];
    textureHash: string;
    projectedCenter: { x: number; y: number };
  }>;
}

function watchErrors(page: Page) {
  const list: string[] = [];
  errors.set(page, list);
  page.on('pageerror', error => list.push(`pageerror: ${error.message}`));
  page.on('console', message => {
    if (message.type() === 'error') list.push(`console: ${message.text()}`);
  });
  return list;
}

async function ready(page: Page) {
  await expect(page.locator('.app-shell')).toHaveAttribute('data-art-ready', 'true', { timeout: 90_000 });
  await expect(page.locator('.memory-workspace')).toBeVisible();
  await expect(canvas(page)).toBeVisible({ timeout: 90_000 });
  await expect(canvas(page)).toHaveAttribute('data-ready', 'true', { timeout: 20_000 });
  await expect(canvas(page)).toHaveAttribute('data-settled', 'true', { timeout: 20_000 });
}

async function inspect(page: Page): Promise<MemoryInspection> {
  return canvas(page).evaluate(element => {
    const probe = (element as HTMLCanvasElement & { __memory3D?: { inspect: () => MemoryInspection } }).__memory3D;
    if (!probe) throw new Error('The actual memory WebGL inspection API is missing.');
    return probe.inspect();
  });
}

function expectSeparatedCardSurfaces(scene: MemoryInspection) {
  const normal = scene.cards[0].planeNormal;
  for (const card of scene.cards) {
    expect(card.measuredDepth, 'Actual world-space body and face vertices must retain real volume.').toBeGreaterThan(.08);
    expect(card.planeNormal).toHaveLength(3);
    card.planeNormal.forEach((value, index) => expect(value).toBeCloseTo(normal[index], 8));
  }
  const ordered = [...scene.cards].sort((a, b) => a.planeRange.min - b.planeRange.min);
  for (let index = 1; index < ordered.length; index++) {
    expect(ordered[index].planeRange.min - ordered[index - 1].planeRange.max, 'Adjacent real world-space card vertex ranges must remain separated without surfaces cutting into each other.').toBeGreaterThan(.07);
  }
}

async function stored(page: Page): Promise<JournalState> {
  return page.evaluate(key => {
    const bytes = localStorage.getItem(key);
    if (!bytes) throw new Error('The actual journal storage is empty.');
    return JSON.parse(bytes);
  }, STORAGE_KEY);
}

async function entry(page: Page): Promise<JournalEntry | undefined> {
  const state = await stored(page);
  return state.books.find(book => book.id === state.activeBookId)!.entries[state.activeDate];
}

async function saved(page: Page, text: string) {
  await expect.poll(async () => JSON.stringify(await stored(page))).toContain(text);
}

async function closePanel(page: Page) {
  await button(page, '关闭编辑面板').click();
  await expect(title(page)).toBeHidden();
}

async function pixels(page: Page) {
  return canvas(page).evaluate(element => (element as HTMLCanvasElement).toDataURL('image/png'));
}

async function comparePixels(page: Page, first: string, second: string) {
  return page.evaluate(async ({ first, second }) => {
    const decode = async (source: string) => {
      const image = new Image(); image.src = source; await image.decode();
      const surface = document.createElement('canvas');
      surface.width = image.naturalWidth; surface.height = image.naturalHeight;
      const context = surface.getContext('2d')!;
      context.drawImage(image, 0, 0);
      return { width: surface.width, height: surface.height, bytes: context.getImageData(0, 0, surface.width, surface.height).data };
    };
    const before = await decode(first), after = await decode(second);
    if (before.width !== after.width || before.height !== after.height) throw new Error('Actual WebGL pixel comparisons require equal canvas sizes.');
    let changed = 0;
    for (let index = 0; index < before.bytes.length; index += 4) {
      const difference = Math.abs(before.bytes[index] - after.bytes[index]) + Math.abs(before.bytes[index + 1] - after.bytes[index + 1]) + Math.abs(before.bytes[index + 2] - after.bytes[index + 2]);
      if (difference > 24) changed++;
    }
    return changed;
  }, { first, second });
}

async function photo(page: Page) {
  const base64 = await page.evaluate(() => {
    const surface = document.createElement('canvas'); surface.width = 80; surface.height = 64;
    const context = surface.getContext('2d')!;
    context.fillStyle = '#eb2f4e'; context.fillRect(0, 0, 80, 64);
    context.fillStyle = '#f8eac3'; context.fillRect(7, 7, 12, 50);
    return surface.toDataURL('image/png').split(',')[1];
  });
  await page.getByTestId('photo-input').setInputFiles({ name: 'actual-memory-photo.png', mimeType: 'image/png', buffer: Buffer.from(base64, 'base64') });
  await expect.poll(async () => (await entry(page))?.objects.some(object => object.kind === 'photo' && object.src?.startsWith('data:image/'))).toBe(true);
}

async function addTask(page: Page, text: string) {
  await button(page, '加小事').click();
  await page.getByRole('textbox', { name: '小事内容', exact: true }).fill(text);
  await button(page, '添加小事').click();
  await expect(page.getByRole('checkbox', { name: `完成小事：${text}`, exact: true })).toBeVisible();
}

async function screenshot(page: Page, name: string) {
  await page.locator('.toast').waitFor({ state: 'hidden' });
  await page.evaluate(async () => { await document.fonts.ready; });
  await mkdir('/tmp/yiri-v07-preview', { recursive: true });
  await page.screenshot({ path: `/tmp/yiri-v07-preview/${name}.png`, fullPage: true });
}

async function bytes(download: Download) {
  expect(await download.failure()).toBeNull();
  const path = await download.path(); expect(path).not.toBeNull();
  return readFile(path!);
}

async function download(page: Page, label: string) {
  await button(page, '更多操作').click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: label === 'PNG' ? /导出.*PNG/i : label, exact: label !== 'PNG' }).click();
  return bytes(await pending);
}

async function inspectPNG(page: Page, data: Buffer) {
  expect(data.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  return page.evaluate(async base64 => {
    const image = new Image(); image.src = `data:image/png;base64,${base64}`; await image.decode();
    const surface = document.createElement('canvas'); surface.width = image.naturalWidth; surface.height = image.naturalHeight;
    const context = surface.getContext('2d')!; context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, surface.width, surface.height).data;
    let red = 0; const colors = new Set<number>();
    for (let index = 0; index < pixels.length; index += 4) {
      if (pixels[index] > 180 && pixels[index + 1] < 100 && pixels[index + 2] < 140 && pixels[index + 3] > 240) red++;
      if (pixels[index + 3] > 240) colors.add((pixels[index] << 16) | (pixels[index + 1] << 8) | pixels[index + 2]);
    }
    return { width: surface.width, height: surface.height, red, colors: colors.size };
  }, data.toString('base64'));
}

test.beforeEach(async ({ page }) => { test.setTimeout(150_000); watchErrors(page); });
test.afterEach(async ({ page }) => { expect(errors.get(page), 'Every actual browser console error and uncaught exception fails the memory tests.').toEqual([]); });

test('默认空白记忆卡组使用真实 GPU，点选卡片原生输入并自动保存', async ({ page }) => {
  await page.goto('/'); await ready(page);
  await expect(page.locator('[data-testid="journal-paper"]')).toHaveCount(0);
  await expect(title(page)).toHaveCount(0);
  const state = await stored(page);
  expect(state.version).toBe(1); expect(state.books).toHaveLength(1);
  expect(state.books[0].entries, 'An unused journal must not invent user records, tasks or uploaded photos.').toEqual({});
  const initial = await inspect(page);
  expect(initial.cards).toHaveLength(1); expect(initial.cards[0].kind).toBe('note'); expect(initial.cards[0].empty).toBe(true);
  expect(initial.triangles).toBeGreaterThan(100);
  expect(initial.cards[0].matrix).toHaveLength(16);
  expect(initial.cards[0].matrix.every(Number.isFinite)).toBe(true);
  expect(await canvas(page).evaluate(element => {
    const gl = (element as HTMLCanvasElement).getContext('webgl2');
    return gl ? { version: gl.getParameter(gl.VERSION), lost: gl.isContextLost() } : null;
  })).toEqual({ version: expect.stringMatching(/^WebGL 2/), lost: false });
  await screenshot(page, 'memory-default');
  const before = await pixels(page);
  const point = initial.cards[0].projectedCenter;
  await page.mouse.click(point.x, point.y);
  await expect(title(page), 'A real raycast card hit must open native editing.').toBeVisible();
  await expect(title(page)).toHaveAttribute('maxlength', '24');
  await expect(body(page)).toHaveAttribute('maxlength', '260');
  expect(await title(page).evaluate(element => Number.parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(24);
  expect(await body(page).evaluate(element => Number.parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(16);
  await title(page).fill('窗边的一点秋光');
  await body(page).fill('把今天的一个瞬间，留在自己的记忆卡片里。\n随手记下一句话。');
  await page.getByRole('combobox', { name: '记忆心情', exact: true }).selectOption('晴朗');
  await expect.poll(async () => (await entry(page))?.mood).toBe('晴朗');
  await saved(page, '窗边的一点秋光');
  await screenshot(page, 'memory-editor');
  await closePanel(page); await ready(page);
  await expect.poll(async () => (await inspect(page)).cards[0].textureHash).not.toBe(initial.cards[0].textureHash);
  expect(await comparePixels(page, before, await pixels(page)), 'Editing must update the actual GPU card texture and canvas pixels.').toBeGreaterThan(100);
  await page.reload(); await ready(page);
  await button(page, '记一笔').click();
  await expect(title(page)).toHaveValue('窗边的一点秋光');
  await expect(body(page)).toHaveValue('把今天的一个瞬间，留在自己的记忆卡片里。\n随手记下一句话。');
  await expect(page.getByRole('combobox', { name: '记忆心情', exact: true })).toHaveValue('晴朗');
});

test('真实照片与小事生成独立卡片，收拢展开改变 3D 矩阵和实际画面', async ({ page }) => {
  await page.goto('/'); await ready(page);
  await button(page, '记一笔').click(); await title(page).fill('一天里的三个片段');
  await body(page).fill('照片、文字与小事各有一个位置。'); await closePanel(page);
  await button(page, '添照片').click(); await photo(page);
  await button(page, '关闭编辑面板').click();
  await addTask(page, '把花放在窗边');
  await expect.poll(async () => (await inspect(page)).cards.some(card => card.kind === 'tasks')).toBe(true);
  const uncheckedTaskHash = (await inspect(page)).cards.find(card => card.kind === 'tasks')!.textureHash;
  await page.getByRole('checkbox', { name: '完成小事：把花放在窗边', exact: true }).check();
  await expect.poll(async () => (await entry(page))?.tasks[0]?.done).toBe(true);
  await expect.poll(async () => (await inspect(page)).cards.find(card => card.kind === 'tasks')!.textureHash, { message: 'Completing a small task must change its actual GPU-rendered card texture.' }).not.toBe(uncheckedTaskHash);
  await button(page, '关闭编辑面板').click(); await ready(page);
  await expect.poll(async () => (await inspect(page)).cards.length, { message: 'The asynchronously decoded local photo and edited tasks must become actual GPU cards.' }).toBe(3);
  const spread = await inspect(page);
  expect(spread.cards.filter(card => card.kind === 'photo')).toHaveLength(1);
  expect(spread.cards.filter(card => card.kind === 'tasks')).toHaveLength(1);
  expect(spread.cards).toHaveLength(3);
  expectSeparatedCardSurfaces(spread);
  expect(new Set(spread.cards.map(card => JSON.stringify(card.matrix))).size).toBe(3);
  expect(new Set(spread.cards.map(card => card.textureHash)).size).toBe(3);
  await screenshot(page, 'memory-spread');
  const spreadPixels = await pixels(page);
  await button(page, '收拢卡片').click(); await ready(page);
  await expect(canvas(page)).toHaveAttribute('data-layout', 'gather');
  const gathered = await inspect(page);
  expectSeparatedCardSurfaces(gathered);
  expect(gathered.cameraMatrix, 'Gathering must rearrange card geometry while keeping the actual camera steady.').toEqual(spread.cameraMatrix);
  expect(gathered.cards.map(card => card.matrix)).not.toEqual(spread.cards.map(card => card.matrix));
  expect(await comparePixels(page, spreadPixels, await pixels(page)), 'Gathering must move real independent 3D meshes rather than toggling a CSS class.').toBeGreaterThan(1000);
  await screenshot(page, 'memory-gather');
  await button(page, '展开卡片').click(); await ready(page);
  await expect(canvas(page)).toHaveAttribute('data-layout', 'spread');
  await expect.poll(async () => (await inspect(page)).cards.map(card => card.matrix)).toEqual(spread.cards.map(card => card.matrix));
  const exported = await inspectPNG(page, await download(page, 'PNG'));
  expect(exported.width).toBe(1440); expect(exported.height).toBe(1024);
  expect(exported.red, 'The actual memory export must contain the uploaded local image pixels.').toBeGreaterThan(100);
  expect(exported.colors).toBeGreaterThan(100);
});

test.describe('记忆卡片原生手机触摸', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test('390 与 320px 下按需编辑可触达、日期独立保存，真实 GPU 丢失后仍能写作', async ({ page }) => {
    await page.goto('/'); await ready(page);
    const originalDate = await page.getByLabel('页面日期', { exact: true }).inputValue();
    const overflow = () => page.evaluate(() => ({ width: document.documentElement.clientWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 }); await ready(page);
      const dimensions = await overflow();
      expect(dimensions.document).toBeLessThanOrEqual(dimensions.width + 1); expect(dimensions.body).toBeLessThanOrEqual(dimensions.width + 1);
      for (const name of ['记一笔', '添照片', '加小事', '前一天', '后一天']) {
        const bounds = await button(page, name).boundingBox(); expect(bounds).not.toBeNull();
        expect(bounds!.width, `${name} actual touch width at ${width}px`).toBeGreaterThanOrEqual(43);
        expect(bounds!.height, `${name} actual touch height at ${width}px`).toBeGreaterThanOrEqual(43);
      }
      await button(page, '记一笔').tap(); await expect(title(page)).toBeVisible();
      const panelOverflow = await overflow(); expect(panelOverflow.document).toBeLessThanOrEqual(panelOverflow.width + 1);
      expect(await title(page).evaluate(element => Number.parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(24);
      expect(await body(page).evaluate(element => Number.parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(16);
      await title(page).fill('手机里的独立记忆'); await body(page).fill('触摸打开，原生输入。'); await saved(page, '手机里的独立记忆');
      await button(page, '关闭编辑面板').tap(); await ready(page);
      await button(page, '前一天').tap(); await ready(page);
      await button(page, '记一笔').tap(); await expect(title(page)).toHaveValue(width === 390 ? '' : '前一天的另一片光');
      await title(page).fill('前一天的另一片光'); await saved(page, '前一天的另一片光'); await button(page, '关闭编辑面板').tap();
      await button(page, '后一天').tap(); await ready(page);
      await expect(page.getByLabel('页面日期', { exact: true })).toHaveValue(originalDate);
      await button(page, '记一笔').tap(); await expect(title(page)).toHaveValue('手机里的独立记忆'); await button(page, '关闭编辑面板').tap();
    }
    await screenshot(page, 'memory-mobile');
    expect(await canvas(page).evaluate(element => {
      const gl = (element as HTMLCanvasElement).getContext('webgl2')!;
      const extension = gl.getExtension('WEBGL_lose_context'); if (!extension) throw new Error('Actual WebGL context loss extension is unavailable.');
      (window as unknown as { memoryContextLoss: { trusted: boolean; lost: boolean } | null }).memoryContextLoss = null;
      element.addEventListener('webglcontextlost', event => {
        (window as unknown as { memoryContextLoss: { trusted: boolean; lost: boolean } | null }).memoryContextLoss = { trusted: event.isTrusted, lost: gl.isContextLost() };
      }, { once: true });
      extension.loseContext(); return gl.isContextLost();
    })).toBe(true);
    await expect.poll(() => page.evaluate(() => (window as unknown as { memoryContextLoss: { trusted: boolean; lost: boolean } | null }).memoryContextLoss)).toEqual({ trusted: true, lost: true });
    await expect(canvas(page)).toBeHidden(); await expect(canvas(page)).toHaveAttribute('data-available', 'false');
    await expect(page.locator('.memory-fallback')).toBeVisible();
    await button(page, '记一笔').tap(); await expect(title(page)).toHaveValue('手机里的独立记忆');
    await body(page).fill('GPU 中断后，仍可继续保存这张卡片。'); await saved(page, 'GPU 中断后，仍可继续保存这张卡片。');
    await button(page, '关闭编辑面板').tap(); await button(page, '前一天').tap(); await button(page, '后一天').tap();
    await button(page, '记一笔').tap(); await expect(body(page)).toHaveValue('GPU 中断后，仍可继续保存这张卡片。');
  });
});

test('实际单文件 HTML 断网后编辑卡组、上传照片、完成小事并导出真实备份与 PNG', async ({ browser, baseURL }) => {
  const release = await readFile(resolve('release/yiri-journal.html'));
  const address = new URL('/yiri-journal.html', baseURL).href;
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  const page = await context.newPage(); const actualResponse = await capturePortableDocument(context, page);
  const failures = watchErrors(page); const resources: string[] = [];
  page.on('request', request => {
    if (/^https?:/.test(request.url()) && (!request.isNavigationRequest() || request.url() !== address)) resources.push(request.url());
  });
  try {
    const response = await page.goto(address); expect(response?.status()).toBe(200);
    expect((await actualResponse(address)).equals(release), 'The browser must execute the exact release HTML bytes through an actual allowed HTTP response.').toBe(true);
    await ready(page);
    expect(resources, 'The portable card UI must embed all fonts, images and scripts.').toEqual([]);
    await context.setOffline(true); expect(await page.evaluate(() => navigator.onLine)).toBe(false);
    const offline: string[] = []; page.on('request', request => { if (/^https?:/.test(request.url())) offline.push(request.url()); });
    await button(page, '记一笔').click(); await title(page).fill('离线的三张记忆');
    await body(page).fill('没有网络，文字、照片与小事仍能留在这里。'); await closePanel(page);
    await button(page, '添照片').click(); await photo(page); await button(page, '关闭编辑面板').click();
    await addTask(page, '完成今天的一件小事'); await page.getByRole('checkbox', { name: '完成小事：完成今天的一件小事', exact: true }).check();
    await button(page, '关闭编辑面板').click(); await ready(page);
    await expect.poll(async () => (await inspect(page)).cards.length, { message: 'Offline content must finish producing real independent GPU card surfaces.' }).toBe(3);
    const backup = JSON.parse((await download(page, '导出备份')).toString('utf8')) as JournalState;
    expect(backup.version).toBe(1);
    const record = backup.books.find(book => book.id === backup.activeBookId)!.entries[backup.activeDate];
    expect(record.title).toBe('离线的三张记忆'); expect(record.body).toContain('没有网络');
    expect(record.tasks).toEqual([expect.objectContaining({ text: '完成今天的一件小事', done: true })]);
    expect(record.objects).toHaveLength(1); expect(record.objects[0].src).toMatch(/^data:image\/png;base64,/);
    const output = await inspectPNG(page, await download(page, 'PNG'));
    expect(output.width).toBe(1440); expect(output.height).toBe(1024); expect(output.red).toBeGreaterThan(100);
    expect(offline, 'Actual offline edits and exports must not request HTTP resources.').toEqual([]);
    expect(failures).toEqual([]);
  } finally { await context.close(); }
});

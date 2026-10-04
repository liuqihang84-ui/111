import { test, expect, type Download, type Locator, type Page } from '@playwright/test';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { JournalState } from '../src/lib/model';
import { capturePortableDocument } from './portable-capture';

const browserErrors = new WeakMap<Page, string[]>();
const titleField = (page: Page) => page.getByRole('textbox', { name: '页面标题', exact: true });
const bodyField = (page: Page) => page.getByRole('textbox', { name: '今日随笔', exact: true });
const nav = (page: Page, name: string) => page.getByRole('button', {
  name: name === '今日一页' ? /^今日一页/ : name, exact: true,
});
const deskTest = '书桌先展示有厚度的册子，真实开册后进入纸页编辑';

async function expectArtReady(page: Page) {
  await expect(page.locator('.app-shell')).toHaveAttribute('data-art-ready', 'true', { timeout: 90_000 });
}

async function expectNotebookReady(page: Page) {
  await expect(titleField(page)).toBeVisible();
  await expect(page.locator('.notebook-scene')).toBeVisible();
  await expect(page.locator('.notebook-scene')).not.toHaveClass(/is-flipping|is-opening/);
}

async function openBook(page: Page, title = '山水有清音') {
  await nav(page, `打开手账：${title}`).click();
  await expectNotebookReady(page);
}

async function ensureTrayExpanded(page: Page) {
  const expand = nav(page, '展开素材托盘');
  if (await expand.isVisible()) await expand.click();
}

async function readObject(object: Locator) {
  return object.evaluate(element => {
    const style = (element as HTMLElement).style;
    return {
      x: Number.parseFloat(style.left), y: Number.parseFloat(style.top),
      width: Number.parseFloat(style.width), height: Number.parseFloat(style.height),
      transform: style.transform,
    };
  });
}

async function expectEdgeHandleAvailable(object: Locator) {
  await object.evaluate(element => element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }));
  await expect.poll(() => object.getByTestId('object-resize-handle').evaluate(element => {
    const handle = element.getBoundingClientRect();
    const paper = document.querySelector('[data-testid="journal-paper"]')!.getBoundingClientRect();
    const centerX = handle.x + handle.width / 2;
    const centerY = handle.y + handle.height / 2;
    const points = [
      { x: centerX, y: centerY },
      { x: handle.x + 6, y: centerY },
      { x: handle.right - 6, y: centerY },
      { x: centerX, y: handle.y + 6 },
      { x: centerX, y: handle.bottom - 6 },
    ];
    return {
      insidePaper: handle.x >= paper.x - 1 && handle.y >= paper.y - 1 && handle.right <= paper.right + 1 && handle.bottom <= paper.bottom + 1,
      fullTouchSize: handle.width >= 43 && handle.height >= 43,
      hits: points.map(point => document.elementFromPoint(point.x, point.y)?.closest('[data-testid="object-resize-handle"]') === element),
    };
  }), { message: 'At the paper edge the complete 44px resize control must stay inside the page and remain hittable at its centre and four sides.' }).toEqual({
    insidePaper: true, fullTouchSize: true, hits: [true, true, true, true, true],
  });
}

function backupObjects(bytes: Buffer) {
  const state = JSON.parse(bytes.toString('utf8')) as JournalState;
  const book = state.books.find(item => item.id === state.activeBookId);
  expect(book).toBeTruthy();
  return book!.entries[state.activeDate].objects;
}

function watchErrors(page: Page) {
  const errors: string[] = [];
  browserErrors.set(page, errors);
  page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  return errors;
}

async function expectSaved(page: Page, text: string) {
  await expect.poll(() => page.evaluate(needle => Object.keys(localStorage)
    .some(key => (localStorage.getItem(key) ?? '').includes(needle)), text)).toBe(true);
}

async function expectSaveComplete(page: Page) {
  await expect(page.getByRole('status').filter({ hasText: /^已自动保存$/ })).toBeVisible();
}

async function downloadBytes(download: Download) {
  expect(await download.failure()).toBeNull();
  const path = await download.path();
  expect(path).not.toBeNull();
  return readFile(path!);
}

async function downloadBackup(page: Page) {
  const pending = page.waitForEvent('download');
  await nav(page, '导出备份').click();
  const download = await pending;
  expect(download.suggestedFilename()).toMatch(/\.json$/i);
  return downloadBytes(download);
}

async function importBackup(page: Page, bytes: Buffer, name = 'journal-backup.json') {
  await page.getByTestId('backup-input').setInputFiles({
    name, mimeType: 'application/json', buffer: bytes,
  });
}

async function makePhoto(page: Page) {
  const data = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 48;
    canvas.height = 48;
    const context = canvas.getContext('2d')!;
    context.fillStyle = 'rgb(235, 47, 78)';
    context.fillRect(0, 0, 48, 48);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  return Buffer.from(data, 'base64');
}

async function addPhoto(page: Page) {
  const before = await page.getByTestId('paper-object').count();
  await page.getByTestId('photo-input').setInputFiles({
    name: 'browser-photo.png', mimeType: 'image/png', buffer: await makePhoto(page),
  });
  await expect(page.getByTestId('paper-object')).toHaveCount(before + 1);
  const id = await page.getByTestId('paper-object').last().getAttribute('data-object-id');
  expect(id).toBeTruthy();
  return page.locator(`[data-object-id="${id}"]`);
}

async function addSticker(page: Page) {
  await expectArtReady(page);
  await ensureTrayExpanded(page);
  const before = await page.getByTestId('paper-object').count();
  await nav(page, '添加贴纸：白花枝').click();
  await expect(page.getByTestId('paper-object')).toHaveCount(before + 1);
  const id = await page.getByTestId('paper-object').last().getAttribute('data-object-id');
  expect(id).toBeTruthy();
  return page.locator(`[data-object-id="${id}"]`);
}

async function dragObject(page: Page, object: Locator, dx: number, dy: number, touch = false) {
  await expect.poll(() => object.evaluate(element => {
    const scale = getComputedStyle(element).scale;
    return scale === 'none' ? 1 : Number.parseFloat(scale);
  }), { message: 'The previous grab animation must settle before measuring the next gesture.' }).toBe(1);
  await object.evaluate(element => element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }));
  const id = await object.getAttribute('data-object-id');
  const bodyPoint = () => object.evaluate(element => {
    const rect = element.getBoundingClientRect();
    const handle = element.querySelector('[data-testid="object-resize-handle"]')?.getBoundingClientRect();
    const candidates = [
      { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 },
      { x: rect.x + rect.width / 4, y: rect.y + rect.height / 4 },
      { x: rect.x + rect.width * .75, y: rect.y + rect.height / 4 },
      { x: rect.x + rect.width / 4, y: rect.y + rect.height * .75 },
    ];
    return candidates.find(point => {
      const target = document.elementFromPoint(point.x, point.y);
      const nearHandle = handle && point.x >= handle.left - 8 && point.x <= handle.right + 8 && point.y >= handle.top - 8 && point.y <= handle.bottom + 8;
      return !nearHandle && target?.closest('[data-object-id]') === element && !target.closest('[data-testid="object-resize-handle"]');
    }) ?? null;
  });
  await expect.poll(bodyPoint, { message: 'The drag must start on the real object body, clear of its resize handle and sticky tools.' }).not.toBeNull();
  const start = await bodyPoint();
  expect(start).not.toBeNull();
  const before = await object.boundingBox();
  expect(before).not.toBeNull();
  const { x, y } = start!;
  if (touch) {
    await page.evaluate(() => {
      const probe = window as Window & { journalDragStart: { objectId: string | null; resize: boolean } | null };
      probe.journalDragStart = null;
      document.addEventListener('pointerdown', event => {
        const target = event.target instanceof Element ? event.target : null;
        probe.journalDragStart = {
          objectId: target?.closest('[data-object-id]')?.getAttribute('data-object-id') ?? null,
          resize: Boolean(target?.closest('[data-testid="object-resize-handle"]')),
        };
      }, { capture: true, once: true });
    });
    const session = await page.context().newCDPSession(page);
    const viewport = page.viewportSize()!;
    const endX = Math.min(viewport.width - 5, Math.max(5, x + dx));
    const endY = Math.min(viewport.height - 5, Math.max(5, y + dy));
    try {
      await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 7 }] });
      const actualTarget = await page.evaluate(() => (window as Window & {
        journalDragStart: { objectId: string | null; resize: boolean } | null;
      }).journalDragStart);
      expect(actualTarget, 'The native touch pointerdown must target the object body rather than the resize button.').toEqual({ objectId: id, resize: false });
      for (let step = 1; step <= 12; step++) {
        await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{
          x: x + (endX - x) * step / 12, y: y + (endY - y) * step / 12, id: 7,
        }] });
      }
      await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    } finally {
      await session.detach();
    }
  } else {
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + dx, y + dy, { steps: 12 });
    await page.mouse.up();
  }
  const after = await object.boundingBox();
  expect(after).not.toBeNull();
  return { before: before!, after: after! };
}

async function inspectPNG(page: Page, bytes: Buffer) {
  expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  return page.evaluate(async base64 => {
    const image = new Image();
    image.src = `data:image/png;base64,${base64}`;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d')!;
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let redPixels = 0;
    let transparentPixels = 0;
    let opaquePixels = 0;
    let visiblePixels = 0;
    const colors = new Set<number>();
    for (let index = 0; index < pixels.length; index += 4) {
      if (pixels[index] > 210 && pixels[index + 1] < 70 && pixels[index + 2] < 110 && pixels[index + 3] > 240) redPixels++;
      if (pixels[index + 3] < 255) transparentPixels++;
      if (pixels[index + 3] === 255) opaquePixels++;
      if (pixels[index + 3] >= 200) visiblePixels++;
      if (pixels[index + 3] > 200) colors.add((pixels[index] << 16) | (pixels[index + 1] << 8) | pixels[index + 2]);
    }
    return { width: canvas.width, height: canvas.height, redPixels, transparentPixels, opaquePixels, visiblePixels, colors: colors.size, cornerAlpha: pixels[3] };
  }, bytes.toString('base64'));
}

async function downloadPNG(page: Page) {
  await expectArtReady(page);
  await expectNotebookReady(page);
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: /导出.*PNG/i }).click();
  const download = await pending;
  expect(download.suggestedFilename()).toMatch(/\.png$/i);
  return downloadBytes(download);
}

async function exportPNG(page: Page) {
  return inspectPNG(page, await downloadPNG(page));
}

async function changedPNGRegion(page: Page, before: Buffer, after: Buffer, region: { x: number; y: number; width: number; height: number }) {
  return page.evaluate(async ({ before, after, region }) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 1680;
    const context = canvas.getContext('2d')!;
    const readPixels = async (base64: string) => {
      const image = new Image();
      image.src = `data:image/png;base64,${base64}`;
      await image.decode();
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0);
      return context.getImageData(Math.floor(region.x), Math.floor(region.y), Math.floor(region.width), Math.floor(region.height)).data;
    };
    const first = await readPixels(before);
    const second = await readPixels(after);
    let changed = 0;
    for (let index = 0; index < first.length; index += 4) {
      const difference = Math.abs(first[index] - second[index]) + Math.abs(first[index + 1] - second[index + 1]) + Math.abs(first[index + 2] - second[index + 2]);
      if (difference > 12) changed++;
    }
    return changed;
  }, { before: before.toString('base64'), after: after.toString('base64'), region });
}

async function screenshot(page: Page, name: string) {
  await expectArtReady(page);
  await expectSaveComplete(page);
  await page.locator('.toast').waitFor({ state: 'hidden' });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(Array.from(document.images, image => image.decode()));
  });
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
  await mkdir(resolve('test-results/preview'), { recursive: true });
  await page.screenshot({ path: resolve(`test-results/preview/${name}.png`), fullPage: true });
}

test.beforeEach(async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  watchErrors(page);
  await page.goto('/');
  await expect(nav(page, '打开手账：山水有清音')).toBeVisible();
  if (testInfo.title !== deskTest) await openBook(page);
});

test.afterEach(async ({ page }) => {
  expect(browserErrors.get(page), 'Every browser console error and uncaught exception is a test failure.').toEqual([]);
});

test(deskTest, async ({ page }) => {
  await expect(page.getByTestId('journal-paper')).toHaveCount(0);
  for (const label of ['今日一页', '我的手账', '月历回顾']) await expect(nav(page, label)).toBeVisible();
  const book = page.getByTestId('book-card').filter({ has: nav(page, '打开手账：山水有清音') });
  const geometry = book.locator('.book-geometry');
  await expect(geometry).toBeVisible();
  const dimensions = await geometry.evaluate(element => {
    const rect = (selector: string) => {
      const node = element.querySelector(selector)!;
      const box = node.getBoundingClientRect();
      return { width: box.width, height: box.height, transform: getComputedStyle(node).transform };
    };
    return { transform: getComputedStyle(element).transform, spine: rect('.book-spine'), pages: rect('.book-pages') };
  });
  expect(dimensions.transform).toMatch(/^matrix3d\(/);
  for (const part of [dimensions.spine, dimensions.pages]) {
    expect(part.width).toBeGreaterThan(3);
    expect(part.height).toBeGreaterThan(3);
    expect(part.transform).not.toBe('none');
  }
  await screenshot(page, 'desktop-desk');
  const front = book.locator('.book-front');
  const before = await front.evaluate(element => getComputedStyle(element).transform);
  await nav(page, '打开手账：山水有清音').click();
  await expect.poll(async () => {
    const transform = await page.evaluate(() => {
      const front = document.querySelector('[data-book-title="山水有清音"] .book-front');
      return front ? getComputedStyle(front).transform : null;
    });
    return transform !== null && transform !== before;
  }, { message: 'The cover must visibly turn before the desk is replaced by the editor.', timeout: 2_000 }).toBe(true);
  await expectNotebookReady(page);
  await titleField(page).fill('从案头打开的一页');
  await expectSaved(page, '从案头打开的一页');
  const sticker = await addSticker(page);
  const source = await sticker.locator('img').getAttribute('src');
  expect(source).toMatch(/^data:image\/png;base64,/);
  const artwork = await inspectPNG(page, Buffer.from(source!.split(',')[1], 'base64'));
  expect(artwork.width).toBeGreaterThan(64);
  expect(artwork.height).toBeGreaterThan(64);
  expect(artwork.transparentPixels, 'The PNG artwork must retain its cutout alpha channel.').toBeGreaterThan(100);
  expect(artwork.visiblePixels).toBeGreaterThan(100);
  expect(artwork.colors, 'The PNG artwork must contain varied rendered pixels.').toBeGreaterThan(32);
});

test('标题和随笔自动保存，刷新后仍可编辑', async ({ page }) => {
  await titleField(page).fill('风吹过书页');
  await bodyField(page).fill('今天绕过河边，记下桂花香。\n明天再来看一眼。');
  await expectSaved(page, '今天绕过河边');
  await page.reload();
  await openBook(page);
  await expect(titleField(page)).toHaveValue('风吹过书页');
  await expect(bodyField(page)).toHaveValue('今天绕过河边，记下桂花香。\n明天再来看一眼。');
  await titleField(page).fill('风与桂花');
  await expectSaved(page, '风与桂花');
  await screenshot(page, 'desktop-editor');
});

test('心情和待办完成状态保存到当天', async ({ page }) => {
  await ensureTrayExpanded(page);
  await nav(page, '今日内容').click();
  await nav(page, '晴朗').click();
  await expect(nav(page, '晴朗')).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('textbox', { name: '新待办', exact: true }).fill('给兰草浇水');
  await nav(page, '添加待办').click();
  const task = page.getByRole('checkbox', { name: '给兰草浇水', exact: true });
  await task.check();
  await expectSaved(page, '给兰草浇水');
  await expectSaveComplete(page);
  await page.reload();
  await openBook(page);
  await ensureTrayExpanded(page);
  await nav(page, '今日内容').click();
  await expect(nav(page, '晴朗')).toHaveAttribute('aria-pressed', 'true');
  await expect(task).toBeChecked();
});

test('新建手账并切换时，书册内容彼此独立', async ({ page }) => {
  await titleField(page).fill('第一册里的秋日');
  await expectSaved(page, '第一册里的秋日');
  await nav(page, '我的手账').click();
  const initialBookCount = await page.getByTestId('book-card').count();
  const firstCard = page.getByTestId('book-card').first();
  const firstName = await firstCard.getAttribute('data-book-title');
  expect(firstName).toBeTruthy();
  await nav(page, '新建手账').last().click();
  const modal = page.getByRole('dialog');
  await expect(modal).toBeVisible();
  await modal.getByRole('textbox', { name: '手账名称', exact: true }).fill('山窗日记');
  await modal.getByRole('button', { name: '开始记录', exact: true }).click();
  await expect(titleField(page)).toBeVisible();
  await titleField(page).fill('山窗里的第一片叶子');
  await expectSaved(page, '山窗里的第一片叶子');
  await nav(page, '我的手账').click();
  await expect(page.getByTestId('book-card')).toHaveCount(initialBookCount + 1);
  await nav(page, `打开手账：${firstName!}`).click();
  await expect(titleField(page)).toHaveValue('第一册里的秋日');
  await nav(page, '我的手账').click();
  await nav(page, '打开手账：山窗日记').click();
  await expect(titleField(page)).toHaveValue('山窗里的第一片叶子');
  await expectSaveComplete(page);
  await page.reload();
  await openBook(page, '山窗日记');
  await expect(titleField(page)).toHaveValue('山窗里的第一片叶子');
  await nav(page, '我的手账').click();
  await screenshot(page, 'desktop-books');
});

test('月历选日可编辑独立内容，并显示有记录标记', async ({ page }) => {
  await nav(page, '月历回顾').click();
  const dates = page.getByRole('button', { name: /^\d{4}-\d{2}-\d{2}$/ });
  await expect(dates.first()).toBeVisible();
  const date = await dates.first().getAttribute('aria-label');
  const otherDate = await dates.nth(1).getAttribute('aria-label');
  expect(date).toBeTruthy();
  expect(otherDate).toBeTruthy();
  await dates.first().click();
  await expectNotebookReady(page);
  await titleField(page).fill('月初的兰草');
  await bodyField(page).fill('这一天只属于月初。');
  await expectSaved(page, '这一天只属于月初');
  await nav(page, '月历回顾').click();
  await expect(nav(page, date!)).toHaveClass(/has-entry/);
  await nav(page, otherDate!).click();
  await expectNotebookReady(page);
  await expect(titleField(page)).not.toHaveValue('月初的兰草');
  await titleField(page).fill('第二日的茶');
  await expectSaved(page, '第二日的茶');
  await nav(page, '月历回顾').click();
  await nav(page, date!).click();
  await expectNotebookReady(page);
  await expect(titleField(page)).toHaveValue('月初的兰草');
  await expect(bodyField(page)).toHaveValue('这一天只属于月初。');
  await expectSaveComplete(page);
  await page.reload();
  await openBook(page);
  await expect(titleField(page)).toHaveValue('月初的兰草');
  await nav(page, '月历回顾').click();
  await expect(nav(page, date!)).toHaveClass(/has-entry/);
  await expect(nav(page, otherDate!)).toHaveClass(/has-entry/);
  await screenshot(page, 'desktop-calendar');
});

test('贴纸可真实拖动、缩放、旋转、保存和删除', async ({ page }) => {
  const object = await addSticker(page);
  const id = await object.getAttribute('data-object-id');
  expect(id).toBeTruthy();
  const movement = await dragObject(page, object, 70, 45);
  expect(movement.after.x - movement.before.x).toBeGreaterThan(30);
  expect(movement.after.y - movement.before.y).toBeGreaterThan(15);
  const size = page.getByRole('slider', { name: '贴纸大小', exact: true });
  await size.press('End');
  const enlarged = await object.boundingBox();
  expect(enlarged!.width).toBeGreaterThan(movement.after.width * 1.15);
  const rotation = page.getByRole('slider', { name: '旋转角度', exact: true });
  await rotation.press('Home');
  await rotation.press('ArrowRight');
  await rotation.press('ArrowRight');
  const savedRotation = await rotation.inputValue();
  const savedStyle = await object.getAttribute('style');
  await expect.poll(() => object.getAttribute('style')).toContain('rotate');
  await expectSaveComplete(page);
  await page.reload();
  await openBook(page);
  const restored = page.locator(`[data-object-id="${id}"]`);
  await expect(restored).toBeVisible();
  await expect(restored).toHaveAttribute('style', savedStyle!);
  await restored.click();
  await expect(rotation).toHaveValue(savedRotation);
  const count = await page.getByTestId('paper-object').count();
  await nav(page, '删除选中素材').click();
  await expect(page.getByTestId('paper-object')).toHaveCount(count - 1);
  await expectSaveComplete(page);
  await page.reload();
  await openBook(page);
  await expect(restored).toHaveCount(0);
});

test('拖动与真实缩放手柄各自只占一次撤销，重做恢复完整变换', async ({ page }) => {
  const object = await addSticker(page);
  const rotation = page.getByRole('slider', { name: '旋转角度', exact: true });
  for (let step = 0; step < 7; step++) await rotation.press('ArrowRight');
  const original = await readObject(object);
  expect(original.transform).not.toBe('rotate(0deg)');
  await dragObject(page, object, -55, -42);
  const moved = await readObject(object);
  expect(original.x - moved.x).toBeGreaterThan(30);
  expect(original.y - moved.y).toBeGreaterThan(20);
  expect(moved.transform).toBe(original.transform);
  await nav(page, '撤销').click();
  await expect.poll(() => readObject(object)).toEqual(original);
  await nav(page, '重做').click();
  await expect.poll(() => readObject(object)).toEqual(moved);
  await object.click();
  const handle = object.getByTestId('object-resize-handle');
  await expect(handle).toBeVisible();
  await handle.scrollIntoViewIfNeeded();
  const bounds = await handle.boundingBox();
  expect(bounds).not.toBeNull();
  const startX = bounds!.x + bounds!.width / 2;
  const startY = bounds!.y + bounds!.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 40, startY + 40, { steps: 12 });
  await page.mouse.up();
  const resized = await readObject(object);
  expect(resized.width).toBeGreaterThan(moved.width + 20);
  expect(resized.height).toBeGreaterThan(moved.height + 20);
  expect(resized.transform).toBe(moved.transform);
  await nav(page, '撤销').click();
  await expect.poll(() => readObject(object)).toEqual(moved);
  await nav(page, '重做').click();
  await expect.poll(() => readObject(object)).toEqual(resized);
  await expectSaveComplete(page);
  const id = await object.getAttribute('data-object-id');
  await page.reload();
  await openBook(page);
  await expect.poll(() => readObject(page.locator(`[data-object-id="${id}"]`))).toEqual(resized);
});

test('复制素材独立保存，置前改变实际遮挡，删除后备份仍可恢复副本', async ({ page }) => {
  const added = await addSticker(page);
  const originalId = await added.getAttribute('data-object-id');
  const original = page.locator(`[data-object-id="${originalId}"]`);
  await dragObject(page, original, -60, -70);
  const originalTransform = await readObject(original);
  const beforeCount = await page.getByTestId('paper-object').count();
  await nav(page, '复制选中素材').click();
  await expect(page.getByTestId('paper-object')).toHaveCount(beforeCount + 1);
  const copy = page.getByTestId('paper-object').last();
  const copyId = await copy.getAttribute('data-object-id');
  expect(copyId).toBeTruthy();
  expect(copyId).not.toBe(originalId);
  const copyTransform = await readObject(copy);
  expect(copyTransform.width).toBe(originalTransform.width);
  expect(copyTransform.height).toBe(originalTransform.height);
  expect(copyTransform.transform).toBe(originalTransform.transform);
  await original.click({ position: { x: 5, y: 5 } });
  await nav(page, '置于最前').click();
  await expect(page.getByTestId('paper-object').last()).toHaveAttribute('data-object-id', originalId!);
  await titleField(page).click();
  await expect(nav(page, '复制选中素材')).toHaveCount(0);
  const copyById = page.locator(`[data-object-id="${copyId}"]`);
  await original.scrollIntoViewIfNeeded();
  const firstBounds = await original.boundingBox();
  const copyBounds = await copyById.boundingBox();
  expect(firstBounds).not.toBeNull();
  expect(copyBounds).not.toBeNull();
  const intersection = {
    left: Math.max(firstBounds!.x, copyBounds!.x), top: Math.max(firstBounds!.y, copyBounds!.y),
    right: Math.min(firstBounds!.x + firstBounds!.width, copyBounds!.x + copyBounds!.width),
    bottom: Math.min(firstBounds!.y + firstBounds!.height, copyBounds!.y + copyBounds!.height),
  };
  expect(intersection.right - intersection.left).toBeGreaterThan(10);
  expect(intersection.bottom - intersection.top).toBeGreaterThan(10);
  const topObject = await page.evaluate(point => document.elementFromPoint(point.x, point.y)?.closest('[data-object-id]')?.getAttribute('data-object-id'), {
    x: (intersection.left + intersection.right) / 2, y: (intersection.top + intersection.bottom) / 2,
  });
  expect(topObject, 'Bring to front must change actual browser hit testing in the overlap.').toBe(originalId);
  const bothBytes = await downloadBackup(page);
  const objects = backupObjects(bothBytes);
  expect(objects.at(-1)?.id).toBe(originalId);
  expect(objects.find(item => item.id === copyId)).toMatchObject({
    kind: 'sticker', assetId: objects.find(item => item.id === originalId)!.assetId,
    width: originalTransform.width, height: originalTransform.height,
  });
  await original.click();
  await nav(page, '删除选中素材').click();
  await expect(original).toHaveCount(0);
  await expect(copyById).toBeVisible();
  const afterDelete = backupObjects(await downloadBackup(page));
  expect(afterDelete.some(item => item.id === originalId)).toBe(false);
  expect(afterDelete.some(item => item.id === copyId)).toBe(true);
  await expectSaveComplete(page);
  await page.reload();
  await openBook(page);
  await expect(original).toHaveCount(0);
  await expect.poll(() => readObject(copyById)).toEqual(copyTransform);
  await importBackup(page, bothBytes);
  await expect(original).toBeVisible();
  await expect(copyById).toBeVisible();
  await expect.poll(() => readObject(copyById)).toEqual(copyTransform);
});

test('本地照片上传后，PNG 实际包含照片像素和完整画布', async ({ page }) => {
  const photo = await addPhoto(page);
  await expect(photo.locator('img')).toBeVisible();
  await expect(photo.locator('img')).toHaveAttribute('src', /^data:image\/png;base64,/);
  const movement = await dragObject(page, photo, -35, 24);
  expect(movement.before.x - movement.after.x).toBeGreaterThan(10);
  const output = await exportPNG(page);
  expect(output.width).toBe(1280);
  expect(output.height).toBe(1680);
  expect(output.cornerAlpha).toBe(255);
  expect(output.transparentPixels).toBe(0);
  expect(output.redPixels, 'The exported canvas must contain pixels from the uploaded photo.').toBeGreaterThan(100);
});

test('JSON 备份下载的实际字节可以完整恢复修改前的页面', async ({ page }) => {
  await titleField(page).fill('备份里的山与水');
  await bodyField(page).fill('这段随笔与兰草一起备份。');
  await addSticker(page);
  await addPhoto(page);
  const objectCount = await page.getByTestId('paper-object').count();
  const bytes = await downloadBackup(page);
  const backup = JSON.parse(bytes.toString('utf8')) as unknown;
  expect(backup).toBeTruthy();
  expect(bytes.toString('utf8')).toContain('备份里的山与水');
  expect(bytes.toString('utf8')).toContain('data:image/png;base64,');
  await titleField(page).fill('即将被恢复的修改');
  await bodyField(page).fill('临时内容');
  await nav(page, '删除选中素材').click();
  await importBackup(page, bytes);
  await expect(page.getByRole('status').filter({ hasText: '备份已恢复。' })).toBeVisible();
  await expect(titleField(page)).toHaveValue('备份里的山与水');
  await expect(bodyField(page)).toHaveValue('这段随笔与兰草一起备份。');
  await expect(page.getByTestId('paper-object')).toHaveCount(objectCount);
  await expectSaveComplete(page);
  await page.reload();
  await openBook(page);
  await expect(titleField(page)).toHaveValue('备份里的山与水');
  await expect(page.getByTestId('paper-object')).toHaveCount(objectCount);
});

test('畸形 JSON 和外部照片备份被拒绝，当前记录保持完整', async ({ page }) => {
  await titleField(page).fill('不能被损坏的这一页');
  await expectSaved(page, '不能被损坏的这一页');
  await importBackup(page, Buffer.from('{"broken":'));
  await expect(page.getByText('无法读取备份，请选择一日手账导出的 JSON 文件', { exact: true })).toBeVisible();
  await expect(titleField(page)).toHaveValue('不能被损坏的这一页');
  await addPhoto(page);
  const safeBytes = await downloadBackup(page);
  const unsafe = JSON.parse(safeBytes.toString('utf8')) as unknown;
  let changed = 0;
  const replacePhoto = (value: unknown) => {
    if (Array.isArray(value)) value.forEach(replacePhoto);
    else if (value !== null && typeof value === 'object') {
      for (const [key, child] of Object.entries(value)) {
        if (typeof child === 'string' && /^data:image\//.test(child)) {
          (value as Record<string, unknown>)[key] = 'https://example.invalid/unsafe-photo.png';
          changed++;
        } else replacePhoto(child);
      }
    }
  };
  replacePhoto(unsafe);
  expect(changed).toBeGreaterThan(0);
  const externalRequests: string[] = [];
  page.on('request', request => {
    if (request.url().includes('example.invalid')) externalRequests.push(request.url());
  });
  await importBackup(page, Buffer.from(JSON.stringify(unsafe)), 'unsafe-photo.json');
  await expect(page.getByText('照片必须为内嵌的 PNG、JPEG 或 WebP 图片', { exact: true })).toBeVisible();
  await expect(titleField(page)).toHaveValue('不能被损坏的这一页');
  await expect(page.getByTestId('paper-object').last().locator('img')).toHaveAttribute('src', /^data:image\//);
  expect(externalRequests).toEqual([]);
  await expectSaveComplete(page);
  await page.reload();
  await openBook(page);
  await expect(titleField(page)).toHaveValue('不能被损坏的这一页');
});

test.describe('手机触摸', () => {
test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

test('390px 手机页面没有横向溢出，贴纸拖动仍落在纸面内', async ({ page }) => {
  await expect(page.getByTestId('journal-paper')).toBeVisible();
  await expect(nav(page, '展开素材托盘')).toBeVisible();
  await expect(nav(page, '添加贴纸：白花枝')).toBeHidden();
  const overflow = () => page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  const before = await overflow();
  expect(before.document).toBeLessThanOrEqual(before.viewport + 1);
  expect(before.body).toBeLessThanOrEqual(before.viewport + 1);
  const object = await addSticker(page);
  const handle = await object.getByTestId('object-resize-handle').boundingBox();
  expect(handle).not.toBeNull();
  expect(handle!.width).toBeGreaterThanOrEqual(43);
  expect(handle!.height).toBeGreaterThanOrEqual(43);
  const movement = await dragObject(page, object, 30, 32, true);
  expect(Math.abs(movement.after.x - movement.before.x - 30)).toBeLessThan(3);
  expect(Math.abs(movement.after.y - movement.before.y - 32)).toBeLessThan(3);
  const beforeClamp = await readObject(object);
  const clamped = await dragObject(page, object, 300, 300, true);
  const afterClamp = await readObject(object);
  expect(afterClamp.width).toBe(beforeClamp.width);
  expect(afterClamp.height).toBe(beforeClamp.height);
  const paper = await page.getByTestId('journal-paper').boundingBox();
  expect(paper).not.toBeNull();
  expect(clamped.after.x).toBeGreaterThanOrEqual(paper!.x - 1);
  expect(clamped.after.y).toBeGreaterThanOrEqual(paper!.y - 1);
  expect(clamped.after.x + clamped.after.width).toBeLessThanOrEqual(paper!.x + paper!.width + 1);
  expect(clamped.after.y + clamped.after.height).toBeLessThanOrEqual(paper!.y + paper!.height + 1);
  await expectEdgeHandleAvailable(object);
  const rotation = page.getByRole('slider', { name: '旋转角度', exact: true });
  for (let step = 0; step < 10; step++) await rotation.press('ArrowRight');
  await expect(rotation).toHaveValue('10');
  await expectEdgeHandleAvailable(object);
  await nav(page, '今日一页').click();
  const collapse = nav(page, '收起素材托盘');
  if (await collapse.isVisible()) await collapse.click();
  await screenshot(page, 'mobile-editor');
  await nav(page, '编辑文字').click();
  await ensureTrayExpanded(page);
  const mobileTitle = page.getByRole('textbox', { name: '编辑标题', exact: true });
  const mobileBody = page.getByRole('textbox', { name: '编辑随笔', exact: true });
  await expect(mobileTitle).toBeVisible();
  expect(await mobileTitle.evaluate(element => Number.parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(16);
  expect(await mobileBody.evaluate(element => Number.parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(16);
  await mobileTitle.fill('手机里的一页');
  await mobileBody.fill('坐在窗边，写下这一天。\n标题和随笔也同步到纸页。');
  await expect(titleField(page)).toHaveValue('手机里的一页');
  await expect(bodyField(page)).toHaveValue('坐在窗边，写下这一天。\n标题和随笔也同步到纸页。');
  await expectSaved(page, '标题和随笔也同步到纸页');
  await screenshot(page, 'mobile-text-editor');
  await nav(page, '我的手账').click();
  const books = await overflow();
  expect(books.document).toBeLessThanOrEqual(books.viewport + 1);
  await nav(page, '月历回顾').click();
  const calendar = await overflow();
  expect(calendar.document).toBeLessThanOrEqual(calendar.viewport + 1);
});
});

test('实际单文件 HTML 断网后使用贴纸并导出 PNG', async ({ browser, baseURL }) => {
  const htmlPath = resolve('release/yiri-journal.html');
  const htmlBytes = await readFile(htmlPath);
  const html = htmlBytes.toString('utf8');
  expect(html.length).toBeGreaterThan(50_000);
  expect(html).toContain('data:');
  expect(baseURL).toBeTruthy();
  const htmlURL = new URL('/yiri-journal.html', baseURL).href;
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 }, acceptDownloads: true,
  });
  const portable = await context.newPage();
  const readPortableResponse = await capturePortableDocument(context, portable);
  const errors = watchErrors(portable);
  const assetRequests: string[] = [];
  portable.on('request', request => {
    if (/^https?:/.test(request.url()) && (!request.isNavigationRequest() || request.url() !== htmlURL)) assetRequests.push(request.url());
  });
  try {
    const response = await portable.goto(htmlURL);
    expect(response?.status()).toBe(200);
    expect((await readPortableResponse(htmlURL)).equals(htmlBytes), 'The browser must execute the exact bytes in the release HTML.').toBe(true);
    await openBook(portable);
    await expectArtReady(portable);
    await titleField(portable).fill('同一 HTML 地址的记录');
    await expectSaved(portable, '同一 HTML 地址的记录');
    await portable.reload();
    await openBook(portable);
    await expectArtReady(portable);
    await expect(titleField(portable)).toHaveValue('同一 HTML 地址的记录');
    await portable.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all(Array.from(document.images, image => image.decode()));
    });
    expect(assetRequests, 'The single HTML file must embed its scripts, styles, fonts, and images.').toEqual([]);
    const offlineRequests: string[] = [];
    portable.on('request', request => {
      if (/^https?:/.test(request.url())) offlineRequests.push(request.url());
    });
    await context.setOffline(true);
    await context.route('**/*', route => route.abort('internetdisconnected'));
    expect(await portable.evaluate(() => navigator.onLine)).toBe(false);
    await titleField(portable).fill('离线的一页');
    await bodyField(portable).fill('没有网络，也能保存和制作手账。');
    const undecorated = await downloadPNG(portable);
    const sticker = await addSticker(portable);
    await expect(sticker.locator('img')).toBeVisible();
    await expect(sticker.locator('img')).toHaveAttribute('src', /^data:image\/png;base64,/);
    await expect.poll(() => sticker.locator('img').evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    const region = await sticker.evaluate(element => {
      const style = (element as HTMLElement).style;
      return { x: Number.parseFloat(style.left) * 2, y: Number.parseFloat(style.top) * 2, width: Number.parseFloat(style.width) * 2, height: Number.parseFloat(style.height) * 2 };
    });
    const decorated = await downloadPNG(portable);
    expect(await changedPNGRegion(portable, undecorated, decorated, region), 'The actual exported PNG must include the newly added PNG sticker.').toBeGreaterThan(100);
    await addPhoto(portable);
    const output = await exportPNG(portable);
    expect(output.width).toBe(1280);
    expect(output.height).toBe(1680);
    expect(output.redPixels).toBeGreaterThan(100);
    await expectSaved(portable, '离线的一页');
    await expectSaveComplete(portable);
    await expect(titleField(portable)).toHaveValue('离线的一页');
    expect(offlineRequests, 'Offline editing and export must not request any HTTP resource.').toEqual([]);
    expect(errors, 'Offline rendering and export must not produce browser errors.').toEqual([]);
  } finally {
    await context.close();
  }
});

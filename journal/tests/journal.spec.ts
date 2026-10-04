import { test, expect, type Download, type Locator, type Page } from '@playwright/test';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const browserErrors = new WeakMap<Page, string[]>();
const titleField = (page: Page) => page.getByRole('textbox', { name: '页面标题', exact: true });
const bodyField = (page: Page) => page.getByRole('textbox', { name: '今日随笔', exact: true });
const nav = (page: Page, name: string) => page.getByRole('button', {
  name: name === '今日一页' ? /^今日一页/ : name, exact: true,
});

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
  return page.getByTestId('paper-object').last();
}

async function addSticker(page: Page) {
  const before = await page.getByTestId('paper-object').count();
  await nav(page, '添加贴纸：兰草').click();
  await expect(page.getByTestId('paper-object')).toHaveCount(before + 1);
  return page.getByTestId('paper-object').last();
}

async function dragObject(page: Page, object: Locator, dx: number, dy: number, touch = false) {
  await object.scrollIntoViewIfNeeded();
  const before = await object.boundingBox();
  expect(before).not.toBeNull();
  const x = before!.x + before!.width / 2;
  const y = before!.y + before!.height / 2;
  if (touch) {
    const session = await page.context().newCDPSession(page);
    const viewport = page.viewportSize()!;
    const endX = Math.min(viewport.width - 5, Math.max(5, x + dx));
    const endY = Math.min(viewport.height - 5, Math.max(5, y + dy));
    try {
      await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 7 }] });
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
    for (let index = 0; index < pixels.length; index += 4) {
      if (pixels[index] > 210 && pixels[index + 1] < 70 && pixels[index + 2] < 110 && pixels[index + 3] > 240) redPixels++;
      if (pixels[index + 3] < 255) transparentPixels++;
    }
    return { width: canvas.width, height: canvas.height, redPixels, transparentPixels, cornerAlpha: pixels[3] };
  }, bytes.toString('base64'));
}

async function downloadPNG(page: Page) {
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
  await expectSaveComplete(page);
  await page.locator('.toast').waitFor({ state: 'hidden' });
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
  await mkdir(resolve('test-results/preview'), { recursive: true });
  await page.screenshot({ path: resolve(`test-results/preview/${name}.png`), fullPage: true });
}

test.beforeEach(async ({ page }) => {
  watchErrors(page);
  await page.goto('/');
  await expect(page.getByTestId('journal-paper')).toBeVisible();
});

test.afterEach(async ({ page }) => {
  expect(browserErrors.get(page), 'Every browser console error and uncaught exception is a test failure.').toEqual([]);
});

test('标题和随笔自动保存，刷新后仍可编辑', async ({ page }) => {
  await titleField(page).fill('风吹过书页');
  await bodyField(page).fill('今天绕过河边，记下桂花香。\n明天再来看一眼。');
  await expectSaved(page, '今天绕过河边');
  await page.reload();
  await expect(titleField(page)).toHaveValue('风吹过书页');
  await expect(bodyField(page)).toHaveValue('今天绕过河边，记下桂花香。\n明天再来看一眼。');
  await titleField(page).fill('风与桂花');
  await expectSaved(page, '风与桂花');
  await screenshot(page, 'desktop-editor');
});

test('心情和待办完成状态保存到当天', async ({ page }) => {
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
  await expect(titleField(page)).toBeVisible();
  await titleField(page).fill('月初的兰草');
  await bodyField(page).fill('这一天只属于月初。');
  await expectSaved(page, '这一天只属于月初');
  await nav(page, '月历回顾').click();
  await expect(nav(page, date!)).toHaveClass(/has-entry/);
  await nav(page, otherDate!).click();
  await expect(titleField(page)).not.toHaveValue('月初的兰草');
  await titleField(page).fill('第二日的茶');
  await expectSaved(page, '第二日的茶');
  await nav(page, '月历回顾').click();
  await nav(page, date!).click();
  await expect(titleField(page)).toHaveValue('月初的兰草');
  await expect(bodyField(page)).toHaveValue('这一天只属于月初。');
  await expectSaveComplete(page);
  await page.reload();
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
  await expect(restored).toHaveCount(0);
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
  await expect(titleField(page)).toHaveValue('不能被损坏的这一页');
});

test.describe('手机触摸', () => {
test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

test('390px 手机页面没有横向溢出，贴纸拖动仍落在纸面内', async ({ page }) => {
  await expect(page.getByTestId('journal-paper')).toBeVisible();
  const overflow = () => page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  const before = await overflow();
  expect(before.document).toBeLessThanOrEqual(before.viewport + 1);
  expect(before.body).toBeLessThanOrEqual(before.viewport + 1);
  const object = await addSticker(page);
  const movement = await dragObject(page, object, 30, 32, true);
  expect(Math.abs(movement.after.x - movement.before.x - 30)).toBeLessThan(3);
  expect(Math.abs(movement.after.y - movement.before.y - 32)).toBeLessThan(3);
  const clamped = await dragObject(page, object, 300, 300, true);
  const paper = await page.getByTestId('journal-paper').boundingBox();
  expect(paper).not.toBeNull();
  expect(clamped.after.x).toBeGreaterThanOrEqual(paper!.x - 1);
  expect(clamped.after.y).toBeGreaterThanOrEqual(paper!.y - 1);
  expect(clamped.after.x + clamped.after.width).toBeLessThanOrEqual(paper!.x + paper!.width + 1);
  expect(clamped.after.y + clamped.after.height).toBeLessThanOrEqual(paper!.y + paper!.height + 1);
  await nav(page, '今日一页').click();
  await screenshot(page, 'mobile-editor');
  await nav(page, '编辑文字').click();
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
  const errors = watchErrors(portable);
  const assetRequests: string[] = [];
  portable.on('request', request => {
    if (/^https?:/.test(request.url()) && (!request.isNavigationRequest() || request.url() !== htmlURL)) assetRequests.push(request.url());
  });
  try {
    const response = await portable.goto(htmlURL);
    expect(response?.status()).toBe(200);
    expect((await response!.body()).equals(htmlBytes), 'The browser must execute the exact bytes in the release HTML.').toBe(true);
    await expect(portable.getByTestId('journal-paper')).toBeVisible();
    await titleField(portable).fill('同一 HTML 地址的记录');
    await expectSaved(portable, '同一 HTML 地址的记录');
    await portable.reload();
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
    await expect(sticker.locator('img')).toHaveAttribute('src', /^data:image\/svg\+xml/);
    await expect.poll(() => sticker.locator('img').evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    const region = await sticker.evaluate(element => {
      const style = (element as HTMLElement).style;
      return { x: Number.parseFloat(style.left) * 2, y: Number.parseFloat(style.top) * 2, width: Number.parseFloat(style.width) * 2, height: Number.parseFloat(style.height) * 2 };
    });
    const decorated = await downloadPNG(portable);
    expect(await changedPNGRegion(portable, undecorated, decorated, region), 'The actual exported PNG must include the newly added SVG sticker.').toBeGreaterThan(100);
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

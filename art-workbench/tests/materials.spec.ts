import { expect, test, type Download, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { materials } from '../src/data/materials';
import { capturePortableDocument } from './portable-capture';

const errorsForPage = new WeakMap<Page, string[]>();
const categoryLabels = ['icon', 'pattern', 'frame', 'texture', 'interface', 'prop', 'scene'];

test.beforeEach(async ({ page, context }) => {
  const errors: string[] = [];
  const observe = (observed: Page) => {
    observed.on('pageerror', error => errors.push(error.message));
    observed.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  };
  observe(page);
  context.on('page', observe);
  errorsForPage.set(page, errors);
  await mkdir('test-results', { recursive: true });
});

test.afterEach(async ({ page }, testInfo) => {
  const errors = errorsForPage.get(page) ?? [];
  await testInfo.attach('material-browser-errors', { body: JSON.stringify(errors), contentType: 'application/json' });
  expect(errors, 'Materials must not cause browser exceptions or console errors').toEqual([]);
});

async function downloadBytes(download: Download) {
  expect(await download.failure()).toBeNull();
  const filename = await download.path();
  expect(filename).not.toBeNull();
  return readFile(filename!);
}

async function count(page: Page) {
  const encoded = await page.getByTestId('material-result-count').getAttribute('data-count');
  expect(encoded).toMatch(/^\d+$/);
  return Number(encoded);
}

async function loadAll(page: Page) {
  const button = page.getByRole('button', { name: '加载更多素材', exact: true });
  while (await button.isVisible()) await button.click();
}

async function openMaterial(page: Page, id: string) {
  await page.locator(`[data-testid="material-card"][data-material-id="${id}"]`).getByTestId('material-open').click();
  const detail = page.getByTestId('material-dialog');
  await expect(detail).toBeVisible();
  await expect(detail).toHaveAttribute('data-material-id', id);
  return detail;
}

async function noOverflow(page: Page) {
  const sizes = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
  expect(Math.max(sizes.document, sizes.body), JSON.stringify(sizes)).toBeLessThanOrEqual(sizes.viewport + 1);
}

/** Read central and local headers and independently recompute every CRC. */
function unpackStoredZip(buffer: Buffer) {
  expect(buffer.readUInt32LE(buffer.length - 22)).toBe(0x06054b50);
  const count = buffer.readUInt16LE(buffer.length - 12);
  expect(buffer.readUInt16LE(buffer.length - 14)).toBe(count);
  const centralSize = buffer.readUInt32LE(buffer.length - 10);
  const centralStart = buffer.readUInt32LE(buffer.length - 6);
  expect(centralStart + centralSize).toBe(buffer.length - 22);
  let cursor = centralStart;
  const files = new Map<string, Buffer>();
  for (let index = 0; index < count; index += 1) {
    expect(buffer.readUInt32LE(cursor)).toBe(0x02014b50);
    expect(buffer.readUInt16LE(cursor + 10)).toBe(0);
    const nameLength = buffer.readUInt16LE(cursor + 28);
    const name = buffer.subarray(cursor + 46, cursor + 46 + nameLength).toString('utf8');
    const local = buffer.readUInt32LE(cursor + 42);
    expect(buffer.readUInt32LE(local)).toBe(0x04034b50);
    expect(buffer.readUInt16LE(local + 8)).toBe(0);
    const localNameLength = buffer.readUInt16LE(local + 26);
    expect(buffer.subarray(local + 30, local + 30 + localNameLength).toString('utf8')).toBe(name);
    const size = buffer.readUInt32LE(cursor + 24);
    expect(buffer.readUInt32LE(cursor + 20)).toBe(size);
    expect(buffer.readUInt32LE(local + 18)).toBe(size);
    const start = local + 30 + localNameLength + buffer.readUInt16LE(local + 28);
    const content = buffer.subarray(start, start + size);
    expect(content.length).toBe(size);
    let crc = 0xffffffff;
    for (const byte of content) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
    crc = (crc ^ 0xffffffff) >>> 0;
    expect(buffer.readUInt32LE(cursor + 16), `CRC of ${name}`).toBe(crc);
    expect(buffer.readUInt32LE(local + 14)).toBe(crc);
    expect(files.has(name)).toBe(false);
    expect(name).not.toMatch(/(^\/|\.\.|\\)/);
    files.set(name, content);
    cursor += 46 + nameLength + buffer.readUInt16LE(cursor + 30) + buffer.readUInt16LE(cursor + 32);
  }
  expect(cursor).toBe(centralStart + centralSize);
  return files;
}

test('192 usable assets offer working categories, all 48 traditions, game/App and material-property filters', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/#assets');
  await expect(page.getByTestId('material-result-count')).toHaveAttribute('data-count', '192');
  for (const category of categoryLabels) {
    await page.getByRole('combobox', { name: '素材分类', exact: true }).selectOption(category);
    expect(await count(page)).toBe(materials.filter(material => material.category === category).length);
    await expect(page.getByTestId('material-card').first()).toHaveAttribute('data-category', category);
  }
  await page.getByRole('combobox', { name: '素材分类', exact: true }).selectOption({ index: 0 });
  const tradition = page.getByRole('combobox', { name: '美学路线', exact: true });
  const traditionOptions = await tradition.locator('option').evaluateAll(options => options.slice(1).map(option => (option as HTMLOptionElement).value));
  expect(traditionOptions).toHaveLength(48);
  for (const id of traditionOptions) {
    await tradition.selectOption(id);
    const expected = materials.filter(material => material.traditionIds.includes(id));
    expect(expected.length, `A research tradition needs actual material: ${id}`).toBeGreaterThan(0);
    expect(await count(page)).toBe(expected.length);
    await loadAll(page);
    expect(await page.getByTestId('material-card').evaluateAll(cards => cards.map(card => card.getAttribute('data-material-id')))).toEqual(expected.map(material => material.id));
  }
  await tradition.selectOption({ index: 0 });
  const family = page.getByRole('combobox', { name: '素材家族', exact: true });
  await family.selectOption(materials[0].family);
  expect(await count(page)).toBe(materials.filter(material => material.family === materials[0].family).length);
  await family.selectOption({ index: 0 });
  for (const target of ['game', 'app'] as const) {
    await page.getByRole('combobox', { name: '使用方向', exact: true }).selectOption(target);
    expect(await count(page)).toBe(materials.filter(material => material.targets.includes(target)).length);
  }
  await page.getByRole('combobox', { name: '使用方向', exact: true }).selectOption({ index: 0 });
  await page.getByRole('checkbox', { name: '仅透明素材', exact: true }).check();
  expect(await count(page)).toBe(materials.filter(material => material.transparent).length);
  await page.getByRole('checkbox', { name: '仅可平铺素材', exact: true }).check();
  expect(await count(page)).toBe(materials.filter(material => material.transparent && material.tileable).length);
  await page.getByRole('checkbox', { name: '仅透明素材', exact: true }).uncheck();
  expect(await count(page)).toBe(materials.filter(material => material.tileable).length);
  await page.getByRole('checkbox', { name: '仅可平铺素材', exact: true }).uncheck();
  await page.getByRole('textbox', { name: '搜索素材', exact: true }).fill('没有这个素材-xyz-098');
  await expect(page.getByTestId('material-card')).toHaveCount(0);
  expect(await count(page)).toBe(0);
  await page.getByRole('textbox', { name: '搜索素材', exact: true }).fill('');
  expect(await count(page)).toBe(192);
  await loadAll(page);
  await expect(page.getByTestId('material-card')).toHaveCount(192);
  await page.getByTestId('material-card').locator('img').evaluateAll(images => images.forEach(image => { (image as HTMLImageElement).loading = 'eager'; }));
  await expect.poll(() => page.getByTestId('material-card').locator('img').evaluateAll(images => images.every(image => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
  const validity = await page.getByTestId('material-card').locator('img').evaluateAll(images => images.map(image => {
    const element = image as HTMLImageElement;
    return { complete: element.complete, width: element.naturalWidth, source: element.getAttribute('src') };
  }));
  expect(validity).toHaveLength(192);
  expect(validity.every(image => image.complete && image.width > 0 && image.source?.startsWith('data:image/svg+xml'))).toBe(true);
  // Every downloaded SVG must parse in the same browser that renders the library.
  const invalidSVGs = await page.evaluate(svgs => svgs.map(({ id, svg }) => ({ id, error: new DOMParser().parseFromString(svg, 'image/svg+xml').querySelector('parsererror')?.textContent })).filter(item => item.error), materials.map(({ id, svg }) => ({ id, svg })));
  expect(invalidSVGs).toEqual([]);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.screenshot({ path: 'test-results/material-library-desktop.png', fullPage: false });
});

test('favorites and selected materials survive reload and a native detail dialog closes with Escape', async ({ page }) => {
  await page.goto('/#assets');
  const first = materials[0];
  const card = page.locator(`[data-testid="material-card"][data-material-id="${first.id}"]`);
  await card.getByRole('button', { name: `收藏${first.name}`, exact: true }).click();
  await card.getByRole('checkbox', { name: `选择${first.name}`, exact: true }).check();
  await page.reload();
  await expect(card.getByRole('button', { name: `收藏${first.name}`, exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(card.getByRole('checkbox', { name: `选择${first.name}`, exact: true })).toBeChecked();
  await page.getByRole('checkbox', { name: /^仅看收藏/ }).check();
  expect(await count(page)).toBe(1);
  await expect(page.getByTestId('material-card')).toHaveCount(1);
  const dialog = await openMaterial(page, first.id);
  expect(await dialog.evaluate(element => element instanceof HTMLDialogElement && element.open && element.matches(':modal'))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(card.getByTestId('material-open')).toBeFocused();
});

test('SVG and PNG buttons download actual editable vectors and correctly sized transparent raster pixels', async ({ page }) => {
  await page.goto('/#assets');
  const material = materials[0];
  expect(material.transparent).toBe(true);
  await openMaterial(page, material.id);
  const svgPromise = page.waitForEvent('download');
  await page.getByTestId('material-download-svg').click();
  const svgDownload = await svgPromise;
  expect(svgDownload.suggestedFilename()).toBe(`${material.id}.svg`);
  const svg = (await downloadBytes(svgDownload)).toString('utf8');
  expect(svg).toBe(material.svg);
  const parse = await page.evaluate(svg => {
    const document = new DOMParser().parseFromString(svg, 'image/svg+xml');
    return { error: document.querySelector('parsererror')?.textContent, namespace: document.documentElement.namespaceURI };
  }, svg);
  expect(parse.error).toBeUndefined();
  expect(parse.namespace).toBe('http://www.w3.org/2000/svg');
  await page.getByTestId('material-png-size').selectOption('512');
  const pngPromise = page.waitForEvent('download');
  await page.getByTestId('material-download-png').click();
  const pngDownload = await pngPromise;
  expect(pngDownload.suggestedFilename()).toMatch(new RegExp(`^${material.id}-\\d+x\\d+\\.png$`));
  const png = await downloadBytes(pngDownload);
  expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  expect(png.subarray(12, 16).toString('ascii')).toBe('IHDR');
  const width = png.readUInt32BE(16), height = png.readUInt32BE(20);
  expect(Math.max(width, height)).toBe(512);
  expect(width / height).toBeCloseTo(material.width / material.height, 2);
  const pixelProof = await page.evaluate(async encoded => {
    const image = new Image();
    image.src = `data:image/png;base64,${encoded}`;
    await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d')!; context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let visible = 0, transparent = 0;
    for (let index = 3; index < pixels.length; index += 4) { if (pixels[index] > 0) visible += 1; if (pixels[index] === 0) transparent += 1; }
    return { width: image.naturalWidth, height: image.naturalHeight, corner: pixels[3], visible, transparent };
  }, png.toString('base64'));
  expect(pixelProof.width).toBe(width); expect(pixelProof.height).toBe(height);
  expect(pixelProof.corner).toBe(0); expect(pixelProof.visible).toBeGreaterThan(100); expect(pixelProof.transparent).toBeGreaterThan(100);
});

test('tileable assets render periodic pixels without a gross border jump and the repeat preview changes actual paint', async ({ page }, testInfo) => {
  await page.goto('/#assets');
  const tileable = materials.filter(material => material.tileable);
  expect(tileable.length).toBeGreaterThanOrEqual(40);
  const seams = await page.evaluate(async list => {
    const results: { id: string; edgeX: number; edgeY: number; adjacentX: number; adjacentY: number }[] = [];
    for (const item of list) {
      const image = new Image();
      image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(item.svg)}`;
      await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = item.width; canvas.height = item.height;
      const context = canvas.getContext('2d')!; context.drawImage(image, 0, 0);
      const data = context.getImageData(0, 0, item.width, item.height).data;
      const pixel = (x: number, y: number) => {
        const index = (y * item.width + x) * 4, alpha = data[index + 3];
        return [data[index] * alpha / 255, data[index + 1] * alpha / 255, data[index + 2] * alpha / 255, alpha];
      };
      const difference = (a: number[], b: number[]) => a.reduce((sum, value, index) => sum + Math.abs(value - b[index]), 0) / 4;
      let edgeX = 0, edgeY = 0, adjacentX = 0, adjacentY = 0;
      for (let y = 0; y < item.height; y += 1) {
        edgeX += difference(pixel(0, y), pixel(item.width - 1, y));
        adjacentX += (difference(pixel(1, y), pixel(2, y)) + difference(pixel(item.width - 3, y), pixel(item.width - 2, y))) / 2;
      }
      for (let x = 0; x < item.width; x += 1) {
        edgeY += difference(pixel(x, 0), pixel(x, item.height - 1));
        adjacentY += (difference(pixel(x, 1), pixel(x, 2)) + difference(pixel(x, item.height - 3), pixel(x, item.height - 2))) / 2;
      }
      results.push({ id: item.id, edgeX: edgeX / item.height, edgeY: edgeY / item.width, adjacentX: adjacentX / item.height, adjacentY: adjacentY / item.width });
    }
    return results;
  }, tileable.map(({ id, svg, width, height }) => ({ id, svg, width, height })));
  await testInfo.attach('tileable-pixel-seams', { body: JSON.stringify({ scope: 'Premultiplied RGBA opposing edges against ordinary adjacent pixels. Detects gross border discontinuity; does not claim identical pixel samples on continuous antialiased lines.', samples: seams }, null, 2), contentType: 'application/json' });
  for (const seam of seams) {
    expect(seam.edgeX, `${seam.id}: horizontal seam`).toBeLessThanOrEqual(Math.max(8, seam.adjacentX * 3 + 2));
    expect(seam.edgeY, `${seam.id}: vertical seam`).toBeLessThanOrEqual(Math.max(8, seam.adjacentY * 3 + 2));
  }
  const material = tileable.find(item => item.category === 'pattern')!;
  await page.getByRole('combobox', { name: '素材分类', exact: true }).selectOption('pattern');
  await openMaterial(page, material.id);
  const preview = page.getByTestId('material-large-preview');
  const single = await preview.screenshot();
  await page.getByRole('checkbox', { name: '查看平铺', exact: true }).check();
  await expect(preview.locator('img')).toHaveCount(0);
  expect(await preview.evaluate(element => getComputedStyle(element).backgroundImage)).toContain('data:image/svg+xml');
  expect((await preview.screenshot()).equals(single), 'Repeat control must alter the rendered preview, not only its label').toBe(false);
});

test('selected and filtered ZIP downloads contain exactly their real SVG subset with valid CRCs and manifests', async ({ page }) => {
  await page.goto('/#assets');
  const selected = [materials[0], materials.find(material => material.category === 'frame')!];
  for (const material of selected) {
    await page.getByRole('combobox', { name: '素材分类', exact: true }).selectOption(material.category);
    await page.locator(`[data-testid="material-card"][data-material-id="${material.id}"]`).getByRole('checkbox', { name: `选择${material.name}`, exact: true }).check();
  }
  const selectedPromise = page.waitForEvent('download');
  await page.getByTestId('material-pack').click();
  const archive = unpackStoredZip(await downloadBytes(await selectedPromise));
  const manifest = JSON.parse(archive.get('manifest.json')!.toString('utf8'));
  expect(manifest.kind).toBe('guanwu-material-pack');
  expect(manifest.count).toBe(2);
  expect(manifest.materials.map((material: { id: string }) => material.id).sort()).toEqual(selected.map(material => material.id).sort());
  expect(archive.size).toBe(4);
  for (const material of selected) expect(archive.get(`svg/${material.id}.svg`)!.toString('utf8')).toBe(material.svg);
  const filtered = materials.filter(material => material.category === 'frame');
  const filteredPromise = page.waitForEvent('download');
  await page.getByTestId('material-filtered-pack').click();
  const filteredArchive = unpackStoredZip(await downloadBytes(await filteredPromise));
  const filteredManifest = JSON.parse(filteredArchive.get('manifest.json')!.toString('utf8'));
  expect(filteredManifest.count).toBe(filtered.length);
  expect(filteredManifest.materials.map((material: { id: string }) => material.id)).toEqual(filtered.map(material => material.id));
  expect(filteredArchive.size).toBe(filtered.length + 2);
});

test('all ten original reference boards visibly decode and download byte-identical PNG files', async ({ page }) => {
  await page.goto('/#assets');
  await page.getByRole('tab', { name: /^参考图库/ }).click();
  const cards = page.getByTestId('reference-card');
  await expect(cards).toHaveCount(10);
  const boards = await cards.evaluateAll(elements => elements.map(element => ({ id: element.getAttribute('data-reference-id')!, filename: element.getAttribute('data-reference-filename')! })));
  expect(new Set(boards.map(board => board.id)).size).toBe(10);
  const hashes = new Set<string>();
  for (const board of boards) {
    expect(board.filename).toMatch(/^[a-z0-9-]+\.png$/);
    const card = page.locator(`[data-testid="reference-card"][data-reference-id="${board.id}"]`);
    await card.scrollIntoViewIfNeeded();
    await expect.poll(() => card.locator('img').evaluate(image => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0)).toBe(true);
    await card.getByTestId('reference-open').click();
    const downloading = page.waitForEvent('download');
    await page.getByTestId('reference-download').click();
    const download = await downloading;
    expect(download.suggestedFilename()).toBe(board.filename);
    const bytes = await downloadBytes(download);
    expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
    expect(Math.min(bytes.readUInt32BE(16), bytes.readUInt32BE(20))).toBeGreaterThanOrEqual(768);
    expect(Math.max(bytes.readUInt32BE(16), bytes.readUInt32BE(20))).toBeGreaterThanOrEqual(1536);
    expect(bytes.equals(await readFile(path.resolve('src/assets', board.filename.replace(/^guanwu-/, '')))), board.filename).toBe(true);
    hashes.add(createHash('sha256').update(bytes).digest('hex'));
    await page.keyboard.press('Escape');
  }
  expect(hashes.size, 'Ten boards must contain ten distinct image files').toBe(10);
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await page.screenshot({ path: 'test-results/material-reference-gallery.png', fullPage: true });
});

test('using an App material keeps its provenance through editing, project save, export and restore', async ({ page }) => {
  const material = materials.find(item => item.targets.includes('game') && item.targets.includes('app') && item.traditionIds.length > 1)!;
  expect(material).toBeDefined();
  const chosenTradition = material.traditionIds.at(-1)!;
  await page.goto('/#assets');
  await page.getByRole('combobox', { name: '使用方向', exact: true }).selectOption('app');
  await page.getByRole('combobox', { name: '素材分类', exact: true }).selectOption(material.category);
  await page.getByRole('combobox', { name: '美学路线', exact: true }).selectOption(chosenTradition);
  await loadAll(page);
  await openMaterial(page, material.id);
  await page.getByTestId('material-use').click();
  await expect(page.getByTestId('workbench')).toBeVisible();
  await expect(page.getByTestId('target-app')).toHaveAttribute('aria-pressed', 'true');
  const subject = '从真实素材继续设计的收藏应用入口';
  await page.getByTestId('workbench-subject').fill(subject);
  await page.getByTestId('workbench-detail').fill('42');
  await page.getByTestId('brief-tab-tokens').click();
  const tokens = JSON.parse(await page.getByTestId('brief-tokens').innerText());
  expect(tokens['material.id']).toBe(material.id);
  expect(tokens['material.filename']).toBe(`${material.id}.svg`);
  expect(tokens['material.width']).toBe(String(material.width));
  expect(tokens['material.height']).toBe(String(material.height));
  expect(tokens['source.traditionId']).toBe(chosenTradition);
  expect(tokens['rendering.detail']).toBe('42%');
  await page.getByTestId('brief-save').click();
  await page.getByRole('navigation', { name: '主要导航' }).getByRole('button', { name: /^项目册(?:\s*\d+)?$/ }).click();
  const exporting = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出项目册', exact: true }).click();
  const project = JSON.parse((await downloadBytes(await exporting)).toString('utf8')).projects[0];
  expect(project.brief.tokens).toEqual(tokens);
  expect(project.input.subject).toBe(subject);
  expect(project.input.traditionId).toBe(chosenTradition);
  await page.reload();
  await page.getByRole('button', { name: '继续编辑', exact: true }).click();
  await page.getByTestId('brief-tab-tokens').click();
  expect(JSON.parse(await page.getByTestId('brief-tokens').innerText())).toEqual(tokens);
  await expect(page.getByTestId('workbench-subject')).toHaveValue(subject);
});

test('390px library filters, reference gallery and native asset details stay within the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#assets');
  await noOverflow(page);
  await page.getByRole('combobox', { name: '素材分类', exact: true }).selectOption('frame');
  const material = materials.find(item => item.category === 'frame')!;
  await openMaterial(page, material.id);
  await noOverflow(page);
  const box = await page.getByTestId('material-dialog').boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0); expect(box!.x + box!.width).toBeLessThanOrEqual(391);
  await page.screenshot({ path: 'test-results/material-library-mobile.png', fullPage: false });
  await page.keyboard.press('Escape');
  await page.getByRole('tab', { name: /^参考图库/ }).click();
  await noOverflow(page);
});

test('the byte-identical portable artifact filters and downloads vectors, PNGs, ZIPs and reference images fully offline', async ({ page, context }, testInfo) => {
  test.setTimeout(90_000);
  const portable = await readFile(path.resolve('release/guanwu-art-workbench.html'));
  const entry = new URL('/guanwu-art-workbench.html', process.env.BASE_URL ?? 'http://127.0.0.1:4173').href;
  const remoteRequests: string[] = [];
  let allowEntry = true;
  await context.route(/^https?:\/\//, async route => {
    if (allowEntry && route.request().isNavigationRequest() && route.request().url().split('#')[0] === entry) {
      allowEntry = false; await route.continue(); return;
    }
    remoteRequests.push(route.request().url()); await route.abort('internetdisconnected');
  });
  // Chromium's default inspector resource buffer is smaller than this
  // self-contained HTML. Enlarge response capture only; the real navigation,
  // exact byte comparison and subsequent network blocking remain unchanged.
  const capturedBody = await capturePortableDocument(context, page);
  const response = await page.goto(`${entry}#assets`);
  expect(response).not.toBeNull();
  expect((await capturedBody(entry)).equals(portable), 'Offline checks load the exact downloadable artifact').toBe(true);
  await context.setOffline(true);
  expect(await count(page)).toBe(192);
  await page.getByRole('combobox', { name: '素材分类', exact: true }).selectOption('pattern');
  await page.getByRole('checkbox', { name: '仅可平铺素材', exact: true }).check();
  expect(await count(page)).toBe(materials.filter(item => item.category === 'pattern' && item.tileable).length);
  const material = materials.find(item => item.category === 'pattern' && item.tileable)!;
  const card = page.locator(`[data-testid="material-card"][data-material-id="${material.id}"]`);
  await card.getByRole('checkbox', { name: `选择${material.name}`, exact: true }).check();
  const zipPromise = page.waitForEvent('download');
  await page.getByTestId('material-pack').click();
  const zip = unpackStoredZip(await downloadBytes(await zipPromise));
  expect(zip.get(`svg/${material.id}.svg`)!.toString('utf8')).toBe(material.svg);
  await openMaterial(page, material.id);
  const svgPromise = page.waitForEvent('download'); await page.getByTestId('material-download-svg').click();
  expect((await downloadBytes(await svgPromise)).toString('utf8')).toBe(material.svg);
  const pngPromise = page.waitForEvent('download'); await page.getByTestId('material-download-png').click();
  expect((await downloadBytes(await pngPromise)).subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  await page.keyboard.press('Escape');
  await page.getByRole('tab', { name: /^参考图库/ }).click();
  const boards = page.getByTestId('reference-card');
  await expect(boards).toHaveCount(10);
  for (const board of await boards.all()) {
    await board.scrollIntoViewIfNeeded();
    await expect.poll(() => board.locator('img').evaluate(image => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0)).toBe(true);
    expect(await board.locator('img').getAttribute('src')).toMatch(/^data:image\/png;base64,/);
  }
  const filename = await boards.first().getAttribute('data-reference-filename');
  await boards.first().getByTestId('reference-open').click();
  const boardPromise = page.waitForEvent('download'); await page.getByTestId('reference-download').click();
  expect((await downloadBytes(await boardPromise)).equals(await readFile(path.resolve('src/assets', filename!.replace(/^guanwu-/, ''))))).toBe(true);
  expect(remoteRequests, 'Embedded library assets and downloads must not request any HTTP(S) resource').toEqual([]);
  await testInfo.attach('offline-material-library', { body: JSON.stringify({ scope: 'Exact portable bytes over permitted HTTP, then context.setOffline(true) and all HTTP(S) blocked; file origin separately unverified by browser policy.', materials: 192, referenceBoards: 10, svg: material.id, png: true, zipCRC: true, remoteAssetRequests: remoteRequests.length }, null, 2), contentType: 'application/json' });
});

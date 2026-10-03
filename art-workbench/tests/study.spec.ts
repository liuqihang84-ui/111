import { expect, test, type Download, type Locator, type Page } from '@playwright/test';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const screenshotDirectory = path.resolve('test-results');
const recordedErrors = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page, context }) => {
  const errors: string[] = [];
  const observe = (observedPage: Page) => {
    observedPage.on('pageerror', error => errors.push(error.message));
    observedPage.on('console', message => {
      if (message.type() === 'error') errors.push(`${message.text()} @ ${message.location().url}`);
    });
  };
  observe(page);
  context.on('page', observe);
  recordedErrors.set(page, errors);
  await mkdir(screenshotDirectory, { recursive: true });
});

test.afterEach(async ({ page }, testInfo) => {
  const errors = recordedErrors.get(page) ?? [];
  await testInfo.attach('study-browser-errors', { body: JSON.stringify(errors, null, 2), contentType: 'application/json' });
  expect(errors, 'Deep study must not produce JavaScript exceptions or console errors').toEqual([]);
});

async function navigation(page: Page, name: string) {
  await page.getByRole('navigation', { name: '主要导航' }).getByRole('button', { name: new RegExp(`^${name}(?:\\s*\\d+)?$`) }).click();
}

async function downloadedText(download: Download) {
  expect(await download.failure()).toBeNull();
  const downloadPath = await download.path();
  expect(downloadPath).not.toBeNull();
  return readFile(downloadPath!, 'utf8');
}

async function screenshot(page: Page, filename: string) {
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.screenshot({ path: path.join(screenshotDirectory, filename), fullPage: true });
}

async function assertNoHorizontalOverflow(page: Page) {
  const layout = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
    protruding: [...document.querySelectorAll('body *')].filter(element => {
      const box = element.getBoundingClientRect();
      return box.width > 0 && box.right > window.innerWidth + 1 && getComputedStyle(element).position !== 'fixed';
    }).slice(0, 12).map(element => `${element.tagName}.${element.className}`),
  }));
  expect(Math.max(layout.document, layout.body), JSON.stringify(layout)).toBeLessThanOrEqual(layout.viewport + 1);
}

/** Compare the shapes that a browser actually draws, rather than changing labels. */
async function geometry(svg: Locator) {
  return svg.locator('path, rect, circle, ellipse, line, polyline, polygon, g').evaluateAll(elements => elements.map(element => ({
    tag: element.tagName,
    attrs: Object.fromEntries(['d', 'x', 'y', 'width', 'height', 'cx', 'cy', 'r', 'rx', 'ry', 'x1', 'x2', 'y1', 'y2', 'points', 'transform']
      .filter(name => element.hasAttribute(name)).map(name => [name, element.getAttribute(name)])),
  })));
}

async function values(svg: Locator): Promise<Record<string, number>> {
  const encoded = await svg.getAttribute('data-values');
  expect(encoded, 'The live A/B preview records its actual numeric parameters').not.toBeNull();
  return JSON.parse(encoded!);
}

async function selectLandscape(page: Page) {
  await page.goto('/#study');
  await expect(page.getByTestId('study-root')).toBeVisible();
  await page.getByTestId('study-tradition').selectOption('blue-green-landscape');
}

test('twelve deep dossiers expose distinct objects, three evidence levels and honest official source links', async ({ page }) => {
  await page.goto('/#study');
  const select = page.getByTestId('study-tradition');
  const options = await select.locator('option').evaluateAll(items => items.map(item => ({ id: (item as HTMLOptionElement).value, name: item.textContent ?? '' })));
  expect(options).toHaveLength(12);
  expect(new Set(options.map(option => option.id)).size).toBe(12);
  const dossierTitles: string[] = [];
  for (const option of options) {
    await select.selectOption(option.id);
    await page.getByTestId('study-tab-evidence').click();
    const title = await page.getByTestId('study-dossier-title').innerText();
    expect(title.trim().length).toBeGreaterThan(3);
    dossierTitles.push(title);
    const evidence = page.getByTestId('study-evidence');
    await expect(evidence).toContainText('历史');
    await expect(evidence).toContainText('解释');
    await expect(evidence).toContainText('转译');
    await expect(evidence).toContainText(/待核验|尚未核验/);
    const links = page.locator('[data-testid^="study-source-"]');
    expect(await links.count()).toBeGreaterThan(0);
    for (const link of await links.all()) await expect(link).toHaveAttribute('href', /^https:\/\//);
  }
  expect(new Set(dossierTitles).size).toBe(12);
  // Switching between distant media must replace the object study, not only its title.
  await select.selectOption('han-lacquer');
  const lacquerEvidence = await page.getByTestId('study-evidence').innerText();
  expect(lacquerEvidence).toMatch(/漆|马王堆/);
  await select.selectOption('dunhuang');
  const muralEvidence = await page.getByTestId('study-evidence').innerText();
  expect(muralEvidence).toMatch(/莫高|敦煌/);
  expect(muralEvidence).not.toEqual(lacquerEvidence);
});

test('single-variable A/B changes real SVG geometry and keeps controls and keyboard tab order usable', async ({ page }) => {
  await selectLandscape(page);
  await page.getByTestId('study-tab-experiment').click();
  await page.getByTestId('study-experiment-mass').click();
  const a = page.getByTestId('study-preview-a');
  const b = page.getByTestId('study-preview-b');
  const beforeA = await geometry(a);
  const beforeB = await geometry(b);
  await page.getByTestId('study-slider-mass').fill('78');
  const valuesA = await values(a);
  const valuesB = await values(b);
  expect(valuesB.mass).toBe(78);
  expect(valuesA.mass).not.toBe(valuesB.mass);
  expect(Object.keys(valuesA).filter(key => valuesA[key] !== valuesB[key])).toEqual(['mass']);
  expect(await geometry(a), 'The fixed A baseline must not move when B mass changes').toEqual(beforeA);
  expect(await geometry(b), 'Changing the mass control must alter the drawn shape').not.toEqual(beforeB);
  const massSlider = page.getByTestId('study-slider-mass');
  await massSlider.focus();
  await page.keyboard.press('ArrowRight');
  await expect(massSlider).toHaveValue('79');
  expect((await values(b)).mass).toBe(79);
  const grayscale = page.getByTestId('study-grayscale');
  await grayscale.uncheck();
  const coloredRendering = await b.screenshot();
  await grayscale.check();
  await expect(grayscale).toBeChecked();
  expect((await b.screenshot()).equals(coloredRendering), 'Grayscale must change actual painted output').toBe(false);
  await grayscale.uncheck();
  const structure = page.getByTestId('study-structure');
  await structure.uncheck();
  const withoutStructure = await b.screenshot();
  await structure.check();
  await expect(structure).toBeChecked();
  expect((await b.screenshot()).equals(withoutStructure), 'Structural guides must appear in actual painted output').toBe(false);
  await screenshot(page, 'deep-study-desktop.png');
  await page.getByTestId('study-tab-experiment').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByTestId('study-tab-review')).toBeFocused();
  await expect(page.getByTestId('study-review-checks')).toBeVisible();
  await page.keyboard.press('Home');
  await expect(page.getByTestId('study-tab-evidence')).toBeFocused();
  await expect(page.getByTestId('study-evidence')).toBeVisible();
  await page.keyboard.press('End');
  await expect(page.getByTestId('study-tab-review')).toBeFocused();
  // Exercise each of the three drawing models, so an object or line study
  // cannot silently reuse the working landscape controls without drawing.
  await page.getByTestId('study-tradition').selectOption('song-ceramics');
  await page.getByTestId('study-tab-experiment').click();
  const objectBeforeA = await geometry(a);
  const objectBeforeB = await geometry(b);
  await page.getByTestId('study-slider-mouth').fill('75');
  expect(await geometry(a)).toEqual(objectBeforeA);
  expect(await geometry(b)).not.toEqual(objectBeforeB);
  const objectA = await values(a);
  const objectB = await values(b);
  expect(objectB.mouth).toBe(75);
  expect(Object.keys(objectA).filter(key => objectA[key] !== objectB[key])).toEqual(['mouth']);
  await page.getByTestId('study-tradition').selectOption('calligraphy');
  await page.getByTestId('study-tab-experiment').click();
  const paintedWidths = () => b.locator('path').evaluateAll(paths => paths.map(element => element.getAttribute('stroke-width')));
  const lineBefore = await paintedWidths();
  await page.getByTestId('study-slider-stroke').fill('81');
  expect(await paintedWidths(), 'The line study must change the actual primary stroke width').not.toEqual(lineBefore);
  const lineA = await values(a);
  const lineB = await values(b);
  expect(lineB.stroke).toBe(81);
  expect(Object.keys(lineA).filter(key => lineA[key] !== lineB[key])).toEqual(['stroke']);
});

test('real study Markdown and JSON downloads retain the chosen A/B parameters, notes, review and pending source status', async ({ page }) => {
  await selectLandscape(page);
  await page.getByTestId('study-tab-experiment').click();
  await page.getByTestId('study-experiment-mass').click();
  await page.getByTestId('study-slider-mass').fill('73');
  await page.getByTestId('study-adopt-b').click();
  await page.getByTestId('study-subject').fill('雨后渡口的原创图书收藏入口');
  await page.getByTestId('study-target-app').click();
  await page.getByTestId('study-tab-review').click();
  const note = '研究笔记：以近岸与远山分出阅读区，核对原件口沿与舟桥尺度，不复制馆藏局部。';
  await page.getByTestId('study-note').fill(note);
  await page.getByTestId('study-check-0').check();
  const exportJSON = page.waitForEvent('download');
  await page.getByTestId('study-export-json').click();
  const jsonDownload = await exportJSON;
  expect(jsonDownload.suggestedFilename()).toMatch(/\.json$/);
  const exported = JSON.parse(await downloadedText(jsonDownload));
  expect(exported.version).toBe(1);
  expect(exported.kind).toBe('guanwu-study-note');
  expect(exported.note).toBe(note);
  expect(exported.checked).toHaveLength(1);
  expect(typeof exported.checked[0]).toBe('string');
  expect(exported.checked[0].length).toBeGreaterThan(3);
  expect(exported.transfer.traditionId).toBe('blue-green-landscape');
  expect(exported.transfer.subject).toBe('雨后渡口的原创图书收藏入口');
  expect(exported.transfer.target).toBe('app');
  expect(exported.transfer.parameters.mass).toBe(73);
  expect(exported.sourceReferences.length).toBeGreaterThan(0);
  for (const source of exported.sourceReferences) {
    expect(['reference', 'verified']).toContain(source.status);
    if (source.status === 'verified') expect(source.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}/);
    expect(source.url).toMatch(/^https:\/\//);
    expect(source.title).toBeTruthy();
  }
  const exportMarkdown = page.waitForEvent('download');
  await page.getByTestId('study-export-md').click();
  const markdownDownload = await exportMarkdown;
  expect(markdownDownload.suggestedFilename()).toMatch(/\.md$/);
  const markdown = await downloadedText(markdownDownload);
  expect(markdown).toContain(note);
  expect(markdown).toContain('73');
  expect(markdown).toMatch(/待核验|参考线索|未核验/);
  expect(markdown).toContain(exported.sourceReferences[0].url);
  expect(markdown).toMatch(/\[x\]/i);
});

test('the adopted experiment becomes a complete production brief and survives project save, export, reload and continued editing', async ({ page }) => {
  await selectLandscape(page);
  await page.getByTestId('study-tab-experiment').click();
  await page.getByTestId('study-experiment-mass').click();
  await page.getByTestId('study-slider-mass').fill('74');
  await page.getByTestId('study-adopt-b').click();
  const subject = '可以恢复研究变量的渡口阅读界面';
  await page.getByTestId('study-subject').fill(subject);
  await page.getByTestId('study-target-app').click();
  await page.getByTestId('study-transfer').click();
  await expect(page.getByTestId('workbench')).toBeVisible();
  await expect(page.getByTestId('workbench-subject')).toHaveValue(subject);
  await expect(page.getByTestId('target-app')).toHaveAttribute('aria-pressed', 'true');
  const revisedSubject = `${subject} · 首轮草图`;
  await page.getByTestId('workbench-subject').fill(revisedSubject);
  await page.getByTestId('workbench-detail').fill('45');
  const positive = await page.getByTestId('brief-positive').inputValue();
  expect(positive).toContain(revisedSubject);
  expect(positive).toContain('mass = 74');
  await page.getByTestId('brief-tab-delivery').click();
  const specification = await page.getByTestId('brief-specification').innerText();
  expect(specification).toContain('mass = 74');
  await page.getByTestId('brief-tab-tokens').click();
  const tokens = JSON.parse(await page.getByTestId('brief-tokens').innerText());
  expect(tokens['study.parameter.mass']).toBe('74');
  expect(tokens['rendering.detail']).toBe('45%');
  expect(tokens['study.parameterScope']).toContain('not historical measurement');
  expect(tokens['study.sourceIds']).toBeTruthy();
  await page.getByTestId('brief-save').click();
  await navigation(page, '项目册');
  await expect(page.locator('.project-card')).toHaveCount(1);
  const exporting = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出项目册', exact: true }).click();
  const projectEnvelope = JSON.parse(await downloadedText(await exporting));
  const stored = projectEnvelope.projects[0];
  expect(stored.brief.positive).toBe(positive);
  expect(stored.brief.specification).toBe(specification);
  expect(stored.brief.tokens).toEqual(tokens);
  await page.reload();
  await expect(page.locator('.project-card')).toHaveCount(1);
  await page.getByRole('button', { name: '继续编辑', exact: true }).click();
  await expect(page.getByTestId('workbench-subject')).toHaveValue(revisedSubject);
  await expect(page.getByTestId('brief-positive')).toHaveValue(positive);
  await page.getByTestId('brief-tab-delivery').click();
  await expect(page.getByTestId('brief-specification')).toHaveText(specification);
  await page.getByTestId('brief-tab-tokens').click();
  expect(JSON.parse(await page.getByTestId('brief-tokens').innerText())).toEqual(tokens);
  await page.getByTestId('brief-tab-prompt').click();
  await page.getByTestId('brief-positive').fill(`${positive}\n人工修订：主体周围再留一个明确静区。`);
  await expect(page.getByTestId('brief-positive')).toHaveValue(/人工修订/);
});

test('deep study remains readable and operable at 390px without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await selectLandscape(page);
  await assertNoHorizontalOverflow(page);
  await page.getByTestId('study-tab-experiment').click();
  await page.getByTestId('study-slider-opening').fill('70');
  await expect(page.getByTestId('study-slider-opening')).toHaveValue('70');
  await assertNoHorizontalOverflow(page);
  await screenshot(page, 'deep-study-mobile.png');
  await page.getByTestId('study-tab-review').click();
  await assertNoHorizontalOverflow(page);
  await page.getByTestId('study-check-0').focus();
  await page.keyboard.press('Space');
  await expect(page.getByTestId('study-check-0')).toBeChecked();
  await page.getByTestId('study-note').fill('移动端仍能录入研究观察。');
  await page.getByTestId('study-tab-evidence').click();
  await assertNoHorizontalOverflow(page);
  await page.getByRole('button', { name: '切换导航' }).click();
  await navigation(page, '制作台');
  await expect(page.getByTestId('workbench')).toBeVisible();
  await assertNoHorizontalOverflow(page);
});

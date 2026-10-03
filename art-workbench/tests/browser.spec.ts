import { expect, test, type Download, type Page } from '@playwright/test';
import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const screenshotDirectory = path.resolve('test-results');
const portableURL = process.env.PORTABLE_URL ?? new URL('../release/guanwu-art-workbench.html', import.meta.url).href;

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
  (page as Page & { recordedErrors?: string[] }).recordedErrors = errors;
  await mkdir(screenshotDirectory, { recursive: true });
});

test.afterEach(async ({ page }, testInfo) => {
  const errors = (page as Page & { recordedErrors?: string[] }).recordedErrors ?? [];
  await testInfo.attach('browser-errors', { body: JSON.stringify(errors, null, 2), contentType: 'application/json' });
  expect(errors, 'No JavaScript exceptions or browser console errors').toEqual([]);
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

async function pngFixture(page: Page, kind: 'solid' | 'half-transparent' | 'transparent') {
  const base64 = await page.evaluate(kind => {
    const canvas = document.createElement('canvas');
    canvas.width = 8; canvas.height = 8;
    const context = canvas.getContext('2d')!;
    if (kind !== 'transparent') {
      context.fillStyle = '#FF0000';
      context.fillRect(0, 0, kind === 'solid' ? 8 : 4, 8);
    }
    return canvas.toDataURL('image/png').split(',')[1];
  }, kind);
  return { name: `${kind}.png`, mimeType: 'image/png', buffer: Buffer.from(base64, 'base64') };
}

test('research filters, empty state, detail tabs, Escape and two-route comparison', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('先读懂美');
  const initialCount = await page.locator('.tradition-card').count();
  expect(initialCount).toBeGreaterThanOrEqual(6);
  const loadedImages = await page.locator('.hero-art img, .tradition-card img').evaluateAll(images => images.every(image => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0));
  expect(loadedImages).toBe(true);
  await screenshot(page, 'home-desktop.png');
  await page.getByRole('textbox', { name: '搜索美学路线' }).fill('漆器');
  await expect(page.locator('.tradition-card')).toHaveCount(1);
  await expect(page.locator('.card-title')).toContainText('汉代朱黑漆器');
  await page.getByRole('textbox', { name: '搜索美学路线' }).fill('不存在的研究路线xyz');
  await expect(page.locator('.tradition-card')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '还没有匹配的研究路线' })).toBeVisible();
  await page.getByRole('button', { name: '查看全部路线', exact: true }).click();
  await expect(page.locator('.tradition-card')).toHaveCount(initialCount);
  await page.getByRole('combobox', { name: '筛选时期' }).selectOption({ index: 1 });
  expect(await page.locator('.tradition-card').count()).toBeLessThan(initialCount);
  await page.getByRole('button', { name: '重置全部筛选' }).click();
  await page.getByRole('combobox', { name: '筛选媒介' }).selectOption({ index: 1 });
  expect(await page.locator('.tradition-card').count()).toBeLessThan(initialCount);
  await page.getByRole('button', { name: '重置全部筛选' }).click();
  await page.getByRole('button', { name: '研究汉代朱黑漆器', exact: true }).click();
  const detail = page.getByRole('dialog', { name: '汉代朱黑漆器', exact: true });
  await expect(detail).toBeVisible();
  await detail.getByRole('tab', { name: '游戏与 App 转译' }).click();
  await expect(detail.getByRole('heading', { name: '游戏里的形式规则' })).toBeVisible();
  await detail.getByRole('button', { name: '物件目录', exact: true }).click();
  await expect(detail.locator('.sample-inventory')).toBeVisible();
  await detail.getByRole('slider', { name: '预览空间疏密' }).fill('80');
  await detail.getByRole('tab', { name: '参考出处' }).click();
  expect(await detail.locator('.source-card').count()).toBeGreaterThan(0);
  await expect(detail.locator('.source-card a').first()).toHaveAttribute('href', /^https:\/\//);
  await page.keyboard.press('Escape');
  await expect(detail).toHaveCount(0);
  const routeNames = await page.locator('.tradition-card h3').allTextContents();
  await page.getByRole('button', { name: `加入比较${routeNames[0]}`, exact: true }).click();
  await expect(page.getByRole('button', { name: '并排比较', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: `加入比较${routeNames[1]}`, exact: true }).click();
  await page.getByRole('button', { name: '并排比较', exact: true }).click();
  const comparison = page.getByRole('dialog', { name: '并排比较：从形式规则看差异' });
  await expect(comparison.locator('thead th')).toHaveCount(3);
  await expect(comparison.locator('thead th').nth(1)).toContainText(routeNames[0]);
  await expect(comparison.locator('thead th').nth(2)).toContainText(routeNames[1]);
  await expect(comparison.locator('tbody')).toContainText('材料表现');
  await comparison.getByRole('button', { name: '关闭窗口' }).click();
  await page.getByRole('button', { name: '清空比较' }).click();
  await expect(page.locator('.compare-dock')).toHaveCount(0);
});

test('game and App briefs react to subject, format, target and keyboard tabs', async ({ page }) => {
  await page.goto('/#workbench');
  const positive = page.getByTestId('brief-positive');
  await expect(positive).toHaveValue(/游戏美术/);
  await page.getByTestId('workbench-subject').fill('雨后石桥边修补漆器的匠人');
  await expect(positive).toHaveValue(/雨后石桥边修补漆器的匠人/);
  await page.getByTestId('workbench-asset').selectOption('interface');
  await expect(positive).toHaveValue(/中央保留动作区域/);
  await page.getByTestId('target-app').click();
  await expect(page.getByTestId('target-app')).toHaveAttribute('aria-pressed', 'true');
  await expect(positive).toHaveValue(/App 美术/);
  await expect(positive).toHaveValue(/390 × 844/);
  await expect(positive).not.toHaveValue(/中央保留动作区域/);
  await page.getByTestId('workbench-asset').selectOption('icon');
  await page.getByTestId('workbench-format').selectOption('vector');
  await expect(positive).toHaveValue(/24 × 24 viewBox SVG/);
  await page.getByTestId('workbench-whitespace').fill('82');
  await expect(positive).toHaveValue(/留白目标 82%/);
  await screenshot(page, 'workbench-desktop.png');
  await page.getByTestId('brief-tab-prompt').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByTestId('brief-tab-delivery')).toBeFocused();
  await expect(page.getByTestId('brief-specification')).toContainText('44 × 44');
  await page.keyboard.press('ArrowRight');
  await expect(page.getByTestId('brief-tab-tokens')).toBeFocused();
  const tokens = JSON.parse(await page.getByTestId('brief-tokens').innerText());
  expect(tokens['composition.emptySpace']).toBe('82%');
});

test('edited prompts download as real Markdown and tokens download as valid JSON', async ({ page }) => {
  await page.goto('/#workbench');
  await page.getByTestId('workbench-subject').fill('可导出的青瓷收藏界面');
  await page.getByTestId('target-app').click();
  await page.getByTestId('workbench-asset').selectOption('interface');
  const editedPrompt = '自定义主体与材质：青瓷收藏界面，保留浅色阅读背景。';
  await page.getByTestId('brief-positive').fill(editedPrompt);
  await page.getByTestId('brief-negative').fill('自定义避免项：不烘焙文字。');
  await page.getByTestId('brief-copy').click();
  await expect(page.getByTestId('brief-notice')).toContainText(/已复制|手动复制/);
  if (await page.getByTestId('brief-manual-copy').isVisible()) {
    await expect(page.getByTestId('brief-manual-copy')).toHaveValue(`${editedPrompt}\n\n约束与避免项：\n自定义避免项：不烘焙文字。`);
  }
  const markdownDownload = page.waitForEvent('download');
  await page.getByTestId('brief-download-markdown').click();
  const markdown = await markdownDownload;
  expect(markdown.suggestedFilename()).toMatch(/-app-interface\.md$/);
  const markdownText = await downloadedText(markdown);
  expect(markdownText).toContain(editedPrompt);
  expect(markdownText).toContain('自定义避免项');
  expect(markdownText).toContain('## 研究依据');
  expect(markdownText).toContain('## 验收清单');
  const tokensDownload = page.waitForEvent('download');
  await page.getByTestId('brief-download-tokens').click();
  const tokens = await tokensDownload;
  expect(tokens.suggestedFilename()).toMatch(/-tokens\.json$/);
  const content = JSON.parse(await downloadedText(tokens));
  expect(content['color.surface']).toMatch(/^#[0-9a-f]{6}$/i);
  expect(content['source.traditionId']).toBeTruthy();
  await page.getByTestId('brief-reset').click();
  await expect(page.getByTestId('brief-positive')).not.toHaveValue(editedPrompt);
});

test('projects persist through reload, restore manual prompts and safely import actual exports', async ({ page }) => {
  await page.goto('/#workbench');
  const subject = '一套可以继续编辑的器物图标';
  const prompt = '手动保留：木胎漆层的器物图标，四周透明，轮廓克制。';
  const negative = '手动约束：不增加第二个视角。';
  await page.getByTestId('workbench-subject').fill(subject);
  await page.getByTestId('target-app').click();
  await page.getByTestId('workbench-asset').selectOption('icon');
  await page.getByTestId('brief-positive').fill(prompt);
  await page.getByTestId('brief-negative').fill(negative);
  await page.getByTestId('brief-save').click();
  await navigation(page, '项目册');
  await expect(page.locator('.project-card')).toHaveCount(1);
  await page.reload();
  await expect(page.locator('.project-card')).toHaveCount(1);
  await page.getByRole('button', { name: '继续编辑', exact: true }).click();
  await expect(page.getByTestId('workbench-subject')).toHaveValue(subject);
  await expect(page.getByTestId('target-app')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('workbench-asset')).toHaveValue('icon');
  await expect(page.getByTestId('brief-positive')).toHaveValue(prompt);
  await expect(page.getByTestId('brief-negative')).toHaveValue(negative);
  await navigation(page, '项目册');
  const exporting = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出项目册', exact: true }).click();
  const exportedText = await downloadedText(await exporting);
  const exported = JSON.parse(exportedText);
  expect(exported.version).toBe(1);
  expect(exported.projects).toHaveLength(1);
  expect(exported.projects[0].brief.positive).toBe(prompt);
  await page.getByRole('button', { name: `删除项目${subject}`, exact: true }).click();
  await expect(page.locator('.project-card')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '导出项目册', exact: true })).toBeDisabled();
  await page.getByLabel('导入项目册文件').setInputFiles({ name: 'guanwu-projects.json', mimeType: 'application/json', buffer: Buffer.from(exportedText) });
  await expect(page.locator('.project-card')).toHaveCount(1);
  const storedBefore = await page.evaluate(() => localStorage.getItem('guanwu-projects-v1'));
  const invalid = structuredClone(exported);
  invalid.projects[0].input.target = 'unsupported';
  await page.getByLabel('导入项目册文件').setInputFiles({ name: 'invalid-project.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(invalid)) });
  await expect(page.locator('.toast')).toContainText('无效的制作参数');
  await expect(page.locator('.project-card')).toHaveCount(1);
  expect(await page.evaluate(() => localStorage.getItem('guanwu-projects-v1'))).toBe(storedBefore);
  await page.getByLabel('导入项目册文件').setInputFiles({ name: 'broken.json', mimeType: 'application/json', buffer: Buffer.from('{broken') });
  await expect(page.locator('.toast')).toContainText(/JSON|Unexpected|Expected/);
  await expect(page.locator('.project-card')).toHaveCount(1);
  expect(await page.evaluate(() => localStorage.getItem('guanwu-projects-v1'))).toBe(storedBefore);
});

test('Canvas upload measures known colors and transparency, and rejects corrupt or unsupported files', async ({ page }) => {
  await page.goto('/#quality');
  const upload = page.getByTestId('quality-upload');
  await upload.setInputFiles(await pngFixture(page, 'solid'));
  await expect(page.getByTestId('quality-dimensions')).toHaveText('8 × 8 px');
  await expect(page.getByTestId('quality-transparency')).toHaveText('0.0%');
  await expect(page.getByTestId('quality-extracted-color-0')).toContainText('#FF0000');
  await expect(page.getByTestId('quality-extracted-color-0')).toContainText('100.0%');
  await upload.setInputFiles(await pngFixture(page, 'half-transparent'));
  await expect(page.getByTestId('quality-read-status')).toContainText('half-transparent.png');
  await expect(page.getByTestId('quality-transparency')).toHaveText('50.0%');
  await expect(page.locator('.quality-extracted-color')).toHaveCount(1);
  await page.getByRole('button', { name: '100% 原尺寸', exact: true }).click();
  await expect(page.getByTestId('quality-preview-size')).toBeDisabled();
  await page.getByRole('button', { name: '缩小预览', exact: true }).click();
  await expect(page.getByTestId('quality-preview-size')).toBeEnabled();
  await upload.setInputFiles({ name: 'corrupt.png', mimeType: 'image/png', buffer: Buffer.from('invalid image bytes') });
  await expect(page.getByTestId('quality-error')).toContainText('无法解码');
  await expect(page.getByTestId('quality-read-status')).toContainText('half-transparent.png');
  await expect(page.getByTestId('quality-transparency')).toHaveText('50.0%');
  await upload.setInputFiles({ name: 'unsupported.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>') });
  await expect(page.getByTestId('quality-error')).toContainText('SVG 与 GIF');
  await upload.setInputFiles(await pngFixture(page, 'transparent'));
  await expect(page.getByTestId('quality-read-status')).toContainText('transparent.png');
  await expect(page.getByTestId('quality-transparency')).toHaveText('100.0%');
  await expect(page.locator('.quality-extracted-color')).toHaveCount(0);
  await expect(page.getByTestId('quality-copy-palette')).toBeDisabled();
  await expect(page.locator('.quality-empty-colors')).toContainText('没有可见颜色');
  // The presentation screenshot uses an actual original research image;
  // measurement assertions above use controlled pixel fixtures.
  await upload.setInputFiles(path.resolve('src/assets/forms.png'));
  await expect(page.getByTestId('quality-read-status')).toContainText('forms.png');
  expect(await page.locator('.quality-extracted-color').count()).toBeGreaterThan(0);
  await screenshot(page, 'quality-desktop.png');
});

test('contrast validates 21:1 black/white, invalid hex and exported analysis data', async ({ page }) => {
  await page.goto('/#quality');
  await page.getByTestId('quality-foreground').fill('#000');
  await page.getByTestId('quality-background').fill('#FFFFFF');
  await expect(page.getByTestId('quality-contrast-ratio')).toContainText('21.00 : 1');
  await expect(page.locator('.quality-threshold-pass')).toHaveCount(2);
  await page.getByTestId('quality-upload').setInputFiles(await pngFixture(page, 'solid'));
  const exporting = page.waitForEvent('download');
  await page.getByTestId('quality-export').click();
  const analysis = JSON.parse(await downloadedText(await exporting));
  expect(analysis.image.width).toBe(8);
  expect(analysis.image.height).toBe(8);
  expect(analysis.image.colors[0].hex).toBe('#FF0000');
  expect(analysis.comparison.ratio).toBe(21);
  await page.getByTestId('quality-foreground').fill('#ZZZZZZ');
  await expect(page.getByTestId('quality-foreground')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByTestId('quality-contrast-ratio')).toContainText('待输入有效色值');
  await expect(page.locator('.quality-threshold-pending')).toHaveCount(2);
  await page.getByTestId('quality-foreground').fill('#FFFFFF');
  await expect(page.getByTestId('quality-contrast-ratio')).toContainText('1.00 : 1');
  await expect(page.locator('.quality-threshold-fail')).toHaveCount(2);
  await page.getByRole('button', { name: '展开卡片', exact: true }).click();
  await expect(page.getByRole('button', { name: '收起文字', exact: true })).toHaveAttribute('aria-expanded', 'true');
});

test('390px mobile navigation, research dialog and tools stay within the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await assertNoHorizontalOverflow(page);
  await screenshot(page, 'home-mobile.png');
  await page.getByRole('button', { name: '研究汉代朱黑漆器', exact: true }).click();
  const detail = page.getByRole('dialog', { name: '汉代朱黑漆器', exact: true });
  await expect(detail).toBeVisible();
  await assertNoHorizontalOverflow(page);
  const dialogBox = await detail.boundingBox();
  expect(dialogBox!.x).toBeGreaterThanOrEqual(0);
  expect(dialogBox!.x + dialogBox!.width).toBeLessThanOrEqual(391);
  await detail.getByRole('tab', { name: '游戏与 App 转译' }).click();
  await assertNoHorizontalOverflow(page);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: '切换导航' }).click();
  await expect(page.getByRole('button', { name: '切换导航' })).toHaveAttribute('aria-expanded', 'true');
  await navigation(page, '制作台');
  await expect(page.getByRole('button', { name: '切换导航' })).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByTestId('workbench')).toBeVisible();
  await assertNoHorizontalOverflow(page);
  await page.getByTestId('brief-tab-tokens').click();
  await assertNoHorizontalOverflow(page);
  await page.getByRole('button', { name: '切换导航' }).click();
  await navigation(page, '检验室');
  await page.getByTestId('quality-upload').setInputFiles(await pngFixture(page, 'half-transparent'));
  await expect(page.getByTestId('quality-transparency')).toHaveText('50.0%');
  await assertNoHorizontalOverflow(page);
});

test('portable HTML embeds every resource and its tools work fully offline', async ({ page, context }, testInfo) => {
  const portableBytes = await readFile(fileURLToPath(portableURL));
  const blockedRequests: string[] = [];
  let allowBootstrapDocument = false;
  let fileOriginLoaded = true;
  const portableHTTPURL = new URL('/guanwu-art-workbench.html', process.env.BASE_URL ?? 'http://127.0.0.1:4173').href;
  await context.route(/^https?:\/\//, async route => {
    if (allowBootstrapDocument && route.request().isNavigationRequest() && route.request().url().split('#')[0] === portableHTTPURL) {
      allowBootstrapDocument = false;
      await route.continue();
      return;
    }
    blockedRequests.push(route.request().url());
    await route.abort('internetdisconnected');
  });
  try {
    await page.goto(portableURL);
    await testInfo.attach('portable-origin', { body: 'Actual file:// origin loaded successfully; offline interaction assertions use that origin.', contentType: 'text/plain' });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes('ERR_BLOCKED_BY_ADMINISTRATOR')) throw error;
    fileOriginLoaded = false;
    await testInfo.attach('file-origin-blocked', {
      body: `${message}\nThe managed Chromium URL policy does not allow file://. No browser policy was changed.\nThe remaining assertions use the byte-identical HTML served over allowed localhost HTTP, with every subsequent HTTP(S) request blocked. Actual file-origin operation remains unverified in this environment.`,
      contentType: 'text/plain',
    });
    // Chromium's blocked navigation commits its internal error document
    // asynchronously. A fresh page in the same managed context prevents
    // that commit from interrupting the permitted HTTP navigation.
    const blockedPage = page;
    page = await context.newPage();
    await blockedPage.close();
    allowBootstrapDocument = true;
    const response = await page.goto(portableHTTPURL);
    expect(response).not.toBeNull();
    expect((await response!.body()).equals(portableBytes), 'HTTP fallback must serve the exact portable artifact bytes').toBe(true);
    // A real reload while HTTP is still available checks storage and the
    // byte-identical portable entry. No network response is fabricated.
    await navigation(page, '制作台');
    await page.getByTestId('workbench-subject').fill('单文件项目重载检查');
    await page.getByTestId('brief-positive').fill('单文件中手动保留的漆器轮廓规范。');
    await page.getByTestId('brief-save').click();
    await navigation(page, '项目册');
    allowBootstrapDocument = true;
    const reloaded = await page.reload();
    expect(reloaded).not.toBeNull();
    expect((await reloaded!.body()).equals(portableBytes)).toBe(true);
    await expect(page.locator('.project-card')).toHaveCount(1);
    await page.getByRole('button', { name: '继续编辑', exact: true }).click();
    await expect(page.getByTestId('brief-positive')).toHaveValue('单文件中手动保留的漆器轮廓规范。');
    await navigation(page, '项目册');
    await page.getByRole('button', { name: '删除项目单文件项目重载检查', exact: true }).click();
    await navigation(page, '研究馆');
  }
  await context.setOffline(true);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('先读懂美');
  await expect.poll(async () => page.locator('.hero-art img, .tradition-card img').evaluateAll(images => images.every(image => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
  const sources = await page.locator('img').evaluateAll(images => images.map(image => image.getAttribute('src')));
  expect(sources.every(source => source?.startsWith('data:image/'))).toBe(true);
  await page.getByRole('textbox', { name: '搜索美学路线' }).fill('漆器');
  await expect(page.locator('.tradition-card')).toHaveCount(1);
  await page.getByRole('button', { name: '用汉代朱黑漆器制作方案', exact: true }).click();
  await page.getByTestId('target-app').click();
  await page.getByTestId('workbench-subject').fill('完全离线制作的收藏界面');
  await expect(page.getByTestId('brief-positive')).toHaveValue(/完全离线制作的收藏界面/);
  const exporting = page.waitForEvent('download');
  await page.getByTestId('brief-download-markdown').click();
  expect(await downloadedText(await exporting)).toContain('完全离线制作的收藏界面');
  await page.getByTestId('brief-save').click();
  await navigation(page, '项目册');
  await expect(page.locator('.project-card')).toHaveCount(1);
  if (fileOriginLoaded) {
    await page.reload();
    await expect(page.locator('.project-card')).toHaveCount(1);
  }
  // HTTP fallback reload was checked before going offline. Subsequent
  // offline assertions stay in the same document and make no HTTP request.
  await navigation(page, '检验室');
  await page.getByTestId('quality-upload').setInputFiles(await pngFixture(page, 'half-transparent'));
  await expect(page.getByTestId('quality-transparency')).toHaveText('50.0%');
  await page.getByTestId('quality-foreground').fill('#000000');
  await page.getByTestId('quality-background').fill('#FFFFFF');
  await expect(page.getByTestId('quality-contrast-ratio')).toContainText('21.00 : 1');
  expect(blockedRequests, 'Portable HTML must not attempt to load remote assets').toEqual([]);
});

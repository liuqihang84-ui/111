#!/usr/bin/env node
/** Build the application a second time as a self-contained, offline HTML file. */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const viteCommand = join(projectRoot, 'node_modules/vite/bin/vite.js');
const portableDirectory = join(projectRoot, 'portable');
const releaseDirectory = join(projectRoot, 'release');
const htmlName = 'yiri-journal.html';
const zipName = 'yiri-journal.zip';

function fail(message) {
  console.error(`Portable build failed: ${message}`);
  process.exit(1);
}

if (!existsSync(viteCommand)) fail('Local Vite is missing. Run npm ci first.');
const build = spawnSync(process.execPath, [viteCommand, 'build'], {
  cwd: projectRoot,
  env: { ...process.env, PORTABLE_BUILD: '1' },
  stdio: 'inherit',
});
if (build.error) fail(build.error.message);
if (build.status !== 0) fail(`Vite exited with status ${build.status}.`);

const builtHtml = join(portableDirectory, 'index.html');
if (!existsSync(builtHtml)) fail('Vite did not create portable/index.html.');
const html = readFileSync(builtHtml, 'utf8');
const violations = [];
const allowedResource = (value, allowFragment = false) =>
  /^data:/i.test(value.trim()) || (allowFragment && /^#/.test(value.trim()));

function inspectResource(value, label, allowFragment = false) {
  if (!allowedResource(value, allowFragment)) {
    violations.push(`${label}: ${value.slice(0, 160) || '(empty URL)'}`);
  }
}

// The bundled JavaScript can contain strings that resemble tags. Only inspect
// real document tags here, then separately inspect the inline script below.
const documentMarkup = html
  .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, (block) => block.replace(/>[\s\S]*<\/script/i, '></script'))
  .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, '');
for (const tag of documentMarkup.matchAll(/<([a-z][\w:-]*)\b([^>]*)>/gi)) {
  const name = tag[1].toLowerCase();
  const attributes = new Map();
  for (const attribute of tag[2].matchAll(/([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g)) {
    attributes.set(attribute[1].toLowerCase(), attribute[2] ?? attribute[3] ?? attribute[4]);
  }
  if (['script', 'img', 'iframe', 'audio', 'video', 'source', 'track', 'embed', 'input'].includes(name) && attributes.has('src')) {
    inspectResource(attributes.get('src'), `<${name}> src`);
  }
  if (name === 'video' && attributes.has('poster')) inspectResource(attributes.get('poster'), '<video> poster');
  if (name === 'object' && attributes.has('data')) inspectResource(attributes.get('data'), '<object> data');
  if (['image', 'use'].includes(name)) {
    for (const attribute of ['href', 'xlink:href']) {
      if (attributes.has(attribute)) inspectResource(attributes.get(attribute), `<${name}> ${attribute}`, true);
    }
  }
  if (name === 'link' && /(?:stylesheet|modulepreload|preload|icon|manifest)/i.test(attributes.get('rel') ?? '')) {
    if (attributes.has('href')) inspectResource(attributes.get('href'), '<link> href');
  }
  if (attributes.has('srcset')) {
    const srcset = attributes.get('srcset').trim();
    // A data URI includes its own comma; splitting it as ordinary srcset would
    // incorrectly treat base64 bytes as a relative filename.
    if (!/^data:/i.test(srcset) || /(?:https?:|\/assets\/|\.\.?\/)/i.test(srcset)) {
      violations.push(`<${name}> srcset must use embedded data URIs.`);
    }
  }
}

const styleBlocks = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi)].map((match) => match[1]).join('\n');
for (const match of styleBlocks.matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/gi)) {
  inspectResource(match[2], 'CSS url()', true);
}
if (/@import\s+(?:url\s*\(|['"])/i.test(styleBlocks)) violations.push('CSS @import remains in the portable file.');

const inlineScripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi)].map((match) => match[1]).join('\n');
// Vite imports become data URIs in the single-file build. Public assets and
// hand-written paths may remain strings in JavaScript and fail only at runtime.
for (const match of inlineScripts.matchAll(/(["'`])((?:https?:\/\/|\/|\.\.?\/|assets\/)[^"'`\s<>]+?\.(?:png|jpe?g|gif|webp|avif|svg|ico|woff2?|ttf|otf|mp3|ogg|wav|mp4|webm)(?:\?[^"'`\s<>]*)?)\1/gi)) {
  violations.push(`Bundled asset is not embedded: ${match[2].slice(0, 160)}`);
}
// Also catch plain JSX src literals such as src="forest.png". Ordinary export
// filenames are deliberately not rejected; they are not loading dependencies.
for (const match of inlineScripts.matchAll(/\b(?:src|poster)\s*:\s*(['"])([^'"]+)\1/g)) {
  inspectResource(match[2], 'Bundled JSX resource');
}
for (const match of inlineScripts.matchAll(/new\s+URL\(\s*(['"])([^'"]+)\1\s*,\s*import\.meta\.url\s*\)/g)) {
  inspectResource(match[2], 'Bundled new URL() resource');
}
if (!/<script\b[^>]*>[\s\S]+?<\/script\s*>/i.test(html)) violations.push('No inline application script was found.');
if (violations.length) fail(`The HTML still depends on other files:\n${[...new Set(violations)].join('\n')}`);

// Keep the exact single-file artifact available to the ordinary production preview.
writeFileSync(join(projectRoot, 'dist', htmlName), html, 'utf8');

mkdirSync(releaseDirectory, { recursive: true });
const htmlPath = join(releaseDirectory, htmlName);
writeFileSync(htmlPath, html, 'utf8');

const readme = `一日一笺 · 印刷私记 0.3.0

打开方法
1. 完整解压 ZIP。
2. 用现代 Chrome、Edge 或 Firefox 打开 ${htmlName}。
3. 脚本、样式、纸品美术与字体已嵌入 HTML；记录和导出无需网络。

开始记录
新用户直接打开一本「日常」的空白册页，点击标题和随笔书写。
「写 / 册 / 历」切换纸页、手账收藏和月历。可新建手账、改名，选择朱页、墨页和素页封面。
「加内容」打开纸品与照片；「编辑文字」打开文字、心情和小事工具。用完可收起。
8 件同风格印刷纸品可拖动、缩放、旋转、复制、前置或删除。旧版 12 件素材保留在「旧藏」，旧手账与 JSON 备份兼容。
撤销与重做支持整次拖动；选册和切换日期保留轻量开册与翻页。
照片支持 PNG、JPEG、WebP，单张最大 15 MB，在当前浏览器缩小后保存。
「更多操作」导出 1280 × 1680 PNG、下载或恢复全部手账 JSON，也可编辑封面。

保存与备份
内容自动保存在当前浏览器 localStorage；存储不可用或空间不足时显示提示。
不同浏览器、隐私窗口、网站地址及文件路径可能使用不同存储空间。
移动 HTML、切换浏览器或清理数据前，请在「更多操作」导出备份。
JSON 恢复全部手账；PNG 用于分享。导入 JSON 先验证文件，覆盖前下载当前内容的备份。
本版没有账号或云端同步，照片不上传服务器。

验证方式
当前托管环境的浏览器策略限制 file://，此环境未实测本地文件打开。
浏览器验收使用允许的真实 HTTP 载入与此 HTML 相同的字节，然后断网检查；结果见源码 docs/QA.md。

美术与许可证
纸白、墨黑、朱红构成独立 UI / VI。三款封面与品牌标志为原创 SVG，8 件透明印刷纸品为新生成 PNG。
旧 PNG 和 SVG 仅用于「旧藏」及历史备份兼容。来源、提示词与完整许可证随源码保留。

本包为离线交付；静态站可使用另行构建的 dist 目录。构建不会自动部署网站。
`;
writeFileSync(join(releaseDirectory, 'README.txt'), readme, 'utf8');

const noticesPath = join(projectRoot, 'docs', 'NOTICES.txt');
if (!existsSync(noticesPath)) fail('docs/NOTICES.txt is required for distribution.');
const noticesText = readFileSync(noticesPath, 'utf8');
const normalizeLicense = (text) => text.replace(/\r\n/g, '\n').trim();
const notices = [noticesText, ''];
for (const packageName of ['react', 'react-dom', 'scheduler', 'lucide-react']) {
  const packageDirectory = join(projectRoot, 'node_modules', packageName);
  const licenseName = ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'LICENSE-MIT'].find((name) => existsSync(join(packageDirectory, name)));
  if (!licenseName) fail(`Cannot locate the bundled dependency license for ${packageName}.`);
  const metadata = JSON.parse(readFileSync(join(packageDirectory, 'package.json'), 'utf8'));
  const license = readFileSync(join(packageDirectory, licenseName), 'utf8');
  if (!noticesText.includes(`${packageName} ${metadata.version}`) || !normalizeLicense(noticesText).includes(normalizeLicense(license))) {
    fail(`docs/NOTICES.txt must retain the actual ${packageName} ${metadata.version} license.`);
  }
}
const artSources = join(projectRoot, 'docs', 'ART-SOURCES.md');
if (!existsSync(artSources)) fail('docs/ART-SOURCES.md is required for distribution.');
const fontLicense = join(projectRoot, 'src', 'assets', 'FONT-LICENSE.txt');
if (!existsSync(fontLicense) || !normalizeLicense(noticesText).includes(normalizeLicense(readFileSync(fontLicense, 'utf8')))) {
  fail('docs/NOTICES.txt must retain the bundled font copyright and complete OFL license.');
}
notices.push('美术与字体来源详细记录', readFileSync(artSources, 'utf8'), '');
writeFileSync(join(releaseDirectory, 'NOTICES.txt'), notices.join('\n'), 'utf8');

const archive = spawnSync('python3', ['-c', String.raw`
import os, sys, zipfile
directory, archive_name, html_name = sys.argv[1:]
archive_path = os.path.join(directory, archive_name)
members = (html_name, 'README.txt', 'NOTICES.txt')
with zipfile.ZipFile(archive_path, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as output:
    for name in members:
        output.write(os.path.join(directory, name), arcname=name)
with zipfile.ZipFile(archive_path) as output:
    if output.namelist() != list(members):
        raise SystemExit('ZIP members differ from the expected file list.')
    bad_member = output.testzip()
    if bad_member:
        raise SystemExit('ZIP CRC verification failed: ' + bad_member)
    for name in members:
        with open(os.path.join(directory, name), 'rb') as source:
            if output.read(name) != source.read():
                raise SystemExit('ZIP member differs from source: ' + name)
`, releaseDirectory, zipName, htmlName], { cwd: projectRoot, stdio: 'inherit' });
if (archive.error) fail(archive.error.message);
if (archive.status !== 0) fail(`ZIP packaging exited with status ${archive.status}.`);

const metadata = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8'));
const files = [htmlName, zipName, 'README.txt', 'NOTICES.txt'].map((name) => {
  const content = readFileSync(join(releaseDirectory, name));
  return { name, bytes: content.length, sha256: createHash('sha256').update(content).digest('hex') };
});
writeFileSync(join(releaseDirectory, 'release-manifest.json'), `${JSON.stringify({
  name: metadata.name,
  version: metadata.version,
  builtAt: new Date().toISOString(),
  offlineResourceValidation: 'passed',
  archiveCrcValidation: 'passed',
  exactArchiveMemberValidation: 'passed',
  archiveByteEqualityValidation: 'passed',
  files,
}, null, 2)}\n`, 'utf8');
console.log(`Portable HTML resource validation passed.\nRelease directory: ${releaseDirectory}`);
for (const file of files) console.log(`${file.name}: ${file.bytes} bytes; SHA-256 ${file.sha256}`);

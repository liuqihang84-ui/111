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
const htmlName = 'guanwu-art-workbench.html';
const zipName = 'guanwu-art-workbench.zip';

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

mkdirSync(releaseDirectory, { recursive: true });
const htmlPath = join(releaseDirectory, htmlName);
writeFileSync(htmlPath, html, 'utf8');

const readme = `观物 · 中国美学与 AI 美术工作台\n\n打开方法\n1. 完整解压 ZIP。\n2. 双击 ${htmlName}，用现代 Chrome、Edge 或 Firefox 打开。\n3. 页面所需脚本、样式与研究图已嵌入 HTML；学习与制作工具不需要网络。\n4. 博物馆、参考资料及其他来源链接需要网络，网络策略可能限制访问。\n\n使用范围\n这是研究与制作辅助工具：梳理美学依据、编写制作简报与素材规格、整理色板并检查一致性。\n本版本没有连接 AI 模型 API，不会自动调用在线生图服务。\n\n本地项目\n保存的项目使用当前浏览器的 localStorage。不同浏览器、隐私窗口以及不同文件路径可能使用不同存储空间。\n请通过页面的项目导出功能保留副本；移动 HTML 文件或清理浏览器数据前先导出。\n\n出处与权利\nreference 表示参考线索；verified 表示已按记录核对。引用状态不等于图像授权。\n研究色板是数字化工作色，不是古代颜料的科学测量值。\n研究图及软件许可证说明见 NOTICES.txt。\n\n发布方式\n这是单文件离线交付。正式静态站可使用单独构建的 dist 目录；本包不代表网站已公开上线。\n`;
writeFileSync(join(releaseDirectory, 'README.txt'), readme, 'utf8');

const notices = ['观物 · 第三方软件与美术来源说明', '', '引用链接与解释性文字用于研究。博物馆馆藏信息的可访问性不代表图像可以任意再分发。', ''];
for (const packageName of ['react', 'react-dom', 'scheduler', 'lucide-react']) {
  const packageDirectory = join(projectRoot, 'node_modules', packageName);
  const licenseName = ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'LICENSE-MIT'].find((name) => existsSync(join(packageDirectory, name)));
  if (!licenseName) fail(`Cannot locate the bundled dependency license for ${packageName}.`);
  const metadata = JSON.parse(readFileSync(join(packageDirectory, 'package.json'), 'utf8'));
  notices.push(`${packageName} ${metadata.version}`, readFileSync(join(packageDirectory, licenseName), 'utf8'), '');
}
const artSources = join(projectRoot, 'docs', 'ART-SOURCES.md');
if (existsSync(artSources)) notices.push('美术与研究素材来源', readFileSync(artSources, 'utf8'), '');
else notices.push('美术与研究素材来源：请参阅项目源码中的 README 与 docs。未提供单独授权的馆藏图像不因本项目引用而获得再使用许可。', '');
writeFileSync(join(releaseDirectory, 'NOTICES.txt'), notices.join('\n'), 'utf8');

const archive = spawnSync('python3', ['-c', String.raw`
import os, sys, zipfile
directory, archive_name, html_name = sys.argv[1:]
archive_path = os.path.join(directory, archive_name)
with zipfile.ZipFile(archive_path, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as output:
    for name in (html_name, 'README.txt', 'NOTICES.txt'):
        output.write(os.path.join(directory, name), arcname=name)
with zipfile.ZipFile(archive_path) as output:
    bad_member = output.testzip()
    if bad_member:
        raise SystemExit('ZIP CRC verification failed: ' + bad_member)
`, releaseDirectory, zipName, htmlName], { cwd: projectRoot, stdio: 'inherit' });
if (archive.error) fail(archive.error.message);
if (archive.status !== 0) fail(`ZIP packaging exited with status ${archive.status}.`);

const metadata = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8'));
const files = [htmlName, zipName].map((name) => {
  const content = readFileSync(join(releaseDirectory, name));
  return { name, bytes: content.length, sha256: createHash('sha256').update(content).digest('hex') };
});
writeFileSync(join(releaseDirectory, 'release-manifest.json'), `${JSON.stringify({
  name: metadata.name,
  version: metadata.version,
  builtAt: new Date().toISOString(),
  offlineResourceValidation: 'passed',
  archiveCrcValidation: 'passed',
  files,
}, null, 2)}\n`, 'utf8');
console.log(`Portable HTML resource validation passed.\nRelease directory: ${releaseDirectory}`);
for (const file of files) console.log(`${file.name}: ${file.bytes} bytes; SHA-256 ${file.sha256}`);

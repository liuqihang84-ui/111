#!/usr/bin/env node
import { createServer } from 'vite';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const server = await createServer({ root, server: { middlewareMode: true }, appType: 'custom', optimizeDeps: { noDiscovery: true, include: [] } });
let materials, referenceBoards;
try {
  ({ materials } = await server.ssrLoadModule('/src/data/materials.ts'));
  ({ referenceBoards } = await server.ssrLoadModule('/src/data/reference-boards.ts'));
}
finally { await server.close(); }
const release = join(root, 'release');
mkdirSync(release, { recursive: true });
const manifest = {
  version: 1, name: '观物 · 中国美学原创素材库',
  builtAt: new Date().toISOString(), count: materials.length,
  targetMeaning: 'targets 表示推荐制作方向，个人或商业使用许可不受此分类限制。界面 SVG 是布局图形，交互与真实文本需要开发。',
  license: '原创现代 SVG 素材，允许用于游戏、App、网页和修改；不代表古代原作、历史复原或馆藏图像授权。参考研究板为 AI 辅助原创视觉研究，供参考与项目使用，不保证历史细节或角色一致性。',
  materials: materials.map(({ svg, ...item }) => ({ ...item, filename: `${item.category}/${item.id}.svg`, sha256: createHash('sha256').update(svg).digest('hex') })),
  referenceBoards: referenceBoards.map(({ image, ...item }) => {
    const filename = item.filename.replace(/^guanwu-/, '');
    const bytes = readFileSync(join(root, 'src', 'assets', filename));
    return { ...item, filename: `reference-boards/${filename}`, kind: 'whole-board-reference', sha256: createHash('sha256').update(bytes).digest('hex') };
  }),
};
const payload = JSON.stringify({ manifest, files: materials.map(item => ({ name: `${item.category}/${item.id}.svg`, content: item.svg })) });
const out = spawnSync('python3', ['-c', String.raw`
import json, sys, zipfile, pathlib
root, release = map(pathlib.Path, sys.argv[1:])
data = json.load(sys.stdin)
with zipfile.ZipFile(release / 'guanwu-material-library.zip', 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for item in data['files']:
        z.writestr('guanwu-materials/' + item['name'], item['content'])
    boards = sorted((root / 'src/assets').glob('reference-*.png')) + [root / 'src/assets/landscape.png', root / 'src/assets/forms.png']
    for board in boards:
        z.write(board, 'guanwu-materials/reference-boards/' + board.name)
    z.writestr('guanwu-materials/manifest.json', json.dumps(data['manifest'], ensure_ascii=False, indent=2))
    z.writestr('guanwu-materials/README.txt', '观物原创素材库\n\nSVG：原始可编辑矢量素材，按类型分目录。\nreference-boards：整板 PNG 原创视觉参考，板中案例不作为已切分的透明角色或场景资产。\n\n可以用于游戏、App、网页与修改。素材属于现代设计转译，不代表古代原作、历史复原或博物馆图像授权。\n各项尺寸、平铺与透明状态见 manifest.json。界面类 SVG 是布局图形，不含运行中的表单或交互逻辑。\n网页素材库支持搜索、收藏、SVG/PNG 下载和选中素材 ZIP 打包。\n')
    for name in ['ART-SOURCES.md', 'material-catalog.md', 'rich-taxonomy.md', 'reference-game-provenance.md', 'reference-app-provenance.md', 'rich-content-audit.md', 'material-qa.md']:
        p = root / 'docs' / name
        if p.exists(): z.write(p, 'guanwu-materials/sources/' + name)
with zipfile.ZipFile(release / 'guanwu-material-library.zip') as z:
    assert z.testzip() is None
    print(f'Material ZIP: {len(data["files"])} SVG + {len(boards)} reference PNG; CRC passed.')
`, root, release], { input: payload, encoding: 'utf8', maxBuffer: 3_000_000 });
if (out.status !== 0) throw new Error(out.stderr || 'Material pack failed');
console.log(out.stdout.trim());
writeFileSync(join(release, 'material-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
const bytes = readFileSync(join(release, 'guanwu-material-library.zip'));
console.log(`guanwu-material-library.zip: ${bytes.length} bytes; SHA-256 ${createHash('sha256').update(bytes).digest('hex')}`);

# 当前工作流：一日一笺 · 印刷私记

当前应用位于 `/workspace/111/journal`，版本 `0.3.0`，默认端口 `4180`。新用户直接进入一本「日常」的空白编辑页；既有浏览器数据继续保留。素材与页面工具按需展开，月历用于回看，PNG 导出和 JSON 备份恢复从「更多操作」进入。

保留 `/workspace/111` 中的美术工作台、旧 Godot 游戏及用户更改。使用现有检出，不额外创建 Git worktree。

## 安装、检查与构建

需要 Node.js 20.19+、22.12+ 或更新的受支持版本、npm 和 Python 3。使用锁定依赖与随源码保留的美术、字体；常规启动无需生成图片、重新制作字体或安装 Python 第三方库。

```sh
cd /workspace/111/journal
npm ci
npm test
npm run build:portable
```

`bash tools/install.sh` 是同一流程的辅助脚本：检查 Node/Python，使用工作区 npm 缓存，安装锁定依赖，运行单元测试与生产、单文件构建。

`build:portable` 输出 `dist/`、`release/yiri-journal.html`、`release/yiri-journal.zip` 与 `release/release-manifest.json`。构建验证内嵌资源、压缩包成员、CRC 和文件字节，并记录 SHA-256。`python3 tools/package-source.py` 另行打包可独立安装的 `release/yiri-journal-source.zip`，排除依赖和生成输出。

## 启动与验证

开发启动：

```sh
cd /workspace/111/journal
npm run dev
```

生产预览：

```sh
cd /workspace/111/journal
npm run preview
```

两者默认监听 `0.0.0.0:4180`。需要严格固定端口时，分别使用 `PORT=4180 bash tools/serve.sh dev` 和 `PORT=4180 bash tools/serve.sh preview`。端口占用时确认已有进程用途，不结束来源不明的进程。生产预览需要 `dist/index.html`；新任务中需重启服务，不能假定现场进程随环境快照恢复。

使用内部请求验证当前页面：

```sh
curl --fail --silent http://127.0.0.1:4180/ -o /tmp/yiri-journal-start.html
rg '一日一笺' /tmp/yiri-journal-start.html
```

随后运行 `BASE_URL=http://127.0.0.1:4180 npm run test:browser`。Playwright 使用环境现有 `/usr/bin/chromium`；尊重浏览器管理策略。按本轮实际报告核对通过、失败和跳过数量，旧版本的结果不自动适用于新版。检查范围与重现说明见 [QA.md](QA.md)。

云环境端口是内部地址，向用户提供平台实际提供并验证的预览入口。若浏览器限制 `file://`，保留管理策略，通过允许的 HTTP 载入与发布 HTML 完全一致的字节，再断网验证，并注明本地文件打开方式未在当前环境实测。

## 数据与视觉

内容自动保存在当前浏览器的 `localStorage`；照片只在浏览器内缩小与使用。存储失败会提示。JSON 导入导出可恢复全部手账，导入覆盖前先下载当前备份；PNG 导出规格为 `1280 × 1680`。应用无需账号、AI API 或 API 密钥，没有云端同步。

本版采用纸白 `#FFFEF9`、墨黑 `#242624` 与朱红 `#BD3E32` 的印刷视觉体系。主视觉为原创 SVG 品牌标记、封面与视觉规范板；素材层提供 8 件同系列印刷纸品。默认空白页保留书写空间，工具打开后再加入装饰。

`print-stickers.png` 为 4 列 × 2 行透明 atlas，生产渲染使用 `src/data/print.ts` 中的源矩形。旧 12 件小物、旧 SVG、布面封皮和纤维纸纹保留为旧藏与已保存内容的兼容资源；原封面 ID 继续兼容既有 JSON。来源见 [ART-SOURCES.md](ART-SOURCES.md)、[PRINT-ART.md](PRINT-ART.md) 和 [TACTILE-ART.md](TACTILE-ART.md)。

软件与字体许可证全文见 [NOTICES.txt](NOTICES.txt)。更换字体或分发衍生字体时保留 OFL 声明和实际来源。源码与离线文件交付、环境配置草稿保存各自记录实际状态；草稿保存不执行命令或发布快照，也不证明未来任务恢复已验证。

## 保留的美术工作台

`/workspace/111/art-workbench` 保持可用，默认端口 `4173`。查看或继续制作原素材时，使用其已有锁文件与脚本：

```sh
cd /workspace/111/art-workbench
PORT=4173 bash tools/serve.sh preview
```

安装、开发与验证细节见保留的 [cloud-start.md](../../art-workbench/docs/cloud-start.md)。手账的安装或打包任务不得覆盖工作台文件。

## 保留的旧 Godot 项目

旧游戏仍位于 `/workspace/111`，仅在用户重新明确要求该游戏时使用。保留其场景、脚本、美术、导出配置和已有更改。

原项目固定 Godot 4.6.3 / GDScript / GL Compatibility。以下是保留的原命令，不属于手账安装步骤：

```sh
cd /workspace/111
bash tools/setup.sh
bash tools/dev.sh import
bash tools/dev.sh test
bash tools/dev.sh build
bash tools/dev.sh release
python3 tools/package_release.py
bash tools/dev.sh smoke
bash tools/dev.sh pack-smoke
bash tools/dev.sh release-smoke
bash tools/dev.sh release-acceptance
bash tools/dev.sh capture
bash tools/dev.sh run
bash tools/dev.sh editor
```

使用详情见旧项目 [README.md](../../README.md)。其运行目录为 `/workspace/.godot-environment`，可通过 `LUMENFALL_RUNTIME_DIR` 与 `GODOT_BIN` 调整；新云任务需重新启动游戏、编辑器和虚拟显示。手账安装或打包不得覆盖旧项目成果。

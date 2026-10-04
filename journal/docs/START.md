# 当前工作流：一日一笺

当前应用位于 `/workspace/111/journal`，版本 `0.7.0`，默认端口 `4180`。默认进入记忆卡片：文字、真实照片和小事形成三维卡组，「收拢 / 展开」改变卡组的位置与旋转。使用「文字 / 照片 / 小事」或点击内容卡按需打开原生编辑面板；「记录 / 收藏 / 日历」切换记录、合集与回看。首次无数据仅显示空态入口，不预填记录。

「旧画布」保留原来的长页编辑、素材摆放和空间预览。两种工作方式读写相同的版本 1 数据，既有浏览器记录与 JSON 备份保持兼容，不迁移或覆盖原对象坐标。

保留 `/workspace/111` 中的美术工作台、旧 Godot 游戏及用户更改。使用现有检出，不额外创建 Git worktree。

## 安装、检查与构建

需要 Node.js 20.19+、22.12+ 或更新的受支持版本、npm 和 Python 3。使用锁定依赖与本地美术、字体；常规启动无需生成图片、下载外部模型或安装 Python 第三方库。

```sh
cd /workspace/111/journal
npm ci
npm test
npm run build:portable
```

`bash tools/install.sh` 是同一流程的辅助脚本：检查 Node/Python，使用工作区 npm 缓存，安装锁定依赖，运行单元测试与生产、单文件构建。运行时使用 `three@0.180.0`，类型使用 `@types/three@0.180.0`；实际 MIT 许可证随离线包和源码保留。

`build:portable` 输出 `dist/`、`release/yiri-journal.html`、`release/yiri-journal.zip` 与 `release/release-manifest.json`，验证资源内嵌、许可证、ZIP 成员、CRC、逐字节一致性及 SHA-256。`python3 tools/package-source.py` 另行生成可独立安装的源码 ZIP，排除依赖和构建输出。

## 启动与验证

```sh
cd /workspace/111/journal
PORT=4180 bash tools/serve.sh preview
```

开发使用 `PORT=4180 bash tools/serve.sh dev`；`npm run dev` 和 `npm run preview` 也默认监听 `0.0.0.0:4180`。端口占用时确认已有进程用途，不结束来源不明的进程。生产预览需要 `dist/index.html`；新任务需重启服务，不能假定现场进程随环境快照恢复。

```sh
curl --noproxy 127.0.0.1 --fail --silent http://127.0.0.1:4180/ -o /tmp/yiri-journal-start.html
rg '一日一笺' /tmp/yiri-journal-start.html
BASE_URL=http://127.0.0.1:4180 npm run test:browser
```

Playwright 使用已有 `/usr/bin/chromium`，保留浏览器管理策略。按本轮实际 JSON 核对通过、失败和跳过数量；旧结果不代替新版本验证。分别验证默认记忆卡片和旧画布：空态无假数据、实际文字/照片/小事输入、真实卡面与展合网格变化、卡点击和日期切换、自动保存恢复、两种 PNG 输出、全部数据备份、手机操作、GPU 中断和单文件断网。旧画布继续验证原生投影、拖动、缩放、旋转、历史与新旧素材恢复。范围见 [QA.md](QA.md)，引擎说明见 [MEMORY-ENGINE.md](MEMORY-ENGINE.md) 与 [3D-ENGINE.md](3D-ENGINE.md)。

记忆卡片使用 WebGL 2，不可用或绘制中断时仍可通过普通内容列表编辑、保存、导出；旧画布保留普通书写方式。减少动态偏好保留展合结果，停用不必要过渡。软件 WebGL 的结果不能推定所有设备帧率。

云环境端口是内部地址，只向用户提供平台实际提供并验证的预览入口。若浏览器限制 `file://`，保留策略，通过允许的真实 HTTP 载入与发布 HTML 完全一致的字节，再断网验证，并注明本地双击方式未在当前环境实测。

## 数据、导出与美术

内容自动保存在当前浏览器的 `localStorage`；照片只在本地缩小与使用。存储失败时提示并提供备份。应用无需账号、AI API 或密钥，没有云端同步。

记忆卡片 PNG 为 `1440 × 1024`，包含当天文字、小事与最多 6 张最新照片；面板和 JSON 保留全部照片。旧画布 PNG 为 `1280 × 1680`，保留全部原坐标拼贴。JSON 导入验证格式，覆盖前先下载当前备份。标题最多 24 字、正文 260 字、小事 5 条、对象 30 件、手账 20 份；显示范围不改变这些原数据。

苍墨文字卡、暖白照片卡、浅玉小事卡与横向留白形成默认视觉。卡面来自真实记录，几何、材质和光照由程序实时生成；本版不新增 AI 图片作为默认内容。旧画布的温玉 8 件、浮笺旧藏 8 件、印刷旧藏 8 件和旧藏小物 12 件继续兼容，但不显示在默认卡组。来源与提示词保留于 [ART-SOURCES.md](ART-SOURCES.md) 及各历史素材文档。

完整软件与字体许可证见 [NOTICES.txt](NOTICES.txt)。源码、离线文件、实际测试和环境配置草稿分别记录实际状态；草稿保存不执行命令、不发布快照，也不证明未来任务恢复已验证。

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

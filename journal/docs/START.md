# 当前工作流：一日一笺 · 浮笺

当前应用位于 `/workspace/111/journal`，版本 `0.6.0`，默认端口 `4180`。打开后直接编辑圆角数字画布，「记录 / 收藏 / 日历」切换编辑、合集与回看。日期锚点集中显示和切换日期；撤销、重做和「加内容」集中在短操作区，素材、文字与待办按需打开。可选「空间预览」查看同页内容的薄片错层和轻弧面，「继续书写」返回直接编辑。既有浏览器数据继续保留。

保留 `/workspace/111` 中的美术工作台、旧 Godot 游戏及用户更改。使用现有检出，不额外创建 Git worktree。

## 安装、检查与构建

需要 Node.js 20.19+、22.12+ 或更新的受支持版本、npm 和 Python 3。使用锁定依赖与随源码保留的美术、字体；常规启动无需生成图片、重新制作字体、下载外部模型或安装 Python 第三方库。

```sh
cd /workspace/111/journal
npm ci
npm test
npm run build:portable
```

`bash tools/install.sh` 是同一流程的辅助脚本：检查 Node/Python，使用工作区 npm 缓存，安装锁定依赖，运行单元测试与生产、单文件构建。运行时使用 `three@0.180.0`，开发类型使用 `@types/three@0.180.0`；Three.js 的实际 MIT 许可证随离线包和源码保留。

`build:portable` 输出 `dist/`、`release/yiri-journal.html`、`release/yiri-journal.zip` 与 `release/release-manifest.json`。构建验证内嵌资源、第三方与字体许可证、压缩包成员、CRC 和文件字节，并记录 SHA-256。`python3 tools/package-source.py` 另行打包可独立安装的 `release/yiri-journal-source.zip`，排除依赖和生成输出。

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
curl --noproxy 127.0.0.1 --fail --silent http://127.0.0.1:4180/ -o /tmp/yiri-journal-start.html
rg '一日一笺' /tmp/yiri-journal-start.html
```

随后运行 `BASE_URL=http://127.0.0.1:4180 npm run test:browser`。Playwright 使用环境现有 `/usr/bin/chromium`；尊重浏览器管理策略。按本轮实际报告核对通过、失败和跳过数量，旧版本的结果不自动适用于新版。检查初次打开即可原生编辑、记录/收藏/日历入口、按需工具、实际拖动缩放与撤销、空间预览、日期轻流转、本地保存恢复和离线导出。检查范围与重现说明见 [QA.md](QA.md)，几何与渲染说明见 [3D-ENGINE.md](3D-ENGINE.md)。

空间预览需要 WebGL 2。不可用或绘制中断时应显示状态并继续数字画布编辑，保留保存与导出。软件 WebGL 的检查结果不能推定所有设备帧率，正常设备性能按实际报告记录。

云环境端口是内部地址，向用户提供平台实际提供并验证的预览入口。若浏览器限制 `file://`，保留管理策略，通过允许的 HTTP 载入与发布 HTML 完全一致的字节，再断网验证，并注明本地文件打开方式未在当前环境实测。

## 数据与视觉

内容自动保存在当前浏览器的 `localStorage`；照片只在浏览器内缩小与使用。存储失败会提示。JSON 导入导出可恢复全部手账，导入覆盖前先下载当前备份；PNG 导出规格为 `1280 × 1680` 的页面图。应用无需账号、AI API 或 API 密钥，没有云端同步。

本版采用「温玉 × 苍墨」的现代东方视觉：背景 `#E8EBE4`、暖白 `#FCFBF6`、苍墨 `#183B35`、玉青 `#536F63` 与少量陶朱 `#BC745E`。日期侧栏、单张圆角画布与短操作区形成主次；收藏延续合集面板。空间预览由同页内容的独立薄片、轻微曲面和浅层高度构成；日期切换使用轻流转，减少动态效果偏好保留直接切换。文字编辑继续使用原生输入区。

八件薄玉素材为玉题签、玉界框、清流线、薄玉弧、玉索引、轻折片、玉叠片与玉朱点，使用 `src/assets/jade-kit.png`、`src/data/jade-art.ts` 和 `src/lib/jade-render.ts`；来源、实际提示词、透明布局与读取方式见 [JADE-ART.md](JADE-ART.md)。上一版八件光片保留在「浮笺旧藏」，旧八件印刷素材保留在「印刷旧藏」，十二件材质小物保留在「旧藏」，所有旧资源 ID 和 JSON 数据格式继续兼容。来源见 [ART-SOURCES.md](ART-SOURCES.md)、[FLOAT-ART.md](FLOAT-ART.md)、[PRINT-ART.md](PRINT-ART.md) 和 [TACTILE-ART.md](TACTILE-ART.md)。

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

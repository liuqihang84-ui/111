# 一日一笺

版本 `0.7.0` 将默认记录方式改为「记忆卡片」。当天的文字、照片和小事分别形成内容卡，打开即可看见真实三维层次；「收拢 / 展开」改变卡片的位置、旋转和遮挡。点击卡片或使用「文字 / 照片 / 小事」入口，再在原生面板编辑。默认首页不再是一张竖向长纸。

现代东方的表达转为苍墨主卡、暖白照片面、淡玉小事面与横向留白。三维来自内容卡之间的关系，不依靠新增装饰或生成背景。首次使用仅有一张空态文字入口卡和三种操作，不自动加入示例文字、照片、小事或记录。

## 记录与回看

- 「文字」编辑当天同一份标题与随笔，标题最多 24 字，随笔最多 260 字；并非无限新增文字片。
- 「照片」加入自己的 PNG、JPEG 或 WebP。单张最大 15 MB，在当前浏览器缩小后保存，不上传服务器。
- 「小事」新增、完成或删除当天的待办，最多 5 条。
- 内容卡组最多展示最新 6 张照片，面板和 JSON 备份保留全部照片；显示范围不会删除原数据。
- 「收藏」管理手账名称与视觉主题；「日历」回看和切换日期。内容自动保存，支持撤销与重做。
- 记忆卡片的 PNG 分享图为 `1440 × 1024`，包含当天的文字、最多 6 张最新照片与小事；全部内容以 JSON 备份为准。

卡组使用本地 Three.js 与 WebGL 2。绘制不可用时提供可操作的普通内容列表，继续编辑、保存与导出。系统的减少动态效果偏好保留收拢、展开的结果，减少过渡运动。

## 旧画布与数据兼容

「旧画布」保留此前的原生长页编辑和空间预览，可继续移动、缩放、旋转、复制、前置、删除照片与贴纸。其 PNG 导出沿用 `1280 × 1680`，使用原来的对象坐标与全部拼贴内容。

已有浏览器数据、手账 ID、资产 ID、`localStorage` 键和版本 1 JSON 格式不变。默认卡片读取同一份标题、随笔、照片与小事；没有把旧坐标重写成自动卡片位置。旧画布的 36 件素材继续保留：温玉 8 件、浮笺旧藏 8 件、印刷旧藏 8 件和旧藏小物 12 件。默认卡组不显示这些装饰。

## 本地保存与备份

内容自动保存在当前浏览器的 `localStorage`，无需账号或 API 密钥，没有云端同步。存储不可用或空间不足时，页面会提示并提供备份入口。

JSON 保存全部手账及可恢复的原数据。导入前验证格式，覆盖前先下载当前内容的备份；无效文件不会替换当前手账。不同浏览器、隐私窗口、网站地址和本地文件路径可能使用不同存储空间；移动文件、切换访问方式或清理浏览器数据前，请导出 JSON。

## 安装与启动

需要 Node.js 20.19+、22.12+ 或更新的受支持版本，以及 Python 3。Python 仅用标准库打包 ZIP。

```sh
npm ci
npm test
npm run build:portable
PORT=4180 bash tools/serve.sh preview
```

开发使用 `npm run dev`，生产预览使用 `npm run preview`。严格固定端口可用 `PORT=4180 bash tools/serve.sh dev` 或 `preview`。脚本监听 `0.0.0.0`；端口占用时明确失败，生产预览要求先生成 `dist/`。

依赖锁定包含 `three@0.180.0` 和 `@types/three@0.180.0`。记忆卡片的几何、材质、光照与展合由代码生成，卡面来自当前真实记录；不下载外部模型，不调用 AI API。引擎说明见 [MEMORY-ENGINE.md](docs/MEMORY-ENGINE.md)，旧画布说明保留在 [3D-ENGINE.md](docs/3D-ENGINE.md)。

浏览器验收使用 `BASE_URL=http://127.0.0.1:4180 npm run test:browser`。本轮结果以 [QA.md](docs/QA.md) 和实际生成的 JSON 为准，旧版通过结果不能代替新版验证。

## 离线与源码交付

`npm run build:portable` 生成静态 `dist/`、内嵌脚本、样式、美术与字体的 `release/yiri-journal.html`、包含中文说明及完整许可证的 `release/yiri-journal.zip`，以及大小、SHA-256、资源内嵌和 ZIP CRC 记录 `release/release-manifest.json`。

完整解压 ZIP 后，用现代 Chrome、Edge 或 Firefox 打开 HTML。记录、卡片展合和导出无需网络。构建拒绝残留的外部加载资源，并核对压缩包中每个文件的 CRC 和实际字节。若托管浏览器限制本地文件，保留策略，通过允许的真实 HTTP 载入完全相同的 HTML 字节再断网验收，实际方法与限制写入 QA。

```sh
python3 tools/package-source.py
```

此命令输出 `release/yiri-journal-source.zip`，解压后的 `journal/` 可独立安装。源码包包含源文件、测试、配置、锁文件、文档和本地美术，排除依赖与生成输出；打包核对 ZIP 成员、CRC 和源码字节，并生成 `release/source-manifest.json`。

## 美术、字体与保留项目

本版不新增 AI 图片作为默认视觉。卡片的空间形态由程序几何和当前记录组成，留白、苍墨、温玉与浅玉形成层次。旧素材来源、生成提示及文件检查保留在 [ART-SOURCES.md](docs/ART-SOURCES.md)、[JADE-ART.md](docs/JADE-ART.md)、[FLOAT-ART.md](docs/FLOAT-ART.md)、[PRINT-ART.md](docs/PRINT-ART.md) 和 [TACTILE-ART.md](docs/TACTILE-ART.md)，统一规范见 [VISUAL-IDENTITY.md](docs/VISUAL-IDENTITY.md)。

应用内嵌 Guanwu Serif，为 Noto Serif SC 的重命名衍生子集。软件、Three.js MIT 与字体许可证全文见 [NOTICES.txt](docs/NOTICES.txt)。

当前目录为 `/workspace/111/journal`，默认预览端口 `4180`。美术工作台保留在 `/workspace/111/art-workbench`，端口 `4173`；旧 Godot 项目继续保留。详见 [START.md](docs/START.md)。构建与打包只生成本地文件，不推送 Git、不部署网站，也不修改托管配置。

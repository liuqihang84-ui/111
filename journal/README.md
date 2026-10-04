# 一日一笺 · 印刷私记

版本 `0.3.0`：打开一页，写下日常。新用户从一本「日常」手账的空白页开始；已有手账继续使用当前浏览器保存的数据。纸页是主要工作区，文字直接编辑，素材、月历和导出按需打开。

这一版采用完整的印刷视觉体系：纸白 `#FFFEF9`、墨黑 `#242624`、朱红 `#BD3E32`，统一的册页标记、封面、细线、编号与文字层级。品牌标记、三种封面和视觉规范板为本项目原创 SVG；可加入的纸品采用同一套克制印刷语言。

## 记录与摆放

- 编辑标题和多行随笔，按日期分开保存；支持待办与当日心情。
- 在需要时打开素材工具，加入日印、远山、枝影、纸条、朱印、题签、双线框和索引签。
- 上传 PNG、JPEG 或 WebP 照片，单张最大 15 MB。照片在浏览器内缩小后保存，不上传服务器。
- 贴纸和照片可拖动、缩放、旋转、复制、调整前后顺序或删除；支持撤销和重做。
- 从手账列表创建册子、修改名称并选择封面；月历用于回看与切换日期。
- 「更多操作」提供当前纸页 PNG 导出与全部手账的 JSON 备份、恢复入口。

旧版小物与资源 ID 继续用于已保存的册页和备份兼容。新的纸品、封面与品牌标记组成当前主视觉，旧藏保留为可选内容。

## 本地数据

内容自动保存在当前浏览器的 `localStorage`，无需账号或 API 密钥。存储不可用或空间不足时，页面会提示，并提供备份入口。应用没有云端同步。

PNG 导出为 `1280 × 1680` 展示图片；JSON 保存可恢复编辑的全部手账。导入 JSON 先验证格式，覆盖前先下载当前内容的备份；无效备份不会替换当前手账。

不同浏览器、隐私窗口、网站地址和本地文件路径可能使用不同存储空间。移动文件、切换访问方式或清理浏览器数据前，请导出 JSON。

## 安装与启动

需要 Node.js 20.19+、22.12+ 或更新的受支持版本，以及 Python 3。Python 只使用标准库打包 ZIP。

在此目录运行：

```sh
npm ci
npm test
npm run build:portable
PORT=4180 bash tools/serve.sh preview
```

开发模式使用 `npm run dev`；生产预览可使用 `npm run preview`。需要严格固定端口时，使用 `PORT=4180 bash tools/serve.sh dev` 或 `preview`。启动脚本监听 `0.0.0.0`，端口占用时明确失败；生产预览要求已生成 `dist/`。

浏览器验收使用 `BASE_URL=http://127.0.0.1:4180 npm run test:browser`。当前版本的执行范围与实际结果记录在 [QA.md](docs/QA.md)，应按本轮生成的报告确认结果；这里不将命令清单或旧版本结果作为新版通过证明。

## 离线与源码交付

`npm run build:portable` 生成：

- `dist/`：静态生产构建。
- `release/yiri-journal.html`：内嵌脚本、CSS、美术和字体的离线单文件。
- `release/yiri-journal.zip`：单文件 HTML、中文使用说明和完整许可证说明。
- `release/release-manifest.json`：文件大小、SHA-256、资源检查与 ZIP CRC 记录。

将 ZIP 完整解压后，用现代 Chrome、Edge 或 Firefox 打开 HTML。构建会拒绝残留的外部加载资源，并校验压缩包中每个文件的 CRC 和实际字节。环境对本地文件访问的限制与实际验收方式写入 QA 记录。

独立源码包使用：

```sh
python3 tools/package-source.py
```

输出 `release/yiri-journal-source.zip`，解压后的 `journal/` 可独立执行上述安装命令。源码包包含源文件、测试、配置、锁文件、文档和本地美术，排除依赖目录与生成输出；打包脚本核对 ZIP 文件名、CRC 和源码字节，并生成 `release/source-manifest.json`。

## 美术、字体与保留项目

新纸品由 image_gen 生成，品牌标记、封面与视觉规范板由本项目以 SVG 程序绘制；素材和视觉规范板随源码交付，应用实际使用的图像与字体内嵌于离线 HTML。来源见 [ART-SOURCES.md](docs/ART-SOURCES.md)，新纸品的提示词、尺寸与透明检查见 [PRINT-ART.md](docs/PRINT-ART.md)。旧材质的生成记录仍保留在 [TACTILE-ART.md](docs/TACTILE-ART.md)。

应用内嵌 Guanwu Serif，为 Noto Serif SC 的重命名衍生子集；软件和字体版权声明及许可证全文见 [NOTICES.txt](docs/NOTICES.txt)。

当前目录为 `/workspace/111/journal`，默认预览端口 `4180`。美术工作台保留在 `/workspace/111/art-workbench`，使用端口 `4173`；旧 Godot 项目也保留。启动说明见 [START.md](docs/START.md)。构建与打包在本地生成文件，不推送 Git、不部署网站，也不修改托管配置。

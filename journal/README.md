# 一日一笺 · 立体册页

版本 `0.4.0`：打开的是一本可操作的册子。封面、书脊、页芯与弯曲纸页由 Three.js 实时绘制；开合、拖动查看角度和切换日期会改变册子的几何与受光。纸白、墨黑、朱红的印刷识别系统继续贯穿封面、字标、纸品和编辑工具。

新用户先看到一本「日常」的合拢册子。点封面或「打开手账」展开，点击右页或「写一笔」进入当前页的直接编辑；「看整册」回到立体浏览。已有浏览器手账与 JSON 备份继续兼容。

## 记录与摆放

- 编辑标题和多行随笔，按日期保存，支持待办与当日心情。相邻日期的切换使用真实曲面翻页。
- 需要时打开素材工具，加入日印、远山、枝影、纸条、朱印、题签、双线框和索引签。
- 上传 PNG、JPEG 或 WebP 照片，单张最大 15 MB。照片在浏览器内缩小后保存，不上传服务器。
- 纸品与照片可拖动、缩放、旋转、复制、调整前后顺序或删除，支持撤销和重做。立体浏览时，每张纸品或照片是独立的薄片网格。
- 从「册」创建手账、修改名称并选择朱页、墨页或素页封面；「历」用于回看与切换日期。
- 「更多操作」提供当前纸页 PNG 导出和全部手账的 JSON 备份、恢复入口。

文字编辑使用与三维右页对齐的原生输入区，保持正常的中文输入、选择与键盘操作。3D 浏览需要现代浏览器的 WebGL 2；不可用时会显示状态并继续普通书写。系统的减少动态效果偏好保留全部功能，减少过渡运动。

## 本地数据

内容自动保存在当前浏览器的 `localStorage`，无需账号或 API 密钥。存储不可用或空间不足时，页面会提示并提供备份入口。应用没有云端同步。

PNG 导出为 `1280 × 1680` 的平面册页图片，适合分享；JSON 保存可恢复编辑的全部手账。导入 JSON 先验证格式，覆盖前先下载当前内容的备份；无效备份不会替换当前手账。

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

依赖锁定包含 `three@0.180.0`，开发类型为 `@types/three@0.180.0`。书物几何、材质与光照由代码创建；常规安装与启动不下载外部模型，不需要生成图片或调用 AI API。

浏览器验收使用 `BASE_URL=http://127.0.0.1:4180 npm run test:browser`。本轮执行范围与实际结果以 [QA.md](docs/QA.md) 和生成的报告为准，旧版本通过结果不代替新版验证。三维实现与检查接口见 [3D-ENGINE.md](docs/3D-ENGINE.md)。

## 离线与源码交付

`npm run build:portable` 生成：

- `dist/`：静态生产构建。
- `release/yiri-journal.html`：内嵌脚本、CSS、美术和字体的离线单文件。
- `release/yiri-journal.zip`：单文件 HTML、中文使用说明和完整许可证说明。
- `release/release-manifest.json`：文件大小、SHA-256、资源检查与 ZIP CRC 记录。

将 ZIP 完整解压后，用现代 Chrome、Edge 或 Firefox 打开 HTML。Three.js、材质与页面内容都在本地运行；记录、3D 浏览与导出无需网络。构建会拒绝残留的外部加载资源，并校验压缩包中每个文件的 CRC 和实际字节。托管环境如限制本地文件访问，应保留策略，以允许的 HTTP 载入完全相同的 HTML 字节再断网验证；实际方法与限制写入 QA 记录。

独立源码包使用：

```sh
python3 tools/package-source.py
```

输出 `release/yiri-journal-source.zip`，解压后的 `journal/` 可独立执行上述安装命令。源码包包含源文件、测试、配置、锁文件、文档和本地美术，排除依赖目录与生成输出；打包脚本核对 ZIP 文件名、CRC 和源码字节，并生成 `release/source-manifest.json`。

## 美术、字体与保留项目

实时册子是本项目的程序建模：有厚度的封皮与书脊、页芯、分段纸面和实时光照。标题、正文、日期与待办绘制为当前纸页的印刷纹理，纸品与照片各自成为独立的三维薄片。全部来自本地代码和当前手账内容，无外部 GLTF 或在线材质依赖。

八件新纸品由 image_gen 生成；品牌标记、平面封面和视觉规范板由本项目以 SVG 程序绘制。来源见 [ART-SOURCES.md](docs/ART-SOURCES.md)，纸品提示词、尺寸与透明检查见 [PRINT-ART.md](docs/PRINT-ART.md)，独立 UI / VI 见 [VISUAL-IDENTITY.md](docs/VISUAL-IDENTITY.md)。旧版十二件小物及其资源 ID 保留于「旧藏」和历史手账兼容，旧材质的生成记录仍见 [TACTILE-ART.md](docs/TACTILE-ART.md)。

应用内嵌 Guanwu Serif，为 Noto Serif SC 的重命名衍生子集。软件和字体版权声明及许可证全文见 [NOTICES.txt](docs/NOTICES.txt)，其中保留实际分发的 Three.js MIT 许可证。

当前目录为 `/workspace/111/journal`，默认预览端口 `4180`。美术工作台保留在 `/workspace/111/art-workbench`，使用端口 `4173`；旧 Godot 项目也保留。启动说明见 [START.md](docs/START.md)。构建与打包在本地生成文件，不推送 Git、不部署网站，也不修改托管配置。

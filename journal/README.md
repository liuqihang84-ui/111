# 一日一笺 · 电子手账

版本 `0.2.0`：在一张有布面书册、纸页和文具的实体桌面上记录日常。桌面与手机都可以编辑；内容保存在当前浏览器，不需要账号或 API 密钥，也没有云端同步。

初次打开先看到两本示例手账。可创建新册、修改名称，并选择同一张新布面山水 PNG 的三种封面配色。书册厚度、悬起、掀封面和翻页由 CSS 3D 变换与阴影实现；可编辑纸面保持平面缩放。每本手账按日期分开记录，可用月历、日期输入和前后日按钮切换纸页。

## 记录与装饰

- 直接编辑标题和多行随笔，添加待办、勾选完成，并选择当日心情。
- 使用 12 枚透明 PNG 材质小物，包括白花枝、梅枝、竹叶、团扇、茶盏和线装书；纸底采用新的纤维纸纹 PNG。
- 贴纸和照片可以拖动、用圆角手柄缩放、旋转、摆正或删除；浮动工具提供撤销、重做、复制与置于最前。
- 上传 PNG、JPEG 或 WebP 照片，单张最大 15 MB。照片在浏览器内缩小后保存，不上传服务器。
- 编辑自动保存到 `localStorage`。存储不可用或空间不足时，页面明确提示并提供备份入口。
- 将当前完整纸页导出为 `1280 × 1680` PNG；将全部手账导出为 JSON 备份。
- 导入 JSON 时先验证格式，并在覆盖前下载当前内容的备份。无效备份不会替换当前手账。

手机界面使用紧凑导航和可展开的素材托盘，标题与随笔另有 16px 输入区；触摸拖动和手柄缩放会将素材限制在纸页范围内。示例内容可以直接修改；切换日期可开始空白新页。

## 安装与启动

需要 Node.js 20.19+、22.12+ 或更新的受支持版本，以及 Python 3。Python 只使用标准库打包 ZIP。

在此目录运行：

```sh
npm ci
npm test
npm run build:portable
PORT=4180 bash tools/serve.sh preview
```

开发模式使用 `PORT=4180 bash tools/serve.sh dev`。启动脚本监听 `0.0.0.0` 并严格使用指定端口，端口占用时会明确失败。生产预览要求已生成 `dist/`。

浏览器验收另行运行 `npm run test:browser`。本次 31 项单元测试和 13 项浏览器检查通过，执行范围与实际结果见 [QA.md](docs/QA.md)；命令清单本身不是测试结果。

## 离线与源码交付

`npm run build:portable` 生成：

- `dist/`：静态生产构建。
- `release/yiri-journal.html`：内嵌脚本、CSS、美术和字体的离线单文件。
- `release/yiri-journal.zip`：单文件 HTML、中文使用说明和完整许可证说明。
- `release/release-manifest.json`：文件大小、SHA-256、资源检查与 ZIP CRC 检查记录。

将 ZIP 完整解压后，用现代 Chrome、Edge 或 Firefox 打开 HTML。构建会拒绝残留的外部加载资源，并校验压缩包中每个文件的 CRC 和实际字节。当前环境若限制本地文件访问，验收方式和限制会写入 QA 记录。

独立源码包使用：

```sh
python3 tools/package-source.py
```

输出 `release/yiri-journal-source.zip`，解压后的 `journal/` 可独立执行上述安装命令，无需旁边的 `art-workbench`。源码包包含源文件、测试、配置、锁文件、文档和本地美术，排除依赖目录与生成输出；打包脚本逐项核对 ZIP 文件名、CRC 和源码字节，并生成 `release/source-manifest.json`。

不同浏览器、隐私窗口、网站地址和本地文件路径可能使用不同存储空间。移动文件、切换访问方式或清理浏览器数据前，请导出 JSON；PNG 是展示图片，JSON 才是可恢复编辑的完整备份。

## 美术与保留项目

本版布面封皮、透明小物和纸纹由 image_gen 为本项目生成并本地内嵌；12 枚小物从一张透明 PNG 精灵图按格读取。旧 SVG 与资源 ID 保留兼容，其中 `icon-orchid` 在新图中显示为白花枝。来源见 [ART-SOURCES.md](docs/ART-SOURCES.md)，详细生成记录见 [TACTILE-ART.md](docs/TACTILE-ART.md)。本项目内嵌 Guanwu Serif 字体，为 Noto Serif SC 的重命名衍生子集；软件与字体的版权声明和许可证全文见 [NOTICES.txt](docs/NOTICES.txt)。

当前工作目录为 `/workspace/111/journal`，默认预览端口为 `4180`。此前的美术工作台仍保留在 `/workspace/111/art-workbench`，可独立使用 `4173`；旧 Godot 游戏文件也保留，只有用户明确重新选择该项目时才启动。启动说明见 [START.md](docs/START.md)。本项目的构建与打包不推送 Git、不部署网站，也不修改托管配置。

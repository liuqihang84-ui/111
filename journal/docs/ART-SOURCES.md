# 一日一笺 0.6.0 · 美术与字体来源

当前主视觉为「温玉 × 苍墨」：背景 `#E8EBE4`、暖白 `#FCFBF6`、苍墨 `#183B35`、玉青 `#536F63` 与少量陶朱 `#BC745E`。现代东方的取向体现在留白、明度秩序与轻薄玉质的受光，素材服务于数字页面编排。全部使用本地代码、图像、字体与当前记录，无在线素材依赖。

## 薄玉素材（0.6.0）

八件素材由 image_gen 为本项目生成：玉题签、玉界框、清流线、薄玉弧、玉索引、轻折片、玉叠片与玉朱点。当前素材托盘优先显示这一组，历史图集继续随应用保留。

| 文件 | 来源与用途 |
| --- | --- |
| `src/assets/jade-kit.png` | 为本项目生成的透明 RGBA atlas；保留生成源 PNG 字节。 |
| `src/data/jade-art.ts` | 八件素材的 ID、名称、读取矩形与推荐摆放尺寸。 |
| `src/lib/jade-render.ts` | 浏览器运行时的图集读取与普通 canvas 裁取。 |

实际生成来源、完整提示词、最终尺寸、文件字节、SHA-256 和透明布局检查集中记录于 [JADE-ART.md](JADE-ART.md)。此处不沿用旧图集的尺寸或哈希。UI 精确色值与生成图中的受光、抗锯齿邻近色分别记录。

这些图形是现代电子手账的原创素材，不是历史作品扫描、馆藏复制或文物复原，没有虚构古代作者、年代或出处。

## 合集图形

三张 SVG 由本项目以程序绘图原创制作，与当前材质和配色一起组织收藏面板及主题选择。图形源码随项目提供，不使用外部馆藏图或器物照片。

| 文件 | 显示名称 | 保留的数据 ID |
| --- | --- | --- |
| `src/assets/cover-premium-jade.svg` | 青釉 | `mountain` |
| `src/assets/cover-premium-clay.svg` | 陶朱 | `orchid` |
| `src/assets/cover-premium-mist.svg` | 玉白 | `indigo` |

映射定义在 `src/data/identity.ts`。沿用历史数据 ID，保持已保存手账和 JSON 备份兼容。上一版 `cover-float-jade.svg`、`cover-float-clay.svg` 与 `cover-float-mist.svg` 为本项目原创 SVG，其文件与来源说明保留。

## 实时空间预览

`src/lib/book-scene.ts` 使用 `three@0.180.0`。圆角数字画布、轻弧面、薄玉边缘、浅高度差、材质、光照与日期流转由浏览器实时计算。不使用外部 GLTF、模型库、在线环境图或在线材质。

`src/lib/page-texture.ts` 将当前页面内容绘制为当页纹理，照片与装饰转换为独立薄片，其尺寸、位置、旋转与保存的对象一致。日期在页外集中显示；原生编辑与空间纹理使用相同的内容布局。空间画布使用透明圆角，分享 PNG 保留完整矩形画幅。

原生编辑、空间预览与当前页面 PNG 导出的照片统一为无框圆角图块。在浏览器内读取原照片、按图块尺寸裁取并裁出圆角，不调用图像生成工具，也不上传服务器。此说明对应当前 `appearance: 'print'` 导出路径；历史调用保留的旧路径继续服务兼容。

空间实现见 [3D-ENGINE.md](3D-ENGINE.md)，独立 UI / VI 见 [VISUAL-IDENTITY.md](VISUAL-IDENTITY.md)。Three.js 原始 MIT 许可证全文与版本见 [NOTICES.txt](NOTICES.txt)。页面和图层为现代界面设计，没有宣称复原某件古代纸品或器物。

## 浮笺旧藏（0.5.0）

原有八件光片保留于「浮笺旧藏」：弧光、小折、云阶、留白框、波纹、月牙、微光与书签。图集 `src/assets/float-kit.png`、元数据 `src/data/float-art.ts` 与裁取模块 `src/lib/float-render.ts` 继续保留。

该历史 PNG 为 `1774 × 887`，`303098` 字节，SHA-256 为 `f507a5943fcbcec2237008bcadf3ebcb6a727ac5f41fec64ae7930a9f6caa9b2`。来源、生成提示和透明布局见 [FLOAT-ART.md](FLOAT-ART.md)，这些数据不用于证明新版薄玉图集。

## 印刷旧藏（0.3.0）

原有八件印刷图形保留于「印刷旧藏」，用于历史内容与可选装饰。以下尺寸、哈希和来源属于该历史资产，未作为浮笺新图形的检查数据。

| 文件 | 来源与用途 |
| --- | --- |
| `src/assets/print-stickers.png` | image_gen 为本项目生成的 4 列 × 2 行透明 RGBA atlas。 |
| `src/data/print.ts` | 纸品 ID、名称、源矩形与推荐摆放尺寸；运行时按源矩形读取 PNG。 |

8 件素材为日印、远山、枝影、纸条、朱印、题签、双线框与索引签。素材内不包含可读文字，题字和编号由应用排版决定。精确 UI 色值与生成图中的印刷颗粒、抗锯齿邻近色有所区别，不将 PNG 声称为仅含三个精确 RGB 值。

最终 PNG 为 `1774 × 887`，`291573` 字节，SHA-256 为 `f76ea782bee3fde6e9bab93bb5f8e0535c198a373ec671763c9208d08d8474c8`。提示词、两次生成来源、格线 alpha 检查和实际审图记录见 [PRINT-ART.md](PRINT-ART.md)。

这些图形表达现代册页印刷方向，不是历史作品、馆藏复制图或文物复原，没有虚构古代出处。

## 历史原创 SVG 识别系统

以下资源由本项目通过 SVG 程序绘制，图形与布局源码随项目提供：

| 文件 | 使用方式 |
| --- | --- |
| `src/assets/brand-mark.svg` | 历史印刷品牌图形的原路径；现版本如更新该图形，仍为本项目原创 SVG。 |
| `src/assets/cover-print-red.svg` | 朱红方向的印刷封面。 |
| `src/assets/cover-print-ink.svg` | 墨黑方向的印刷封面。 |
| `src/assets/cover-print-paper.svg` | 纸白方向的印刷封面。 |
| `src/assets/identity-board.svg` | 本项目原创视觉规范板，随当前 UI / VI 更新。 |

三张历史印刷封面属于原识别系统，文件与来源继续保留；`mountain`、`orchid`、`indigo` 数据 ID 在本版映射到上述青釉、陶朱、玉白合集图形，以继续打开此前保存的手账与 JSON 备份。SVG 为本项目原创程序绘图，既不引用外部馆藏图，也不声称具有古代年代或作者归属。

## 旧藏与兼容资源

旧资源继续随源码保存，用于已有内容与备份兼容，不作为本版的品牌主素材。

| 文件 | 原来源与保留用途 |
| --- | --- |
| `src/assets/tactile-stickers.png` | 0.2.0 经 image_gen 生成的 4 列 × 3 行透明 PNG，含 12 件材质小物。 |
| `src/assets/tactile-cover.png` | 0.2.0 生成的同一张布纹山水封皮；旧版使用三种配色，并非三幅不同画作。 |
| `src/assets/tactile-paper.png` | 0.2.0 生成的纤维纸纹。 |

12 件旧小物为白花枝、梅枝、竹叶、莲瓣、银杏、团扇、茶盏、线装书、油纸伞、月钩、闲章和燕归。其中白花枝保留原 ID `icon-orchid`，该 ID 不表示已鉴定其植物品种。旧材质的提示词、调用时间、源文件、尺寸、哈希和透明检查见 [TACTILE-ART.md](TACTILE-ART.md)。

更早的 SVG 来源为同一工作区的 `art-workbench` 本地原创素材库，图形源码见 [materials.ts](../../art-workbench/src/data/materials.ts)。这些图形以传统形式为灵感，采用现代简化矢量图形；没有使用历史扫描图或馆藏复制图。

保留资源包括：

- 小物 ID：`icon-orchid`、`icon-plum`、`icon-bamboo`、`icon-fan`、`icon-moon`、`icon-seal`、`icon-teacup`、`icon-book`、`icon-lotus`、`icon-ginkgo`、`icon-umbrella`、`icon-swallow`。
- 装饰：`frame-key-corners`、`texture-paper-fibers`、`pattern-bluewhite-vine`。
- 场景：`scene-southern-river`、`scene-bluegreen-ridges`、`scene-literati-bank`。
- 重组作品：`cover-mountain.svg`、`cover-orchid.svg`、`cover-indigo.svg`、`demo-landscape.svg`，由本地简化母题组合、布局和改色而成。

这些既有作品不对应某件古画、器物或工艺实物的复刻。美术工作台与旧 Godot 项目继续保留在各自目录。

## 字体与许可证

字体从 `art-workbench/src/assets` 复制为 `src/assets/guanwu-serif.woff2`。原项目记录的 Guanwu Serif 为 Noto Serif SC 的重命名衍生子集，采用 SIL Open Font License 1.1。Google Fonts 原始字体来源为：

https://raw.githubusercontent.com/google/fonts/main/ofl/notoserifsc/NotoSerifSC%5Bwght%5D.ttf

字体的版权声明与许可证全文见 [FONT-LICENSE.txt](../src/assets/FONT-LICENSE.txt)，软件及字体分发说明见 [NOTICES.txt](NOTICES.txt)。不更改原版权人或将生成美术的来源说明替代字体许可证。

应用不依赖在线图片或字体服务；正常启动不需要重新生成素材。当前版本的实际运行与发布包验证结果见 [QA.md](QA.md)，旧版本验收结果不代替本轮验收。

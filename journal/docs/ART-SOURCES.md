# 一日一笺 0.3.0 · 美术与字体来源

当前主视觉采用统一印刷体系：纸白 `#FFFEF9`、墨黑 `#242624`、朱红 `#BD3E32`。品牌标记、封面、细线与编号的布局由本项目原创设计；素材层的 8 件纸品采用同一配色与薄纸、印墨质感。素材随源码、生产页面和离线 HTML 交付。

## 新印刷纸品

| 文件 | 来源与用途 |
| --- | --- |
| `src/assets/print-stickers.png` | image_gen 为本项目生成的 4 列 × 2 行透明 RGBA atlas。 |
| `src/data/print.ts` | 纸品 ID、名称、源矩形与推荐摆放尺寸；运行时按源矩形读取 PNG。 |

8 件素材为日印、远山、枝影、纸条、朱印、题签、双线框与索引签。素材内不包含可读文字，题字和编号由应用排版决定。精确 UI 色值与生成图中的印刷颗粒、抗锯齿邻近色有所区别，不将 PNG 声称为仅含三个精确 RGB 值。

最终 PNG 为 `1774 × 887`，`291573` 字节，SHA-256 为 `f76ea782bee3fde6e9bab93bb5f8e0535c198a373ec671763c9208d08d8474c8`。提示词、两次生成来源、格线 alpha 检查和实际审图记录见 [PRINT-ART.md](PRINT-ART.md)。

这些图形表达现代册页印刷方向，不是历史作品、馆藏复制图或文物复原，没有虚构古代出处。

## 原创 SVG 识别系统

以下资源由本项目通过 SVG 程序绘制，图形与布局源码随项目提供：

| 文件 | 使用方式 |
| --- | --- |
| `src/assets/brand-mark.svg` | 统一的品牌标记。 |
| `src/assets/cover-print-red.svg` | 朱红方向的印刷封面。 |
| `src/assets/cover-print-ink.svg` | 墨黑方向的印刷封面。 |
| `src/assets/cover-print-paper.svg` | 纸白方向的印刷封面。 |
| `src/assets/identity-board.svg` | 品牌色、标记、封面与册页语言的视觉规范板。 |

三张封面属于同一识别系统，现有 `mountain`、`orchid`、`indigo` 封面 ID 保持兼容，以继续打开此前保存的手账与 JSON 备份。SVG 为本项目原创程序绘图，既不引用外部馆藏图，也不声称具有古代年代或作者归属。

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

# 一日一笺 0.2.0 · 美术与字体来源

`0.2.0` 的主要视觉使用本项目通过 image_gen 生成的布面封皮、透明小物与纤维纸纹 PNG，素材随源码、生产页面和离线 HTML 本地内嵌。书册的厚度、桌面光影、封面掀开和翻页由 CSS 3D 变换与阴影呈现；编辑纸面保持平面缩放。

## 当前材质素材

| 本地文件 | 使用方式 |
| --- | --- |
| `src/assets/tactile-cover.png` | 一张布纹山水封皮 PNG，以三种配色呈现封面；不是三幅不同来源的画作。 |
| `src/assets/tactile-stickers.png` | 4 列 × 3 行的透明 RGBA PNG 精灵图，按格读取 12 枚材质小物。 |
| `src/assets/tactile-paper.png` | 新纤维纸纹 PNG，作为编辑纸面与导出 PNG 的共同纸底。 |

12 枚小物分别为白花枝、梅枝、竹叶、莲瓣、银杏、团扇、茶盏、线装书、油纸伞、月钩、闲章和燕归。材质包括叶脉、花瓣、丝织、竹骨、陶瓷釉面、布面线装与纸层；透明区域随 PNG 保留。

白花枝仍使用已有资源 ID `icon-orchid`，以兼容旧手账与 JSON 备份。该 ID 不表示新图中的植物已经鉴定为某一品种。

生成提示词、调用时间、源文件、最终尺寸、SHA-256、精灵图格线及透明像素检查详见 [TACTILE-ART.md](TACTILE-ART.md)。生成描述中的中国册页、青绿山水与吴门画风是形式和配色方向，不是历史作品出处或馆藏复刻声明。实际运行与发布包检查见 [QA.md](QA.md)。

## 保留的 SVG 与既有素材来源

旧 SVG 和资源 ID 保留兼容，其来源为同一工作区的 `art-workbench` 本地素材库，图形源码见 [materials.ts](../../art-workbench/src/data/materials.ts)。这些图形以传统形式为灵感，设计为现代简化矢量图，没有使用历史扫描图或馆藏复制图。

保留资源包括：

- 小物 ID：`icon-orchid`、`icon-plum`、`icon-bamboo`、`icon-fan`、`icon-moon`、`icon-seal`、`icon-teacup`、`icon-book`、`icon-lotus`、`icon-ginkgo`、`icon-umbrella`、`icon-swallow`。
- 装饰：`frame-key-corners`、`texture-paper-fibers`、`pattern-bluewhite-vine`。
- 场景：`scene-southern-river`、`scene-bluegreen-ridges`、`scene-literati-bank`。
- 重组作品：`cover-mountain.svg`、`cover-orchid.svg`、`cover-indigo.svg` 和 `demo-landscape.svg`，由本地简化矢量母题组合、布局与改色而成。

既有矢量作品参考册页留白、江岸小景、山水叠嶂、蓝白纹样与靛蓝色调，不对应某件古画、器物或工艺实物的复刻。原美术工作台与旧 Godot 项目仍保留在各自目录，没有被新材质替换或覆盖。

## 字体

字体从 `art-workbench/src/assets` 复制为 `src/assets/guanwu-serif.woff2`。原项目记录的 `Guanwu Serif` 为 Noto Serif SC 的重命名衍生子集，采用 SIL Open Font License 1.1。随字体保留的版权声明与许可证全文见 [FONT-LICENSE.txt](../src/assets/FONT-LICENSE.txt)，软件及字体分发说明见 [NOTICES.txt](NOTICES.txt)。

页面显示不依赖在线图片或字体服务；正常使用不需要重新生成这些素材。

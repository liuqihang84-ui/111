# 浮笺 · 釉光图形家族

本组服务于数字手账的轻盈、留白与层次感。弧、折、阶、框、线、月弧、色点和切角签采用同一套低浮雕、柔倒角、哑光釉色语汇，避免桌面道具、纸布纹理和写实文具。玉白 / 深青 / 青釉 / 浅釉 / 陶朱是设计约束，生成像素含明暗变化，不等同于纯色填充。

这是一套新设计的抽象数字图形；青釉配色与克制比例是对中国美学的当代转译。没有将生成图冒称为历史文物、传统纹样复刻或可考证的古代技法。它们是可选择的创作素材，不是首次打开自动堆入页面的装饰。

## 实际资产与来源

- 资产：`src/assets/float-kit.png`
- 数据：`src/data/float-art.ts`，导出 `floatAtlasSrc`、`floatAtlasSize`、`floatStickerCells`
- 运行时准备：`src/lib/float-render.ts`，导出 `floatArt` 与 `prepareFloatArt()`
- 生成工具：本会话的 `image_gen.imagegen`，`transparent_background: true`，全新生成，没有参考图或照片输入
- 生成日期：2026-10-04（Asia/Shanghai）
- 原始生成路径：`/workspace/generated_images/exec-c89f55e1-b287-4d2a-a364-f6c326dab090.png`
- 文件：RGBA PNG，1774 × 887 像素，303,098 字节
- SHA-256：`f507a5943fcbcec2237008bcadf3ebcb6a727ac5f41fec64ae7930a9f6caa9b2`
- 交付文件逐字节复制原始生成 PNG；不做重绘、去底、颜色替换、清理边缘或重新编码。

第一轮尝试未采用，原因是部分图形靠近网格边界，裁剪不利于稳定的素材选择区域。最终轮通过更小图形、更宽透明间距和更轻的体块重新生成。未采用文件留在原生成目录，不作为项目素材。

## 实测透明边界与显示尺寸

布局为四列两行。PNG alpha 范围为 0–255；每格含独立可见轮廓。读取原文件像素，以 alpha > 4 的边界加四边各 8 像素留白定义运行时 source 矩形。原生成文件在部分远离轮廓的透明区仍有 alpha 1–4 的极淡杂点，因此 source 不采用所有非零像素的宽大包围盒。这个选择只决定取图区域，不修改任何保留区域的像素。

| ID | 名称 | 原图 source：x, y, w, h | 默认纸面尺寸：w × h |
| --- | --- | --- | --- |
| `float-arc` | 弧光 | 150, 138, 212, 212 | 96 × 96 |
| `float-fold` | 小折 | 591, 133, 196, 227 | 90 × 104 |
| `float-steps` | 云阶 | 980, 145, 231, 215 | 124 × 115 |
| `float-frame` | 留白框 | 1398, 133, 218, 228 | 140 × 146 |
| `float-ripple` | 波纹 | 136, 568, 266, 134 | 170 × 86 |
| `float-crescent` | 月牙 | 591, 514, 195, 238 | 92 × 112 |
| `float-glow` | 微光 | 1008, 557, 191, 173 | 72 × 65 |
| `float-bookmark` | 书签 | 1481, 513, 106, 231 | 44 × 96 |

`prepareFloatArt()` 先确认图像的实际 `naturalWidth` / `naturalHeight` 与声明相同，再使用 Canvas 按上述区域取图为透明 PNG data URL。过程保留负空间和原图 alpha，不添背景或烘焙应用阴影。主体已经含浅浮雕明暗，界面只需克制的交互阴影，避免叠加浓重的写实材质效果。

新 ID 与原有 8 个印刷素材和 12 个旧藏素材不同。旧 ID、旧备份和已有页面的素材解析应继续保留；新增仅扩展可选图形家族。

## 本组素材验证

已在项目真实 Vite 开发服务中用 Chromium 动态加载准备器，连续两次调用得到同一准备结果：Map 内 8 个 ID 齐全，每张输出 PNG 的实际宽高等于 source 矩形；8 张均同时有全透明像素和 alpha > 4 的可见像素。独立素材检查页以约 110 像素显示时已实看，开放框和波纹的负空间保留，没有裁掉主体。这只验证本组取图与显示，不替代整站交互、离线或包下载的验收。

## 最终实际生成提示词

下文是本轮传给生成工具的完整提示词，不是事后改写的艺术说明：

```text
Generate one ORIGINAL sprite atlas for an elegant digital journal called Floating Notes. PNG with TRUE TRANSPARENT background. Canvas wide landscape ratio 2:1. EXACTLY eight isolated abstract designed UI sculptures in a 4 column by 2 row layout, NO labels or text. Keep EACH object's visible silhouette entirely INSIDE THE MIDDLE 65% of its grid cell, with at least 60 pixels completely transparent spacing between objects. Objects smaller, more refined; do NOT fill the cell or cross cell edges.

ART DIRECTION: stylized contemporary celadon-inspired digital minimalism, NOT photoreal objects. Very shallow 3D low relief, only a subtle thin soft bevel, matte smooth color planes. Mostly front facing, near orthographic. Simple clean vector-like silhouettes with sophisticated gentle designed shading. Palette only warm white #FFFDF8, celadon #608678, pale celadon #DCE8E0, deep teal #283F3C, terracotta #C87560. Uniform light upper left. No shiny specular highlights, NO realistic ceramic photography, NO gritty textures, no environmental shadows, no cast shadow on background, NO noise, no grains, no colored edge fringes. Surrounding pixels must be empty transparent. No background planes, no floor, no paper, no cloth, no desk, no realistic notebook.

Top row, left to right:
1) ARC LIGHT: a compact single quarter-circle arc, a slender celadon low-relief curved band with a pale beveled rim. Simple geometric quarter arc, NOT a full C shape.
2) SOFT FOLD: one small muted-white folded ribbon, two softly curved intersecting planes, pale celadon back plane, delicately rounded edges; abstract compact fold shape.
3) CLOUD STEPS: three minimal shallow rounded slabs forming ascending abstract curved steps, pale celadon and muted celadon; narrow subtle thickness, not thick blocks.
4) OPEN FRAME: one elegant thin L-shaped rounded corner frame fragment, with an intentional gap and open center, jade-white body with celadon edge; not a closed box and not a C shape.

Bottom row, left to right:
5) RIPPLE: exactly two slender smoothly curved flow lines in celadon, short compact parallel waves, subtle low-relief thickness, clean taper. Entire width only 60% of cell.
6) CRESCENT: one single small pale-celadon crescent moon, clean symmetrical pointed ends, quiet soft bevel and celadon middle plane; no stars.
7) TINY GLOW: one small terracotta circular low-relief dot and a pale-celadon disc gently offset behind it; both clean matte thin discs, precise accent mark. No glowing rays, no sparkle.
8) BOOKMARK: one small slim vertical white clipped-corner tab, celadon edge and tiny muted terracotta cut corner; smooth flat plane, delicate low relief, no paper texture or writing.

Make them an unmistakably coherent proprietary digital design kit: restrained, crisp, quiet, intentional proportions; refined soft 3D feeling without realistic props. Each should read beautifully at 60-120 pixels displayed size. Use one consistent front-facing angle and subtle depth, avoid big hard extrusions. All eight separated by generous fully transparent gutters, alpha outside shapes and through open frames.
```

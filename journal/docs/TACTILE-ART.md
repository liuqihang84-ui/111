# 真实材质素材记录

这些素材由 image_gen 为本项目生成。图像描述中的中国手账、青绿山水、吴门画风等是视觉方向，不是文物出处、历史作品归属或复刻声明。

## 最终文件

| 文件 | 尺寸 / 格式 | 字节数 | SHA-256 |
| --- | --- | ---: | --- |
| `src/assets/tactile-stickers.png` | 1448 × 1086 / RGBA PNG | 1247552 | `d60044bceb4f880be62fb5e7e197916f02432431cb46ae6e876c5a88e3349196` |
| `src/assets/tactile-cover.png` | 1024 × 1536 / RGB PNG | 3816901 | `2a43ee6563ee72ab83dc0e405da6f0f26325d49c2a21986c399526f50f5cdd47` |
| `src/assets/tactile-paper.png` | 1254 × 1254 / RGB PNG | 2445914 | `42a4c4afebc6183f2dacad5e463273965619c9a8d02ce847ed87ee925563037c` |

三张 PNG 都通过 `src/data/tactile.ts` 的 `?inline` 资源导入提供，自包含于便携构建。

## 生成来源与时间

- 初始 atlas 与封面：并行 image_gen 调用窗口 2026-10-04T05:03:10.809Z 至 2026-10-04T05:04:12.239Z。
- 初始 atlas 源文件：`/workspace/generated_images/exec-451b1a4f-f154-4af0-bb87-4b36f6fe5d6b.png`。发现油纸伞、燕子靠近跨行边界后，使用 image_gen 引用这张图调整布局。
- 最终 atlas：image_gen 编辑调用 2026-10-04T05:05:43.030Z 至 2026-10-04T05:06:15.976Z，源文件 `/workspace/generated_images/exec-e0df6d25-02c9-466c-9bcd-b886d910837a.png`。
- 封面源文件：`/workspace/generated_images/exec-1ca59f7c-4c40-472d-ab33-b04e9a48075f.png`。
- 手工纸：image_gen 调用 2026-10-04T05:06:37.808Z 至 2026-10-04T05:07:05.779Z，源文件 `/workspace/generated_images/exec-025db23a-52fc-44c5-ab4d-72c1c8ef08f6.png`。
- 最终文件仅从这些生成源文件普通复制。没有用 Python 修改、裁切、抠图或重绘源图。Pillow 仅用于读取尺寸、哈希和 alpha 数值；浏览器用于常规图像合成审图。

## Sprite 格线与 ID 对应

Atlas 是 4 列 × 3 行，每格 `362 × 362` 像素。索引从 0 开始，原图裁取范围为：

```ts
const cellWidth = atlasSize.width / 4;   // 362
const cellHeight = atlasSize.height / 3; // 362
const sx = column * cellWidth;
const sy = row * cellHeight;
// drawImage(image, sx, sy, 362, 362, dx, dy, dw, dh)
```

| row | column | 已有资源 ID | 小物 |
| ---: | ---: | --- | --- |
| 0 | 0 | icon-orchid | 白花枝（沿用旧 ID） |
| 0 | 1 | icon-plum | 梅枝 |
| 0 | 2 | icon-bamboo | 竹叶 |
| 0 | 3 | icon-lotus | 莲瓣 |
| 1 | 0 | icon-ginkgo | 银杏 |
| 1 | 1 | icon-fan | 团扇 |
| 1 | 2 | icon-teacup | 茶盏 |
| 1 | 3 | icon-book | 线装书 |
| 2 | 0 | icon-umbrella | 油纸伞 |
| 2 | 1 | icon-moon | 月钩 |
| 2 | 2 | icon-seal | 闲章 |
| 2 | 3 | icon-swallow | 燕归 |

## 验证

最终三张图均使用 view_image 逐张查看。Atlas 的叶脉、花瓣纹理、竹骨、丝织、陶瓷釉面、布面线装、纸层和纤维具有具体表面细节。封面是平面正视布纹贴图，上部保留浅色空区，下部为淡青绿山水。纸底为均匀暖米白纤维纸面，不承诺数学意义上的无缝平铺。

Atlas alpha 读取结果：

- 像素总数：1572528。
- alpha 范围：0 至 255。
- 完全透明：1070138 像素。
- 完全不透明：583 像素。
- 中间 alpha：501807 像素，含物体材质与抗锯齿边缘。
- 三条内部竖格线 alpha 最大值均为 0；两条内部横格线最大值分别为 0 和 1。
- 以 alpha > 32 检查的可见物体均在其 362 × 362 单元内，没有可见物体跨过单元边界。

另外使用 Chromium 在 `#f6f0e3` 米白背景上常规显示完整 PNG，并查看截图确认：没有烘焙底色或可见红黄色描边。审图截图位于 `/tmp/tactile-alpha-browser.png`，不是应用素材。

## 初始 atlas 提示词

```text
Create a production-ready TRANSPARENT PNG sprite atlas of TWELVE physical, tactile miniature objects for an elegant Chinese journal application. This must be a beautiful overhead macro product photograph of real crafted materials, not vector icons, not line art, not cartoon symbols.

LAYOUT IS ABSOLUTE: exactly 4 equal columns by 3 equal rows, with one isolated object precisely centered in each equal cell; a landscape 4:3 canvas is preferred. Object centers x = 12.5%, 37.5%, 62.5%, 87.5% of canvas; y = 16.667%, 50%, 83.333%. All objects must stay inside the inner 65% of their own cell, with LARGE EMPTY TRANSPARENT GAPS around them and no object overlapping a cell boundary. Equal visual scale across the atlas. NO drawn grid or cell borders.

Exact order, left to right:
ROW 1: (1) a small orchid sprig with slender sage-green pressed leaves and two tiny ivory flowers, clearly fibrous veins; (2) a small real plum branch with deep brown wood grain and several dusty pink pressed blossoms; (3) a few bamboo leaves joined on a thin bamboo stem, moss-green silky veined surfaces; (4) two or three gently curled pale blush lotus petals, delicate translucent veining and papery thickness.
ROW 2: (5) a small pair of warm ochre ginkgo leaves, strongly visible fan veins and stems; (6) a small circular Chinese silk hand fan, warm ivory woven silk, pale bamboo rib and slender handle, a simple sage leaf painting without any writing; (7) a miniature celadon ceramic teacup seen overhead with rich amber tea, curved glazed lip, tiny glaze highlights, real ceramic substance; (8) a small indigo-blue threadbound Chinese book, tactile fabric cover, cream layered paper edges, cream binding threads, entirely blank cover with no writing.
ROW 3: (9) an open small oil-paper umbrella viewed overhead, warm honey-cream translucent paper with clear radial bamboo ribs and a pale vermilion hub; (10) a tiny ivory mother-of-pearl crescent moon ornament, curved thick edge and delicate pearly surface; (11) a small vermilion seal impression on a torn-edge cream handmade paper square, an abstract geometric carved motif with NO legible letters or glyphs, ink grains and paper fibers, slight paper thickness; (12) a small dark indigo swallow bird made of folded layered textured paper, recognizable forked tail and spread wings, realistic thick paper edge, fiber grain.

Unified modern Chinese palette: warm cream, sage, moss green, muted vermilion, dusty rose, ochre, indigo. Unified photographic lighting from upper left, tiny soft lower-right contact shadows contained inside each cell, natural microdetail: veins, fibers, wood/bamboo grain, glaze, silk weave, layered paper. Elegant museum-shop miniature craft objects with believable 3D material substance. Sharp focus throughout, no depth-of-field blur. True transparent alpha everywhere outside the objects and their very subtle shadows. No background, no tabletop, no white or checkerboard baked into pixels, no labels, no numerals, no text, no logos, no frame, no extra objects.
```

## Atlas 留白调整提示词

```text
Edit this twelve-object transparent atlas into a strict production sprite sheet. Keep all twelve objects, their excellent physical textures, colors, overhead lighting, and the same exact order. Correct the layout only by making EVERY object uniformly smaller and centering it exactly in its own grid cell.

CRITICAL LAYOUT: final image must remain a landscape 4:3 canvas, exactly FOUR equal columns and THREE equal rows. Each object including ALL stems, handles, wings, binding edges and any soft shadow must fit COMPLETELY inside the middle 60% of its own square cell. At least 20% of each cell's width must be truly empty transparent on all four sides. This generous transparent padding is mandatory: no object may touch or cross any imaginary cell boundary. Specifically move the umbrella wholly into bottom-left cell and the swallow wholly into bottom-right cell, with large transparent gap above them. Make the slender fan handle fit comfortably too. Uniform visually harmonious object sizing; tiny details remain crisp.

The centers must be at x=12.5%,37.5%,62.5%,87.5%, and y=16.667%,50%,83.333%. Keep order:
row1 orchid sprig, pink plum branch, green bamboo sprig, pale lotus petals;
row2 ochre ginkgo leaves, round ivory silk hand fan, celadon teacup with amber tea, indigo threadbound book;
row3 oil-paper umbrella overhead, pearl crescent moon, red abstract non-letter seal impression on torn cream paper, dark indigo folded paper swallow.

Real tactile miniature materials with visible veins, fibers, silk weave, ceramic glaze, bamboo ribs, cloth texture, layered paper. Retain true alpha transparency, primary physical objects should be opaque, gently antialiased edges. No background whatsoever. No white rectangle, no checkerboard, no labels, no grid, no text, no letters, no glyphs, no logo. Remove any colorful fringe or colored edge artifacts. The empty gaps MUST be fully transparent.
```

## 封面提示词

```text
Create one flat FRONT COVER TEXTURE image, portrait 2:3 ratio, edge-to-edge, for a realistic Chinese clothbound personal journal. The image itself is a straight-on flat material swatch, NOT a photograph of a book and NOT in perspective. We will wrap this flat image onto our own 3D book geometry.

The entire surface is warm off-white / flax ivory linen fabric, with finely resolved realistic warp-and-weft weave and tiny natural fiber variations. It must feel like tactile premium book cloth under soft upper-left light, without any folds or creases. No border, no binding, no spine, no page edges, no physical thickness, no cast shadow around the canvas, no background/tabletop.

Composition: the upper 58-62% is calm open unprinted ivory linen, reserved for live UI typography. The lower 40-42% carries a subtle original painted green river landscape inspired by the quiet aesthetic of classical Suzhou/Wu-school ink landscape, interpreted as a restrained modern cloth print: soft pale sage distant mountains, darker moss-green near riverbank, misty ivory negative-space river, a few fine brushwork trees and reeds, one tiny simple boat near the bottom. Landscape emerges gently from the blank upper cloth without a hard divider. Ink visibly sits within the linen grain; natural watercolor / mineral-green wash, expressive dry brush edges, delicate layered depth. Beautiful understated brush art, atmospheric and spacious, not a generic photoreal mountain photograph. The extreme bottom can contain a little richer moss green brushwork, while all of the upper half stays very light and open. A fine premium textile material, harmonious muted cream-sage-moss palette. Fully opaque image. Absolutely no printed text, no calligraphy, no seals, no letters, no glyphs, no logos, no labels, no book perspective, no extra objects.
```

## 手工纸提示词

```text
Generate one premium warm ivory handmade xuan-paper texture, a flat edge-to-edge macro material photograph. Square composition. The entire image contains ONLY the paper surface. Very pale warm cream / rice ivory with exceptionally low contrast. Fine randomly distributed natural short cellulose fibers embedded in the sheet, subtle pressed grain and a delicate shallow handmade paper emboss. All texture should feel physically real but remain quiet behind dark journal handwriting and live text. Uniform soft diffuse lighting, consistent brightness across the canvas, no directional shadows, no vignette, no bright center, no dark corners. Approximate repeatable texture with no dominant directional pattern, without claiming mathematically seamless. No stains, no foxing, no spots, no tears, no creases, no deckle edge, no borders, no tabletop, no objects, no ink, no text, no letters, no printed glyphs, no logos, no lines, no synthetic vector hatching. Opaque image. Subtle fibers must be visible in a close crop while the full image reads as clean blank warm ivory paper.
```

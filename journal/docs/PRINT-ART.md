# 印刷纸品素材记录

本版使用一组克制的现代册页纸品：日印、远山、枝影、纸条、朱印、题签、双线框、索引签。它们采用同一组纸白、墨黑、朱红，作为用户主动加入册页的纸贴素材。首屏无需摆入素材，旧版写实小物不作为新品牌的主视觉。

这些素材由 image_gen 为本项目原创生成。山形、植物拓印和抽象印形表达现代印刷方向，不是文物复刻，也没有虚构古代出处。图像内无可读文字，文字与编号由应用的排版系统决定。

## 最终文件

| 文件 | 尺寸 / 格式 | 字节数 | SHA-256 |
| --- | --- | ---: | --- |
| `src/assets/print-stickers.png` | 1774 × 887 / RGBA PNG | 291573 | `f76ea782bee3fde6e9bab93bb5f8e0535c198a373ec671763c9208d08d8474c8` |

UI 的精确色值为纸白 `#FFFEF9`、墨黑 `#242624`、朱红 `#BD3E32`。生成图采用这一色彩方向；纸纤维、印刷颗粒与抗锯齿包含邻近色值，不能将 PNG 描述为只有三个精确 RGB 值。

## 来源与处理

- 初始生成：2026-10-04T06:49:22.191Z 至 2026-10-04T06:49:46.635Z。
- 初始源文件：`/workspace/generated_images/exec-19e1549b-bb1b-4d67-9626-c8a47dce3038.png`。
- 初图远山靠近左右格线，因此进行一次 image_gen 编辑，缩小元素并保留大块透明间距。
- 编辑调用：2026-10-04T06:50:39.461Z 至 2026-10-04T06:51:14.806Z。
- 最终源文件：`/workspace/generated_images/exec-13e28016-57d0-4df6-9b03-f98fc841e420.png`。
- 最终素材由该源文件普通复制，原生成文件保留。没有使用 Python 修改、裁切、抠图或重绘图像。Pillow 只读取尺寸、哈希和 alpha；浏览器用于正常图像显示审图。
- `src/data/print.ts` 通过 `?inline` 导入这张 PNG，保证便携版无需请求外部图片。

## 索引与源矩形

Atlas 为 4 列 × 2 行。整格宽 `443.5`、高 `443.5` 像素；画布尺寸是奇数，因此不能直接假定整格宽高为整数。按 `width / 4`、`height / 2` 读取整格即可。更适合实际拖拽的方式，是使用下列预量出的 `source` 矩形在运行时绘制素材，避免大片透明区成为操作范围。

源矩形为 `x, y, width, height`。它们依据 alpha > 8 的内容范围加四像素透明余量得到，只保存坐标，并未修改 PNG。默认放入册页的宽高保存在 `printStickerCells`；每件素材保留其天然横纵比例。

| row | column | ID | 名称 | source |
| ---: | ---: | --- | --- | --- |
| 0 | 0 | print-sun | 日印 | 150, 184, 161, 161 |
| 0 | 1 | print-mountain | 远山 | 512, 240, 317, 72 |
| 0 | 2 | print-sprig | 枝影 | 1032, 141, 181, 240 |
| 0 | 3 | print-strip | 纸条 | 1410, 237, 253, 48 |
| 1 | 0 | print-seal | 朱印 | 148, 562, 165, 161 |
| 1 | 1 | print-label | 题签 | 530, 592, 276, 104 |
| 1 | 2 | print-frame | 双线框 | 987, 578, 245, 130 |
| 1 | 3 | print-index | 索引签 | 1510, 527, 78, 216 |

## 审图与 alpha 检查

- 最终图已通过 `view_image` 查看；顺序与表格相符，没有额外物件或字样。
- 在 Chromium 的 `#FFFEF9` 纸白背景上显示原 PNG 并查看截图，纸品薄边与印刷形态清楚，未见烘焙背景或可见彩色描边。审图截图 `/tmp/journal-print-atlas-review.png` 仅用于检查，不作为应用素材。
- alpha 范围 0 至 255。
- 完全透明像素 1442134，完全不透明像素 2217；其他像素包含纸品、墨层、抗锯齿与极轻阴影。
- 内部竖格线 x = 444、887、1330 的 alpha 最大值均为 0；内部横格线 y = 444 的 alpha 最大值为 0。
- 八件可见元素都独立于各自单元内，无元素跨越格线。双线框中心为透明。

## 初始提示词

```text
Create a polished production sprite atlas for a MINIMAL CONTEMPORARY PRINTED PERSONAL JOURNAL. Exactly EIGHT isolated paper / print accents, in exactly FOUR equal columns and TWO equal rows, ordered left to right. Every accent is precisely centered inside its own equal rectangular grid cell. All marks, paper edges and soft shadows fit INSIDE THE INNER 65% of each cell, leaving at least 17.5% COMPLETELY EMPTY TRANSPARENT padding on all four sides. Centers x=12.5%,37.5%,62.5%,87.5%, y=25%,75%. Wide landscape composition. NO visible grid.

This is one coherent original visual identity: contemporary Japanese / Chinese independent bookshop stationery, screenprinted limited-edition journal, crisp calm editorial restraint. ONLY THREE colors: warm paper ivory #FFFEF9, charcoal-black ink #242624, muted cinnabar-red ink #BD3E32. Monochrome ink objects never become brown or green. Paper is almost white, very smooth, a tiny fine natural fiber visible only in close-up. Ink has exquisite subtle screenprinted dry grain. All objects have thin flat paper substance and only a hairline soft contact shadow; NO bulky objects, NO dramatic shadows, NO heavy fabric or wrinkled texture.

ROW 1, left to right:
1. A single small solid CIRCULAR CINNABAR SUN stamp, clean imperfect screenprint circumference, muted red with tiny dry ink speckles, transparent exterior, no surrounding paper disk.
2. A small horizontal CHARCOAL INK DISTANT MOUNTAIN SILHOUETTE, three restrained low peaks as one simple connected form, an original carved woodblock shape with tiny dry brush grain, transparent sky and background, no clouds or sun.
3. A single delicate CHARCOAL BOTANICAL PRINT sprig: slim curved stem with FIVE simple narrow leaves, as a pressed single branch ink silhouette, airy fine linework, no green and no flowers.
4. One VERY THIN HORIZONTAL IVORY PAPER STRIP, about 6 times wider than tall, a fine straight paper edge, completely blank, one tiny cinnabar short dash near the left tip.

ROW 2, left to right:
5. A small square ABSTRACT CINNABAR SEAL impression, subtle dry stamp texture, angular meander and rectangular carved negative spaces, one contemporary abstract geometric motif with NO LETTERS OR CALLIGRAPHY, printed directly with transparent exterior, no thick block.
6. One clean BLANK HORIZONTAL IVORY TITLE LABEL, about 3 times wider than tall, tiny squared corners, two extremely fine charcoal rules along its top and bottom and one tiny cinnabar square on the left, no words.
7. A small DOUBLE-LINE CHARCOAL RECTANGULAR ANNOTATION FRAME, completely TRANSPARENT center, two nested hairline rectangles with generous blank center, wider than tall, no solid paper and no words.
8. One small VERTICAL IVORY INDEX TAG, blank slender vertical rectangle with a tiny CINNABAR CIRCLE near its top and a single very fine charcoal rule near its bottom, thin paper edge, no number and no words.

All eight accents feel like a matching printed stationery set from one independent brand, restrained deliberate geometry with real fine ink grain, refined uniform scale. Sharp flat overhead view. True RGBA alpha transparency in ALL unused areas outside each mark or paper piece, and in the frame center. No background, no desk, no baked checkerboard, no labels, no printed grid, no title, no text, no letters, no numerals, no handwriting, no typography, no extra accents, no pastel colors, no gold, no 3D ceramic or real botanical objects.
```

## 留白调整提示词

```text
Keep this exact beautiful EIGHT-object minimal printed stationery atlas, the same flat screenprint materials and exact row order. EDIT ONLY SPACING AND CLEAN EDGES into a strictly usable 4-column × 2-row atlas.

CRITICAL: ALL eight objects must be uniformly smaller, each centered precisely within its OWN grid cell. Keep final image 2:1 landscape ratio. Grid centers: x=12.5%,37.5%,62.5%,87.5% of canvas; y=25%,75%. Every object including branch tips, mountain ends, all paper fibers and any contact shadow must fit ENTIRELY inside the MIDDLE 58% OF ITS CELL WIDTH AND MIDDLE 62% OF CELL HEIGHT. At least 20% fully transparent padding on EACH side. The mountain in row 1 column 2 is currently too wide and touches grid boundaries: REDUCE it enough to leave large transparent gaps. Also make paper strip, title label and frame visibly shorter. Do NOT let the mountain or branch bleed into neighbors. No visible grid. The eight isolated items must be separated by substantial empty alpha space.

Order must remain exactly row1 red circular sun stamp, charcoal low mountain silhouette, single charcoal leafy sprig, tiny ivory horizontal paper strip with red dash; row2 square abstract red seal, blank ivory ruled title label with red square, double thin charcoal rectangular outline with fully transparent center, blank ivory vertical index tag with red dot.
All items belong to a restrained contemporary Chinese independent printed journal visual identity. Palette ONLY paper #FFFEF9, ink #242624, cinnabar #BD3E32. Less orange, more restrained muted cinnabar. Delicate dry ink grain; paper very smooth, fine quiet fiber, straight fine cut edge, NO thick torn white fringing. No colored outline artifacts. Flat overhead view, nearly no shadow; no 3D lumps or heavy texture. Preserve actual alpha transparency everywhere outside each object and within the double line frame. Primary printed silhouettes opaque, only gently antialiased edges. Absolutely no background, white rectangular board, checkerboard, grid, numbers, letters, writing, typography, additional objects or colors.
```

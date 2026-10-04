# 浮笺 · 薄玉编排素材

本组是为数字手账创作的八件原创编排素材。玉题签、玉界框、清流线、薄玉弧、玉索引、轻折片、玉叠片和玉朱点共用薄片、开放弧与切角轮廓。它们用于标题标记、照片构成、段落分隔、页边索引与局部重点，而不是模拟纸张、文具或实体手账道具。

温玉、青玉与苍墨的关系，是对玉器含光、器物轮廓和书画疏密的当代抽象转译。素材不冒称为历史文物、某朝代器型或经过考证的传统纹样。生成提示词对颜色、观看角度和厚度作出约束；生成像素包含模型产生的光照与半透明变化，不等同于纯色填充，也不是物理材料参数的测量结果。

## 生成与原文件

- 资产：`src/assets/jade-kit.png`
- 数据：`src/data/jade-art.ts`，导出 `jadeAtlasSrc`、`jadeAtlasSize`、`jadeStickerCells`
- 准备器：`src/lib/jade-render.ts`，导出 `jadeArt` 与 `prepareJadeArt()`
- 工具：本会话的 `image_gen.imagegen`；`transparent_background: true`
- 输入：全新文字生成，无参考图片、照片、外部图像输入
- 生成日期：2026-10-04（Asia/Shanghai）
- 原始生成路径：`/workspace/generated_images/exec-744771a0-d8eb-4d1b-9bde-9c7e6c63f75e.png`
- 原文件：RGBA PNG，1774 × 887 像素，313,219 字节
- SHA-256：`31206aabf58148a235a0a271ab1d98bbd12f3a62829b3adf93fdd3814c792f67`

交付 PNG 逐字节复制生成原文件；未重绘、修边、去底、调色、重新编码或修改 alpha。第一次生成未采用：其题签的可见 alpha 跨越相邻格线，会导致邻格取图混入题签尾部。最终提示词明确缩小所有主体并要求更宽透明间距，采用第二次生成文件。未采用文件没有进入项目素材。

## 透明与裁剪实测

PNG alpha 范围为 0–255，1,397,301 个像素完全透明。原图部分远离主体的像素仍含 alpha 1–4 的极淡生成杂点，因此以 alpha > 4 的主体边界加四边各 8 像素定义 source，不使用所有非零像素的宽大包围盒。

八个 source 全部位于各自四列两行的格内，互不交叠。裁剪边缘的最大 alpha 为 0–1，没有裁掉 alpha > 4 的主体或混入相邻主体。此方法只决定运行时取图区域，不改变原 PNG 或 source 内保留像素。开放框内部的负空间保持透明。

| ID | 名称 | source：x, y, width, height | 初始页面对象框 |
| --- | --- | --- | --- |
| `jade-title` | 玉题签 | 96, 221, 292, 97 | 180 × 52 |
| `jade-frame` | 玉界框 | 556, 132, 253, 258 | 164 × 164 |
| `jade-line` | 清流线 | 951, 239, 334, 79 | 210 × 56 |
| `jade-arc` | 薄玉弧 | 1424, 165, 281, 177 | 138 × 104 |
| `jade-index` | 玉索引 | 171, 491, 111, 293 | 56 × 134 |
| `jade-fold` | 轻折片 | 573, 505, 194, 277 | 104 × 118 |
| `jade-stack` | 玉叠片 | 982, 547, 286, 211 | 148 × 106 |
| `jade-dot` | 玉朱点 | 1492, 589, 124, 125 | 56 × 56 |

`prepareJadeArt()` 加载原 atlas，核对实际 naturalWidth / naturalHeight 后按 source 绘制至同尺寸 Canvas，并输出每件透明 PNG data URL。第二次及之后调用共用同一个准备 Promise。新 ID 与旧素材 ID 完全分开；已有记录和备份不需要替换旧素材。

初始页面对象框与裁剪 PNG 的比例不完全相同。页面、三维纹理和导出应使用一致的 contain 布局，将完整轮廓居中放入对象框，避免直接拉伸导致各模式下造型不同。主体已带材质明暗，界面不宜再次叠加亮白轮廓、浓重投影或金属高光。

上述 alpha、边界和哈希是对实际文件的静态测量；不替代项目的浏览器、三维、导出、离线或移动端验证。

## 最终实际生成提示词

以下是完整工具输入，而非生成后改写的艺术说明：

```text
Produce a NEW ORIGINAL isolated-sprite atlas for Floating Notes, a refined contemporary Oriental DIGITAL JOURNAL UI. TRUE RGBA TRANSPARENT background, 2:1 wide landscape canvas, exactly EIGHT independent sprites in EXACTLY 4 columns x 2 rows. No labels, no text, no numbers, no writing.

MOST IMPORTANT: MAKE THE OBJECTS SMALL. EACH SPRITE MUST FIT IN A BOX THAT IS AT MOST 55% OF ITS GRID CELL WIDTH AND AT MOST 55% OF ITS GRID CELL HEIGHT. Every object is centered in its cell. Leave HUGE invisible empty alpha gutters. DO NOT ENLARGE HORIZONTAL STRIPS TO FILL THEIR CELLS. No sprite may reach a grid line; allow at least 90 empty pixels to every cell edge on an approximately 1774 x 887 canvas. No shadow or faint marks crossing into nearby cells. Think of eight small precise components with abundant transparent space around each, not a poster with large objects.

Material: ORIGINAL FUNCTIONAL THIN JADE PLANES with precisely clipped corners for a premium digital editorial design system. The geometry is slender and elegant, NEVER puffy clay, chunky resin or inflated rounded 3D icons. Front-facing near-orthographic view; identical slight 3D angle for all eight pieces. A single gentle upper-left light. Extremely thin material, 2-3 px of visible thickness per 100 px of body width. Tiny soft edge, NO uniform bright white outline, NO fat bevel, NO hard black occlusion. A warm ivory #F8F6EF plane with clear pale jade #C9DCD1 and quiet cool jade #86A899 transmitted light along a slender edge. The dark teal #203B36 is only a subtle narrow material boundary. Soft broad light within the jade, clean non-grainy surfaces, gentle defined silhouettes. Slight translucency without making the whole object invisible. Contemporary abstract designed graphics, not a photograph, no historical object, no paper, no fabric, no desk, no background rectangle, no environmental shadow. No gold, no metal, no droplets, no gems, no glossy plastic, no bubbles, no sparkles, no painted checkerboard.

Use these exact small proportions and exact left-to-right order:
TOP ROW:
1 TITLE TAB: one blank horizontal thin jade title strip, 3.46:1 proportion. In a 1774 px wide canvas, object is ONLY about 230px wide x 66px tall. Straight sides, lightly eased corners, one precisely angled clipped corner on the right. Quiet warm milky face and a slender cool jade lower edge. NOT an elongated banner filling the cell.
2 OPEN FRAME: two thin L-shaped jade corner brackets, top-left and bottom-right, forming one square balanced frame, ONLY about 225px x 225px. At least 85% transparent empty interior. Precise small clipped-corner vocabulary, slender non-tubular bands, barely any material thickness. No plate in the middle, no extra decoration.
3 FLOW LINE: exactly ONE short narrow jade flow strip with one restrained controlled inflection. Overall 3.75:1 proportion, ONLY about 235px wide x 63px tall. Tapered ends, slim flat ribbon, shallow elegant sweep, no two waves, no big C curve, no random background marks.
4 OPEN JADE ARC: one thin open partial asymmetric elliptical jade plane, ONLY about 220px wide x 166px tall. 4:3 proportion. Large empty negative space. One intentionally straight clipped end and one refined tapering end. NOT a crescent moon icon, NOT a round tube. Barely visible slender edge, calm broad transmitted light.

BOTTOM ROW:
5 INDEX TAB: one slim vertical jade index, ONLY about 86px wide x 207px tall. 1:2.4 proportion. Straight sides, a clipped upper-right corner, blank warm-white and pale-jade two-tone facets with one slender diagonal seam. Never a thick block.
6 SOFT FOLD: one compact jade folded plane, ONLY about 202px wide x 228px tall. Exactly two thin geometric faces linked by one diagonal crease. A warm milky face and a pale cool jade face. Precise clipped outline, subtle broad light. Not a bow, fabric ribbon, or twisted coil.
7 LAYER PAIR: exactly TWO thin clipped-corner jade rectangles gently offset, ONLY about 225px wide x 161px tall. 1.4:1 overall proportion. 12% diagonal displacement, same aligned angle, quiet different tones, small transparent spaces at exposed corners. No thick stack, no paper edges, no grain.
8 VERMILION POINT: one single SMALL FLAT muted terracotta #B66E55 jade disc, ONLY about 80px x 80px, centered in its cell with lots of invisible surrounding space. Barely visible thickness, smooth matte face with one extremely gentle broad highlight. No second disc, no ball, no sphere, no shiny glass bead. This is the only warm red-orange in the whole atlas.

Crisp silhouettes and clean alpha. Fully transparent pixels outside each isolated component and through the frame opening. Every piece must still read at a real UI size of 56-210 pixels. Maintain generous safety gaps: DO NOT make any item larger than the dimensions described. No object/background cast shadows. The final is a restrained original thin-jade functional asset kit with strong common geometry and coherent light, not eight generic rounded toy icons.
```

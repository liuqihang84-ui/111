# App、纹样、材质与民艺参考板生成记录

本批图像回应素材库需要更多类型与视觉内容的要求。使用 `image_gen.imagegen`，按下列完整提示词生成四张原创现代整板学习图；未输入馆藏原图、未用馆藏图编辑、拼贴或裁切。没有使用 Python 或其他图像工具重绘、切格或改色，网站源文件是工具所返回 PNG 的直接复制。

生成日期：2026-10-04（Asia/Shanghai）。归档与 SHA-256 核验时间：2026-10-04T00:50:26+08:00。所有图均为 1536 × 1024、8-bit RGB PNG，不含透明通道。生成服务未返回单独模型名称、seed 或内部采样设置，因此不虚构这些参数。

这四张是四件可下载的整板参考图。内部的六格或九格用于研究不同方向，不计作已切分的独立素材；它们不是可编辑组件、无缝纹样、独立透明图标、历史复原或 PBR 贴图包。可随本项目参考和用于制作，真实文字、可访问性、互动状态、角色视图一致性与最终资产规格仍需要在制作环节确定。SVG 素材库的可下载图形另行列出。

## 界面系统：六组具体任务布局

文件：`src/assets/reference-app-interfaces.png`。

生成服务保存原文件：`/workspace/generated_images/exec-e7096d29-3bcc-41b8-b63c-394647206546.png`；本项目保留复制后的 PNG，未删除或改变原文件。

SHA-256：`12ff242d2539ed672cedc84df8c3c669bb7b1e319acc7762924a4bf8a5171654`。

阅读页、个人仪表盘、日历习惯、园林步行地图、器物目录、预约表单。对应可研究的 App 信息结构，而不是六个仅换颜色的相同卡片。

完整生成提示词：

```text
Create an original, exceptionally polished game-and-app art reference sheet of SIX complete interface mockups in a 3-column by 2-row grid, landscape composition with generous even gutters on warm ivory archival paper. This is a modern design exploration inspired by the restraint of Song ceramic vessels, antique woodblock book-page margins and Chinese garden framing, NOT a historical reproduction. Each mockup has a different functional visual layout and its own subtle color accents: (1) editorial reading page with finely spaced ink-gray horizontal typesetting lines, tiny cinnabar editorial seal, spacious ivory margins, restrained simple drawn tea bowl; (2) personal productivity dashboard with softly colored celadon metric tiles, tiny sparklines and dignified typography marks; (3) calendar and habit tracker with jade-green month grid and abstract ochre flower; (4) elegant illustrated walking map of winding garden paths, lotus pond and pavilion using flat pale celadon shapes and delicate ink strokes; (5) museum-style object catalog browsing panel featuring three distinct ceramic silhouettes with tidy filters and small specimen cards; (6) calm appointment form with outlined input fields, grouped choices and a single vermilion action button. Use editorial sophistication, art-director quality, subtle fine paper fibers, realistic but extremely light embossing, accurate aligned spacing, crisp UI geometry, strong harmony between all six panels. Black charcoal fine rules, warm ivory, subdued celadon, pale stone gray, occasional muted cinnabar. Each panel clearly distinct and individually legible as a visual layout; NO laptop or phone device mockups, NO floating windows, NO bright neon, NO ornamental dragons. No large title or watermarks, no paragraph of invented pseudo-Chinese text: use only small clean abstract typographic strokes as placeholder content. Avoid wood-grain furniture backgrounds. Render interfaces large enough to study, fine crisp detail.
```

## 纹样系统：九种节奏与材料方向

文件：`src/assets/reference-app-patterns.png`。

初版生成服务保存原文件：`/workspace/generated_images/exec-12ca6ad6-4376-46a3-8668-c3a9fb42002d.png`；原文件仍保留。网站现使用下述修订版。

初版 SHA-256：`ef7e5b641f732ee1b54f8f983faa204c7d162ce4ad64e6b383f247a860f20da5`。当前修订版 SHA-256 见下文。

青铜兽面、错金几何、瓦当云鸟、锦织花卉、缂丝花鸟、蓝印草叶、剪纸花蝶、现代水纹线刻实验、青花缠枝。每一格是新创作的现代纹样方向，不承诺扫描原作、无缝平铺或对应某件馆藏。下列初版提示词作为生成历史保留，随后已对底中格定点修订。

完整生成提示词：

```text
Create an original museum-quality art direction reference board of NINE DISTINCT Chinese-inspired surface pattern studies, perfectly arranged as 3 x 3 large square swatches separated by broad warm ivory gutters, landscape canvas. Every swatch must be visibly different in historical inspiration, material feel and compositional rhythm. Top row: 1 archaic bronze taotie-inspired symmetrical abstract mask in verdigris green and antique gold with dense fine angular leiwen line work, 2 interlacing fine bronze-inlay diagonal geometry in charcoal bronze and muted gold, 3 Han architectural eaves-tile cloud scrolls and birds in chalky terracotta circular medallion repetitions. Middle row: 4 luxurious Song-style silk brocade with small repeated gold peonies on deep vermilion burgundy and pale celadon leaves, 5 precise kesi tapestry floral stems with delicate birds on pale ivory silk with teal and rose muted thread colors, 6 indigo resist printed textile with small white botanical sprigs and delicately imperfect batik-like outlines on rich deep blue. Bottom row: 7 exuberant folk paper-cut floral moth and chrysanthemum repeat in flat cinnabar red with striking open negative space on ivory, 8 controlled black-ink woodblock-print wave pattern with overlapping waves, off-white gaps and occasional pale blue wash, 9 refined porcelain scrolling lotus vines in fine cobalt blue and white, narrow ornamental border at edge. Swatches should fill almost all panel area, crisply designed and richly detailed, patterned rhythms vary substantially, legible close-up texture without photo clutter. Two or three color tones per swatch plus substrate; do not reduce everything to modern simple geometric shapes. No words, no labels, no watermark, no people, no mountain scenes. These are newly designed modern studies, not reproductions or purported exact archaeological reconstructions. Keep each surface planar and evenly lit, no rolled cloth, no vases, no dramatic perspective.
```

### 纹样板修订：现代水纹线刻实验

修订与核验时间：2026-10-04T01:02:28+08:00（Asia/Shanghai）。审看初版时发现底中格的卷曲巨浪带有日本浮世绘浪图的视觉联想，容易使中国古代美学研究的指向混淆，因此以当前本地 PNG 作为 `referenced_image_paths` 输入，使用同一 `image_gen.imagegen` 工具重新编辑；只要求更换底中格，保留另外八格的布局、主题与色彩。没有使用 Python、Pillow 或程序裁切、合成。

修订输入：`src/assets/reference-app-patterns.png` 的初版（SHA-256 为 `ef7e5b641f732ee1b54f8f983faa204c7d162ce4ad64e6b383f247a860f20da5`）。

生成服务返回原文件：`/workspace/generated_images/exec-afe246b1-33c7-40d4-bd91-0360b44078b0.png`。此修订 PNG 已直接复制到网站的 `src/assets/reference-app-patterns.png`；初版工具原文件仍保留。当前网站文件 SHA-256：`9f72ba36d6047bb054864ffced211f4ff4f98bc9411ced3bf376c7b805b244fa`，尺寸仍为 1536 × 1024、8-bit RGB。

修订后底中格为浅青灰细线的舒缓溪流、同心层波与纸面留白，不含卷曲巨浪、尖锐泡沫或山岳。其余八格保留原来的结构、主题与配色；生成式编辑会重绘细节，不声称它们逐像素不变。此格标为“现代水纹线刻实验”，不是马远作品复原，也不用它证明古代中国木版水纹的典型形态。

完整修订提示词：

```text
Edit the provided original 3-by-3 pattern reference board. IMPORTANT: Keep the board's original landscape aspect ratio, ivory gutter layout, all other EIGHT swatches, their colors, motifs, texture and crop intact. Change ONLY the bottom-center swatch, which is currently a dark blue dramatic breaking wave. Replace that entire bottom-center swatch with a refined ORIGINAL MODERN LINE-ENGRAVING STUDY inspired by calm classical Chinese water-pattern aesthetics: on warm white fine handmade-paper ground, many graceful thin pale celadon-gray and blue-gray parallel lines trace broad shallow flowing creek currents, gently bending horizontal streams and restrained concentric ripple ellipses, very subtle line density variation, exquisite hand-drawn rhythm and ample luminous paper visible between the lines. Water stays calm, delicate, flat, serene and quietly continuous. NO dramatic surf, NO curling towering wave, NO jagged claw-like foam, NO tsunami, NO sea spray, NO mountain, NO Mount Fuji, NO Japanese ukiyo-e wave-print visual vocabulary, NO dark navy solid ground. Do not claim to reproduce any historical artist, woodblock print or specific ancient object. The panel should feel like an original contemporary Chinese water-line composition useful for interface surfaces, with very light celadon-gray ink lines on warm ivory paper. Keep the bottom-left red paper cut, bottom-right cobalt floral porcelain, all six upper swatches and all gutters completely unchanged. No new lettering, no labels, no frames, no watermark. Crisp high-resolution art direction.
```


## 物性系统：九种材质近景

文件：`src/assets/reference-app-materials.png`。

生成服务保存原文件：`/workspace/generated_images/exec-20a789b2-8819-4ba9-ba1e-a4c7a8a96ada.png`；本项目保留复制后的 PNG，未删除或改变原文件。

SHA-256：`5c7ea0a79b6809b1dc0cb6a1e7c9bc178bc878a4124f355e1afde5b72bd85825`。

玉、青铜、丝锦、纸与墨、漆、青瓷、硬木、园林石、青花釉。强调透光、纤维、孔隙与反射差异。图中釉裂只是现代造型变体，不能据此认定所有宋瓷都有开片。没有法线、粗糙度或置换等 PBR 数据。

完整生成提示词：

```text
Create an original exceptionally detailed material study atlas for video game and app artists, 3 x 3 large square close-up sample panels, landscape format, clear wide warm ivory gutters, NO title, no words, no watermark. Nine visually distinct Chinese craft inspired material surfaces, each grounded in physical texture and reflectance under consistent calm raking studio light, material fills the panel with a small carefully composed symbolic edge or carved detail to suggest application. Row 1: 1 warm olive nephrite jade with cloudy translucency, soft polished rounded raised spiral carving and fine stone fibers; 2 weathered bronze with verdigris pits, dark metal base, thin antique-gold inlaid geometric groove; 3 dense silk brocade burgundy and gold, individual fine interlaced threads visible, peony flower fragment and satin sheen. Row 2: 4 pale ivory handmade xuan-style paper with fibers, diffuse gray ink bleed and small dry-brush trace; 5 deep glossy black lacquer with subdued red lacquer carved cloud edge and naturally varied subtle reflections; 6 soft celadon glazed porcelain, tiny glossy specular highlights, narrow porcelain ridge and crazing used as a modern variant rather than representing every historical ware. Row 3: 7 dark warm rosewood polished grain with subtle mortise-and-tenon corner detail and restrained rubbed golden edge; 8 cool gray limestone garden rock close-up with natural pitted porous surface and miniature moss in crevices, sculptural but flat material section; 9 opaque cobalt blue and cream porcelain enamel surface with a raised border framing a few crisp cobalt floral brush marks, no vase. Photo-realistic craftsmanship blended with refined hand-painted game material readability. Consistent scale, no overprocessed grunge, realistic microdetail, clearly distinguish matte / glossy / fibrous / translucent / metallic. This is an original modern visual interpretation, not a historical conservation record; no copied museum objects, no landscapes, no characters.
```

## 小图形系统：九组民艺与工艺语言

文件：`src/assets/reference-app-folk-icons.png`。

生成服务保存原文件：`/workspace/generated_images/exec-5bee59e4-b99d-4c9b-82ea-fdd03beb5fef.png`；本项目保留复制后的 PNG，未删除或改变原文件。

SHA-256：`6ab5f563602e8ffb9a8f029aebe8c59b3be4ab59c9f9c69720f6a3a1fa9041c2`。

年画、剪纸、皮影、青铜几何功能符号、玉雕小形、青花小形、抽象朱印、版刻分隔、螺钿花章。每组包含不同图形。朱印刻形为不具语义的现代图形，不是经过辨读与校勘的历史汉字。

完整生成提示词：

```text
Create an original enchanting and professional illustration-system reference board for Chinese-craft-inspired apps and games. NINE distinct small art families arranged as a 3 x 3 grid on light warm handmade paper, landscape format, generous gutters, every panel features an artistically resolved group of three to five symbols of its own coherent family, high detail and strong distinct visual identities. Top left: tiny cheerful lunar New Year woodblock folk illustrations of an abstract carp, plump tiger, flower, auspicious gourd in muted scarlet ochre jade turquoise, fine black keyline and subtly offset flat inks; top center: precise red paper-cut emblems of a butterfly, plum flower, magpie pair and cloud with open filigree negative space; top right: graceful shadow-puppet-inspired dragon-cloud bird and lotus ornaments in translucent amber / vermilion / jade segments outlined with dark brown hinge-like joins. Middle left: carved bronze-inlay geometric app symbols for a doorway, compass, sound wave and document in gold lines on deep bronze charcoal; middle center: small elegant jade jewelry knot, bi disk, curled cloud and leaf icons, pale translucent warm olive carved volume; middle right: porcelain-blue tiny blue-and-white flower, leaf, bowl, bottle and moon icons, cobalt ink brush edges and white glazed grounds. Bottom left: hand-printed cinnabar abstract seal emblems using deliberate nonlinguistic angular negative shapes and artful broken edges, all different square or round seal frames, absolutely no invented Chinese words; bottom center: black ink and vermilion restrained editorial ornamental caps, dividing rules and corner ornaments inspired by ancient printed-book geometry, varied compositions, precise thin line hierarchy; bottom right: small mother-of-pearl lacquer mosaic botanical medallions using iridescent ivory shell, teal green and warm copper accents on deep plum black grounds. Quiet but rich art direction with carefully balanced blank space. NO Chinese text, no letters, no main title, no watermark, no mountains, no generic repeat of same shapes. Do not imitate one real historical object; these are newly designed original modern creative studies. Crisp isolated art groups within each ivory panel, no black UI boxes or devices.
```

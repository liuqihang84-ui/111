# 游戏方向原创研究图库：来源与制作记录

这批图像在本项目的 image_gen 工具中按下述原创简报从零生成。没有提供参考图片，也没有导入、描摹、拼贴或重新分发馆藏照片。图像文件只从工具返回的本地路径复制到 `src/assets`，没有进行程序裁切、压缩、改色或其他图像编辑。

## 交付口径

共有 **4 张参考板，板内合计 34 个视觉研究案例**。网页提供的是整张 PNG 下载。34 是板内案例数，不能计作 34 件可直接放入游戏的独立角色、道具或地图素材。这些文件都为 1536 × 1024 像素、有背景的 PNG；没有透明抠图、骨骼、动画、碰撞、无缝地形或 3D 结构数据。

每张板的职业、空间、形制和材料由本项目创造并混合使用中国艺术视觉线索。网页 `traditionIds` 是现代形式研究的检索关联，不表示每格服装、器物与建筑属于同一朝代，也不表明画面细节已经过艺术史鉴定。角色图不是历史服饰复原；建筑图不是测绘或施工资料；器物图不对应具体馆藏文物。需要历史准确性时，先查页面上的独立馆藏与书目记录，再另行制作和审校。

这些原创新图随本项目交付供研究、设计和后续制作使用。没有将馆藏图像的授权套用到本批图，也没有把 AI 生成的外观等同于对历史物件的复原认证。工具完整生成结果保留于云工作区的原始路径；页面只依赖归档后的项目文件。

## 文件核对

以下归档时间均使用 Asia/Shanghai（UTC+08:00）。PNG 头、文件字节数和 SHA-256 经本地读取核对；归档时间是实际复制完成时间，不是作品时代。

| 文件 | 案例数 | 字节数 | 归档时间 | SHA-256 |
| --- | ---: | ---: | --- | --- |
| `src/assets/reference-game-characters.png` | 8 | 2924560 | 2026-10-04T00:47:08+08:00 | `fc4a078b816272dffb1a9a2f3837c3bba2b50f632180091a2e8eb58158a07399` |
| `src/assets/reference-game-scenes.png` | 8 | 3495762 | 2026-10-04T00:49:07+08:00 | `2056fda0ccb1e5cc6e74903e1f2a9c4c26dac8816c0bb282498df73850e50716` |
| `src/assets/reference-game-props.png` | 9 | 3085261 | 2026-10-04T00:51:22+08:00 | `122a55d126251ceb97285eb2077c4fbcfad98fc971048b7bce4bbd539b58dba9` |
| `src/assets/reference-game-architecture.png` | 9 | 3519626 | 2026-10-04T00:53:30+08:00 | `cba10bad47cf10a47818d8230d0e670a38bd33af0527d83bb93adc3cfa05332f` |

## 目视核对与制作边界

- 人物板：完整 8 位人物可见，各有不同职业、衣料、体形与手持工具。适合研究轮廓和职业识别；将其做成可操控角色还需统一视角、比例、动作与遮挡规则。
- 场景板：8 个各不相同的城市、自然、工作和室内环境，包含昼夜、季节与材料变化。适合研究空间深度、光色与地标；不是已连通的可玩关卡。
- 器物板：9 组各有不同轮廓和材料表面，包含青铜、玉、漆、木、陶瓷、织物、珐琅与皮影。适合材质语言、容器结构和轮廓研究；装饰细节需要另行核验与简化。
- 建筑板：9 种不同用途与空间足迹的轴测参考。不同房屋、桥梁、围墙和平台便于比较入口及通行关系；有视觉性概括，不作为木构节点尺寸依据。

## 完整生成简报

四次调用都设置 `transparent_background: false`，没有 `referenced_image_paths` 或 `num_last_images_to_include`。以下英文简报原样保存，便于重新生成、修改或者与后续设计判断对照。

### 人物百业

原始工具返回文件：`/workspace/generated_images/exec-e1f17d66-7f8a-449e-8fff-20f4ed42f2b8.png`

```text
Create a very high-resolution original game-art research contact sheet inspired by the visual design principles of ancient Chinese art. Wide landscape 3:2 format. EXACTLY EIGHT distinct finished character concept illustrations in a clean 4-column by 2-row gallery with very thin warm ivory gutters. NO TEXT, NO LETTERS, NO WATERMARKS, NO LABELS. Each panel has a complete single full-body character, feet and head entirely visible, occupying most of its panel, neutral beautifully textured pale paper background plus one discreet ground shadow. Exceptional museum-book illustration quality, hand-painted gouache and fine ink contour, controlled brush texture, restrained details at small scale, strong memorable game-readable silhouettes, rich varied historical Chinese design influences; not historical reconstructions, not copies of existing art.

The eight characters are original people for a peaceful exploratory game, NOT all fighters and NOT one repeated costume:
1. An older wandering herbal physician wearing weathered undyed hemp layers, wrapped cloth hat, carrying a cedar medical box and dried medicinal sprigs. Soft umber, ink gray, sage green; thoughtful kind expression.
2. A strong young female pottery artisan wearing dark indigo apron, practical rolled sleeves, clay-stained hands holding a small pale celadon bowl. Cream and indigo, short tied hair.
3. A dignified ritual musician inspired by early bronze-era ornamental rhythm, deep charcoal rectangular robe with very restrained vermilion edging, a small bronze bell instrument, angular long clean silhouette.
4. A young traveling scholar with light blue-gray layered robe, bamboo book carrier, rolled paper, wide soft hat; elegant asymmetric silhouette and independent personality.
5. A middle-aged female lacquer craftsperson in dusty madder outer layer and ivory sleeves, holding a tiny polished red-black lacquer tray, geometric belt, careful concentration.
6. A tea-house host with layered muted moss-green and cream outfit, compact silhouette, simple hairpin and small handled wooden tea tray. Warm confident smile.
7. A lean river courier with woven straw rain cape and practical trouser silhouette, amber bamboo tube and a small rope bundle; wet coastal green-gray palette.
8. A court-inspired female pipa musician with ochre, dusty rose and lapis accents, long flowing but restrained sleeves and tiny flower hair ornament. Soft rounded silhouette, grounded natural pose.

Show diversity of age, gender, body shape, occupation, fabric silhouette, gesture, accessory and color while keeping one polished art direction. Portray Chinese characters with plausible anatomy and expressive human faces. Correct hands, no duplicated limbs or weapons. Preserve beautiful negative space and clear separated contours. No modern fashion, neon, sci-fi, exaggerated fantasy armor, generic anime faces, western palaces or battle scenes. This is a vivid full painted character library board, not a diagram, not swatches, not flat symbols.
```

### 人间八景

原始工具返回文件：`/workspace/generated_images/exec-2df36806-2b9b-45c8-ae94-65806d90fe6b.png`

```text
Create an exceptionally beautiful HIGH RESOLUTION original environment-art research board for a game inspired by ancient Chinese visual aesthetics. Wide landscape 3:2, clean EXACTLY EIGHT different large fully illustrated environments in a 4-column by 2-row contact sheet, thin warm off-white gutters, no text, no labels, no numbers, no characters or watermarks. Every panel should be a distinct usable concept art scene with clear foreground/middle/background depth, striking different composition, appropriate negative space for gameplay readability. Not a historic reconstruction, not an existing painting. Soft painterly realism with delicate ink-defined edges, luminous but restrained colors, detailed tactile stone, timber, ceramic, silk and foliage. No fantasy glowing particles everywhere.

Scene 1: A lively early morning southern river market street, low wooden shopfronts, curved dark tiled roofs, baskets of produce, soft figures at a distance, narrow warm river reflected between buildings. Welcoming amber and mist-blue.
Scene 2: A broad northern ochre loess cliff and winding dusty mountain pass with a tiny way station and isolated twisted pine; monumental empty sky, red earth and muted indigo distance, strong asymmetry, no river village.
Scene 3: A calm scholar's study interior, a low lacquer desk, pale celadon water vessel, scroll storage, lattice window with soft bamboo shadows, understated warm cream/ink gray/cinnabar accent. Clearly indoors, no generic mountains.
Scene 4: A rich nocturnal waterside lantern fair, long quiet blue-dark canal, warm lantern points in layered streets, silhouetted little footbridge, intimate selective luminous contrast, not neon.
Scene 5: A vast coastal salt marsh with pale reed beds, distant fishing boats and wood drying racks, low horizon, cool gray-blue and muted gold; open airy environmental geometry.
Scene 6: A dense old green bamboo grove with a winding moss-covered stone stair and a tiny weathered pavilion half concealed; filtered green light, close layered trunks, immersive tactile detail.
Scene 7: A mountain ceramic kiln workshop exterior at dusk, earthen kiln round mouths, stacks of freshly made ceramic vessels, rough shelter beams and firewood, atmospheric smoke, earthy rust and celadon accents; grounded workaday world, not palace.
Scene 8: A winter courtyard inn after fresh snow, dark timber covered walkways, clustered roofs and tall leafless persimmon with a few amber fruit, lantern beside an open warm doorway; restrained monochrome with a small warm focal point.

Give each scene its OWN lens, view direction, mood, shapes and palette; avoid repeating mountains and a river in every panel. Finely composed professional game visual development painting, distinctly Chinese but not cliché red-and-gold ornament overload. Correctly plausible Chinese architecture and natural spaces, coherent lighting. Beautiful spacious gallery, crisp cinematic images rather than infographic or icons.
```

### 九材九器

原始工具返回文件：`/workspace/generated_images/exec-f5b7c574-446e-422b-989b-054285bacddc.png`

```text
Create a high-resolution original game prop visual-development board studying ancient Chinese craft aesthetics. Wide landscape 3:2, EXACTLY NINE clearly separated exquisite object studies in a 3-column by 3-row gallery with narrow clean warm ivory gutters. NO TEXT, NO LABELS, NO LETTERS, NO WATERMARK. Every panel on quiet pale paper has one main prop, optionally one tiny secondary silhouette/detail view that is clearly part of the same study. Distinct objects not nine similar jars. Realistic hand-painted gouache and fine illustration with superb tactile detail, elegant controlled light and slight contact shadows, crisp full contours, museum design-book visual quality. These are original imaginative design studies, not replicas or historical reconstructions.

Nine panels, left to right:
1. A heavy squat three-legged bronze ritual vessel with restrained repeated mask rhythm, deep warm oxidized brown and selective green patina, broad readable silhouette. Detailed small matching lid at its side.
2. A pale sage-green jade disk and a slim hooked jade pendant on a soft charcoal linen fold. Translucent bevel, cloudy internal texture, delicate restrained carved spiral motifs, expressive negative space.
3. A round polished red and black lacquer storage box with a low domed lid and subtle curved cloud engraving. Rich deep red surface and glints, lid slightly raised to show black interior.
4. A warm dark rosewood travel writing kit, rectangular sliding wooden box with brush and tiny inkstone, small restrained joinery instead of gilded ornament. Visible tactile grain.
5. A handsome blue-and-white porcelain flask with flattened round body and small neck, hand-painted cobalt lotus vine motifs, pale ivory glaze, shape unlike a standard vase.
6. A quiet pale celadon lobed ceramic bowl beside one thin soft gold reed branch; subtly pooled glaze and muted blue-green surface, no exaggerated cracks.
7. An embroidered silk drawstring sachet with indigo, ivory and madder bird-and-leaf pattern, tassel and braided closure; clear fabric stitch texture.
8. A small copper cloisonné lidded incense box with refined turquoise enamel, narrow brass partitions and tasteful red lotus accent, cut-work footbase.
9. A translucent articulated Chinese-inspired leather shadow puppet of a graceful traveler, amber red and smoky green dyed cut leather, fine pierced openings and visible joint pins, no sticks intersecting its body.

All objects occupy a strong large silhouette in their panel, entirely uncropped, clear nonuniform material rendering: matte stone vs glossy lacquer vs rough bronze vs translucent jade vs woven silk. Distinct each panel palette and proportions with a consistent calm beautiful collection identity. No oversized fake jewels, fantasy weaponry, modern electronics, printed typography, neon, CGI toy appearance, or repeated generic lotus vase. This should feel like a richly useful real concept prop library rather than abstract flat icons or symbols.
```

### 营造九式

原始工具返回文件：`/workspace/generated_images/exec-bc868384-d056-423b-9ef3-613435189876.png`

```text
Create an exceptionally polished original Chinese-inspired game architecture concept gallery, HIGH RESOLUTION wide landscape 3:2. EXACTLY NINE distinct full architectural and spatial studies, 3 columns by 3 rows with thin clean warm ivory gutters. NO TEXT, NO LETTERS, NO NUMBERS, NO WATERMARKS. Each panel shows one COMPLETE small-to-medium architectural space in a beautiful three-quarter elevated isometric view, entirely visible without being cropped, subtly placed on warm pale paper with a small natural ground base and shadow. Painterly gouache architectural illustration, richly tactile wood grain, tiled roofs, brick, plaster, stone and restrained plants. Fine crisp legible silhouettes and excellent spatial depth. A coherent game art style with very different arrangements and building functions. These are creative contemporary design references inspired by Chinese ancient visual principles, NOT measured architecture or historical reconstructions.

Nine panels:
1. A modest square timber courtyard home with three rooms around an open yard, dark tile roof, warm brown pillars, little tree and stone well. Entry roof lower than rear main hall, articulate domestic small-scale space.
2. A narrow Huizhou-inspired white-plaster village shop with tall stepped fire walls, gray roofs, an open timber storefront, small indigo cloth awning and jars. Tall compact silhouette, no palace.
3. A formal red-brown timber gateway with visibly layered bracket-set roof support and stone bases, dignified broad silhouette; muted cinnabar accents, exquisite but believable beam geometry, few ornaments.
4. A small covered timber bridge across a shallow narrow stream, long low sloping tile canopy, open repeated timber supports, visible stone bridge abutments. Clearly a BRIDGE, not a pavilion.
5. A garden composition with white moon-gate wall, zigzag stepping stone path, bamboo cluster, weathered ornamental rock and a small open corner pavilion. Strong sense of selective framing and asymmetry.
6. A ceramic workshop courtyard with simple open wood shed, arched clay kiln mouths, firewood piles, stacks of ceramic bowls and jars. Rustic orange-earth structure, tool-organized production space, NOT a temple.
7. An airy hexagonal lakeside wood pavilion on stone stilts with narrow walkway and one pale willow, reflected little patch of water, light unornamented roof.
8. A two-level hillside tea house resting on stepped stone terrace, open veranda, timber screens, low retaining walls, bushes, restrained indigo hanging cloth, cascading human-scale circulation.
9. A raised-floor timber granary with posts above a stone base, broad projecting tiled eaves, short stairs and tied sacks, sturdy simple agricultural utility, different from all other rooms.

Use consistent clean elevated lens angle but vary footprint, height, roof arrangement, enclosure, entry, platform, material and color so each design reads instantly at small size. Include finely observed realistic construction and light without implying professional building plans. Beautiful empty margins, professional art-book detail, readable game map forms. No fantasy castle spires, giant dragons, battle scenes, western houses, modern concrete towers, neon, infographic arrows, decorative labels or abstract flat icons.
```

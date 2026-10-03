# 美术与字体来源台账

记录日期：2026-10-03（Asia/Shanghai）。本台账区分游戏内像素素材、高清环境树、中文字库与设计参考。概念图没有被当作地图背景或截取为游戏角色；当前林恩使用本项目重画的原生64×96像素图集，其余角色、敌人、道具与头像来自项目内的 Godot 像素绘制代码。高清树的生成来源单独记录如下。

## 1. 原创程序像素素材

| 文件范围 | 制作者与来源 | 修改、使用与授权状态 | 可追溯记录 |
| --- | --- | --- | --- |
| `scripts/pixel_art.gd` 中全部像素纹理，包括林恩四向动作、岑灯/阿芙/小禾、十类敌人、五个 Boss、植物、道具、灯火、攻击弧与头像 | 本项目会话内由 Codex 辅助编写的原创像素图形；使用 Godot `Image` 的逐点、矩形、椭圆、线段和梯形绘制，不下载外部图片包 | 项目原创素材，没有第三方图片或角色授权依赖；未另行宣布为 CC0、MIT 或其他公共素材许可，对外再许可随项目最终许可证决定 | [像素源代码](../../scripts/pixel_art.gd)，[美术规范](../art-direction.md) |
| `assets/art/characters/`、`enemies/`、`bosses/`、`props/`、`environments/`、`vfx/`、`ui/portraits/` 中的 PNG | 上述原创代码的直接输出；包括原始透明图与主角动作图集 | 导出过程保持源像素，没有描摹、重采样或拼贴参考游戏素材；人物的左右装备单独绘制 | [导出工具](../../tools/export_pixel_art.gd)，[资源目录与帧元数据](../../assets/art/catalog.json) |
| `assets/art/preview/sprite_catalog.png` | 本项目原创图形的排列预览，使用同一导出工具组成 | 用于检查剪影、尺寸与色彩，不是玩法场景背景 | 同一导出工具与目录元数据 |
| `assets/art/characters/lynn_hd/` 与 `scripts/hero_visual.gd` | 本项目在64×96原生网格上独立重画的林恩四方向八动作图集，由原创坐标、多边形和像素线构成，Pillow仅作输出 | 没有放大旧32×48精灵，没有裁切概念图或外部角色；原图、156姿态、脚点、色板及哈希一并保留 | [角色来源与规范](../../assets/art/characters/lynn_hd/README.md)、[生成工具](../../tools/generate_hero_visual.py)、[加载接口](../../scripts/hero_visual.gd) |
| `assets/environments/textures/` | 本项目原创 Godot `Image` 绘制的苔土、土路、石材与透明植物 | 可重复纹理与有限色板叶群；不读取外部照片、旧生成树或其他游戏图像，不另行声明公共素材许可 | [环境来源说明](../../tools/environment-art-provenance.md)、[生成工具](../../tools/generate_environment_art.gd) |

参考《Octopath Traveler II》的纵深和像素层次、参考《TUNIC》的路径辨识，仅用于研究表达原则。本项目没有使用这些游戏的角色、截图裁片、贴图、地图、音乐或 UI 资源。

旧生成器的主角导出规则为32×48每格、脚点 `(16,44)`，保留作来源与兼容性记录。0.3.1-dev 的林恩使用64×96图集、脚点 `(32,88)`，四方向与八动作共156姿态；规格与帧哈希在 `assets/art/characters/lynn_hd/metadata.json`。两套素材的灯和工具包均按方向独立绘制。头像仍为独立绘制的128×128图形，旧素材元数据与检查保留在 `assets/art/catalog.json`。

## 2. Noto 中文字体

| 文件 | 来源与许可证 | 已进行的修改 | 证据与再现方式 |
| --- | --- | --- | --- |
| `assets/fonts/lumenfall-ui.otf`（既有文件，保留） | Noto Sans CJK SC 衍生字体；上游 [notofonts/noto-cjk](https://github.com/notofonts/noto-cjk)，字体本体适用 SIL Open Font License 1.1 | 既有流程提取了字符子集并重命名为 `Lumenfall UI`；检查时共 317 个 Unicode 码位，不能覆盖本轮扩展剧情 | [随项目保留的授权文本](../../assets/fonts/LICENSE-Noto.txt)；既有衍生字体的精确重生成命令未保留，不声称可以复现旧子集 |
| `assets/fonts/lumenfall-ui-full.otf`（本轮生成） | 当前机器已安装的 Debian `fonts-noto-cjk`，包版本 `1:20240730+repack1-1`；源为 `/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc` 的简体中文 face 2，PostScript 原名 `NotoSansCJKsc-Regular`；同一 OFL 1.1 | 提取完整 SC face 为 OTF，重命名 family、全名与 CFF 名称为 `Lumenfall UI Full` / `LumenfallUIFull-Regular`；没有字形子集，没有修改字形轮廓；原版权及授权文字保留 | [可复现字体工具](../../tools/prepare_art_font.py)，[源与输出 SHA-256/修改记录](../../assets/fonts/lumenfall-ui-full.provenance.json)，[授权文本](../../assets/fonts/LICENSE-Noto.txt) |

完整字库包含 44,810 个 Unicode 码位。生成工具检查当前 `scripts/` 与 `docs/` 中基本汉字区的字符覆盖，本轮检查没有缺失汉字；新增文本时可以重新运行该检查。新 UI 与世界文字应使用完整文件；旧文件留存以记录既有原型来源。

OFL 允许字体随应用使用、嵌入和分发，也允许在遵守条件的情况下修改。分发字体或其衍生文件时保留版权声明与完整 OFL 文本；字体不能单独售卖为唯一商品，衍生字体不能改为其他许可证。本轮采用项目新名称，避免将更改后的文件作为未修改原版 Noto 发布。

`LICENSE-Noto.txt` 来自 Debian 包的完整版权文档，包含字体本体的 OFL 与 Debian 包维护文件的其他许可条目。后者不代表 Noto 字体改用 GPL；字体许可按其中 `Files: *` 的 SIL-1.1 条目识别，分发时保留文档全文。

字体准备工具依赖开发机的 `fontTools`，它仅用于字体提取与元数据处理，不参与游戏运行，也不用于修改概念图。

## 3. 概念图与参考的用途

| 范围 | 来源 | 项目用途 |
| --- | --- | --- |
| `docs/concepts/lynn_character_v02.png` 与 `forest_m01_v03.png` | 本项目会话生成、经用户认可的角色与森林概念图 | 仅用于短发、披风、铜灯、配色、路径和纵深的设计参考；不当作完成的像素动画、游戏背景或发行效果截图 |
| `docs/concepts/` 中其余版本与打包预览 | 同一项目会话的设计迭代记录 | 仅用于追溯设计，不能据此声称游戏已完成这些画面 |

生成概念图与正式逐点像素素材分别记录。正式素材来自本项目代码绘制；不从概念图截取角色，也不把其他游戏截图转成像素后作为原创素材。发行包无需包含设计参考目录，游戏画面不依赖这些参考文件。

### 正式高清环境树

`assets/environments/forest_ancient_tree.png` 是本轮为游戏生成的单棵透明古树，使用 OpenAI `image_gen.imagegen` 先按原创文字简报生成，再以自己的生成结果编辑透明边缘；没有使用外部游戏图像。PNG 为工具原始输出，不从概念画中截取。它用于森林环境层，角色仍采用独立的像素精灵。尺寸、脚根锚点、两次生成的来源及文件 SHA-256 记录在[环境素材来源](../../assets/environments/README.md)。工具没有附带独立公共素材许可证，本项目没有另行将它发布为 CC0 或其他通用素材包；其项目用途与来源在发行说明中保留。

## 4. 重建与复核

从仓库根目录执行字体准备工具：

```bash
python tools/prepare_art_font.py
```

源 TTC 不在默认路径时使用 `--source` 指定本机经过授权的同版源文件。工具验证 SC face 身份，记录源文件与输出校验值，并扫描当前中文覆盖；不会覆盖既有小子集。

使用 Godot 4.6.3 与项目的可写 XDG 目录重建 PNG：

```bash
XDG_CACHE_HOME=/workspace/.godot-environment/cache \
XDG_DATA_HOME=/workspace/.godot-environment/data \
XDG_CONFIG_HOME=/workspace/.godot-environment/config \
godot --headless --path /workspace/111 --script res://tools/export_pixel_art.gd
```

导出工具只写 `assets/art/` 内的美术输出及目录元数据。后续如果引入委托画作、第三方通用素材、其他字体或音效，应为对应路径追加作者、具体来源、许可版本、商业使用/修改/署名条件和授权证据；不能用“免费”代替明确许可证。

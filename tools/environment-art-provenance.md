# 森林地表与植被来源说明

这些素材由 [generate_environment_art.gd](generate_environment_art.gd) 从零绘制，输出目录为 `assets/environments/textures/`。程序不读取既有概念图、生成树图、照片或其他游戏素材；概念图仅用于判断蓝绿森林、灰褐路径、暖灯与空间留白的设计方向。

作者来源：本项目会话内 Codex 辅助编写的原创 Godot `Image` 绘图代码。地表使用确定种子的周期场、少量原创碎叶与不规则石屑；植被使用手定义曲线、叶片轮廓、叶脉和有限色板。所有纹理均可由同一代码重建，没有引入第三方图片授权。项目对外素材许可证尚未另行指定，本说明不将素材声明为 CC0 等公共素材。

## 资源约定

| 文件 | 尺寸 | 用途与建议尺度 |
| --- | --- | --- |
| `forest_ground.png` | 512×512，不透明、可重复 | 冷青灰苔土；一张覆盖约 4–6 世界单位。大色块低对比，碎叶和石屑不形成棋盘。 |
| `forest_path.png` | 512×512，不透明、可重复 | 灰褐细颗粒土路；一张覆盖约 3–4 世界单位，避开均匀铺砖或重复菱形。 |
| `forest_stone.png` | 512×512，不透明、可重复 | 灰青石表，稀疏不规则裂纹；一张覆盖约 2–3 世界单位。 |
| `forest_grass.png` | 128×128，透明 | 多层成片草叶；根锚 `(64,120)` / UV `(0.5,0.9375)`，高约 0.35–0.65 世界单位。 |
| `forest_fern.png` | 128×128，透明 | 多向成组蕨叶，冷阴面、灰绿上表面；同根锚，高约 0.75–1.1 世界单位。 |
| `forest_shrub.png` | 128×160，透明 | 有支干与厚薄叶群的小灌木；根锚 `(64,152)` / UV `(0.5,0.95)`，高约 0.85–1.25 世界单位。 |
| `forest_litter.png` | 128×96，透明 | 原创碎叶、细枝与石屑簇；优先用水平地面 decal，中心 `(64,48)`，宽约 0.5–0.9 世界单位。 |

上述世界尺度是取景起点，不更改碰撞。地表本身已包含青灰或灰褐颜色，应用时避免再乘旧深青底色造成过暗。建议地表使用线性过滤与 mipmap；植物在实际镜头下比较 nearest 与带 mipmap 的线性过滤，按角色像素风和远景闪烁选取。植物没有额外黑描边，零 alpha 边缘保留邻近叶色 RGB，降低线性采样时的黑边；主体透明度没有被模糊扩大。

`preview_terrain.png` 按地表、土路、石材顺序排列，`preview_plants.png` 按草、蕨、灌木、地面碎叶顺序排列，只用于美术检查。`environment_art.json` 记录正式图的尺寸、锚点、尺度与来源。

## 重建与检查

```bash
XDG_CACHE_HOME=/workspace/.godot-environment/cache \
XDG_DATA_HOME=/workspace/.godot-environment/data \
XDG_CONFIG_HOME=/workspace/.godot-environment/config \
godot --headless --path /workspace/111 --script res://tools/generate_environment_art.gd
```

基础噪声使用周期格点，碎叶、石屑和裂纹越界时写回另一边，确保重复纹理没有被硬裁断的物件。工具检查平均对边颜色跳变、植物透明背景、可见主体和意外黑色像素；最终仍需在游戏正常尺寸检查路线、人物和攻击提示是否清楚。此工具仅写环境纹理及元数据，不修改角色、玩法或世界渲染脚本。

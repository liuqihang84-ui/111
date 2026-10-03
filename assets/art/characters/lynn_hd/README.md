# 林恩 0.3.1 原生高细节像素精灵

本目录是独立重画的64×96林恩游戏精灵。没有放大旧32×48PNG，也没有裁切生成插画来代替角色动画。角色造型依据项目已认可的林恩v02与森林v03文字/图像方向：米白短发、琥珀眼、青绿短披风、米色卷袖工作衫、深青短裤、褐色绑带靴、左手铜灯、右腰工具袋。

全部像素由 `tools/generate_hero_visual.py` 在目标像素网格上以原创坐标/多边形/单像素线绘制。Pillow仅作光栅化与PNG输出；重建命令为 `python3 tools/generate_hero_visual.py`。精灵没有抗锯齿或模糊滤波。四方向独立组合头部、披风与装备层，东西侧不是成品图镜像。

每个方向提供待机4、行走6、攻击6、闪避4、举灯6、受击3、倒地6、交互4帧。行走改变膝脚落点、手臂摆动和披风尾；攻击包含蓄势/挥动/回收以及光刃轨迹；待机有呼吸、披风和眨眼变化。所有动作由同一角色绘制参数产生，保留稳定身份。

公开接口：`scripts/hero_visual.gd` 的 `frame(direction,index,action)->Texture2D`，方向为south/north/east/west，动作键同旧API。`FOOT_ANCHOR=Vector2(32,88)` 是源画布脚点，`PIXEL_SIZE=0.017` 是建议世界单位/像素，用于保持旧角色世界身高。底部y=88..95全透明；脚下阴影由场景单独渲染。

`metadata.json`记录尺寸、帧数、帧率、每张图SHA-256、色板和检查结果。`lynn_turnaround.png`、`lynn_pose_contact.png`与`lynn_pulse_contact.png`是像素原稿放大检查图，`lynn_walk_review.gif`是四向行走审查动画；实际游戏读取各横排PNG图集。Godot检查工具为 `tools/validate_hero_visual.gd`，核对实际导入像素与原PNG一致、图集尺寸、透明脚边、动作帧差异、帧循环和纹理缓存。

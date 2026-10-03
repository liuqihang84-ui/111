> **0.3.1-dev 最新下载**：[Windows / Linux / 源码](downloads/README.md) · [实机画面前后对比](downloads/visual-comparison.md)。本分支保存实际源码、开发游戏包与截图。

# Lumenfall · 暮光之森

原创 Godot HD-2D 动作冒险。林恩提着导师留下的铜灯，从灯火村走进暮光森林，追查熄灯原因，穿过雾泽、遗迹和旧城，最终修复灯塔。米白短发、青绿披风、暖灯与蓝绿环境沿用已认可的[角色及森林概念方向](docs/concepts/preview.md)。游戏画面使用正式像素精灵与正交三维场景；概念插画没有用作可行走场景。

本仓库目前是**可从开场玩到结局的全流程开发版**，包含五章十五图、十种敌人、五名 Boss、三十个机关、八条支线、四种逐步获得的灯具能力、六枚护符、商店与三槽存档。当前主线暂估 90–200 分钟，全可选内容暂估 120–250 分钟，均非真人实测；内容仍低于已确认的主线五小时以上目标，需要继续扩充并以首次试玩计时验收。具体范围与检查证据见[内容制作记录](docs/production-design.md)。

**0.3.1-dev 画面改进**使用独立重画的64×96林恩精灵、苔土／土路／石材贴图、成组植被、溪桥地标、接地灯光与紧凑HUD；详情和实际画面对照见[画面改进记录](docs/visual-improvements.md)。

## 游玩

独立 Windows / Linux 包位于 `builds/lumenfall-0.3.1-dev-*-x86_64.zip`，浏览器下载入口见仓库 `game-playtest` 分支的[下载页](https://github.com/liuqihang84-ui/111/tree/game-playtest/downloads)。解压整个目录，运行 `lumenfall.exe` 或 `./lumenfall.x86_64`；保留旁边的 `lumenfall.pck` 和授权说明。独立包无需安装 Godot。Linux 需要图形桌面与支持 OpenGL 3.3 的驱动；Windows 包已在云环境导出，Windows 设备实机运行仍需验证。开发版未做Windows代码签名，首次运行可能触发SmartScreen未识别程序提示。

也可用 **Godot 4.6.3** 打开 `project.godot`，按 F5 运行。标题页支持新游戏、继续、三槽选择与覆盖确认。首次游玩建议选择标准难度；设置内可切换故事／标准／挑战，调整音量、字体大小、画面细节及按键。

| 操作 | 键盘 / 鼠标 |
| --- | --- |
| 移动 | WASD / 方向键 |
| 光刃 | J / 鼠标左键 |
| 翻滚 | 空格 |
| 交互、推进对白 | E |
| 提灯 | L |
| 光脉冲 | Q |
| 护罩 | F |
| 使用恢复药 | H |
| 日记 / 地图 / 行囊 | Tab / M / I |
| 暂停或返回 / 确认 | Esc / Enter |

支持手柄左摇杆、南面交互、东面翻滚、西面攻击、北面脉冲、左右肩键提灯／护罩。菜单支持方向选择与确认。触屏拖动移动仍为辅助输入，当前主要验收平台是桌面。

靠近灯具后先提灯再交互。获得透镜后，提灯靠近雾中痕迹可发现隐线；符文需要结合调查记录辨认顺序。机关界面暂停战斗，关闭时保留操作状态。Boss 会预告攻击范围，部分阶段需要已有灯具能力破解节点。篝火恢复生命、灯火并保存旅程，也能更换两枚护符；药品可向阿芙购买。已完成主线、机关、Boss 和一次性奖励会永久保存，死亡后从最近篝火继续。结局后可继续探索，回访完成余下的支线。

## 环境和开发

固定 **Godot 4.6.3 / GDScript / GL Compatibility**。不需要 npm、C#、第三方游戏插件或在线账户。发行时所有素材均为本地资源。云环境已安装引擎、Xorg dummy、Mesa 和匹配的 Linux / Windows 导出模板。首次恢复或模板缺失时执行：

```bash
cd /workspace/111
bash tools/setup.sh
```

安装脚本复用已有工具，缺少引擎或模板时从官方 4.6.3 发布下载并检查固定 SHA-512；导出模板还逐文件核验 SHA-256。完整模板压缩包约 1.26 GB，只提取本项目所需的两平台文件。该脚本面向 Linux 云开发环境；本地开发也可直接通过 Godot 编辑器安装同版本模板。

```bash
bash tools/dev.sh import       # 导入新增或修改的资源
bash tools/dev.sh test         # 战役、存档、内容布局、机关和主场景检查
bash tools/dev.sh build        # 生成 PCK
bash tools/dev.sh release      # 导出独立 Linux / Windows 可执行文件及数据包
python3 tools/package_release.py # 压缩独立包、授权说明并生成 SHA-256 清单
bash tools/dev.sh smoke        # 无界面启动主场景
bash tools/dev.sh pack-smoke   # 启动打包后的 PCK
bash tools/dev.sh release-smoke # 验证独立 Linux 程序能启动
bash tools/dev.sh release-acceptance # 从仓库外用同版本 Godot 检查发行 PCK 的菜单、移动与存读档
bash tools/dev.sh capture      # 实际渲染标题与游玩截图
bash tools/dev.sh run          # 启动游戏
bash tools/dev.sh editor       # 启动编辑器
```

测试失败或日志出现 Godot `SCRIPT ERROR` / `ERROR` 时，命令返回非零状态；具体计数以本次测试日志为准。[验证记录](docs/verification.md)说明自动测试与真实独立程序运行的范围和限制。`builds/` 和 `.godot/` 为可再生输出，不纳入源码。图形检查截图在 `builds/title.png`、`builds/gameplay.png`。

`tools/dev.sh` 将缓存、数据和配置目录放在可写的 `/workspace/.godot-environment`。可用 `LUMENFALL_RUNTIME_DIR` 调整，也可用 `GODOT_BIN` 指定引擎。没有桌面显示时，启动脚本准备本地虚拟 Xorg，Mesa 软件渲染，并采用 Dummy 音频驱动；它用于内部运行和截图，不提供浏览器试玩或远程桌面。新云任务需要重新启动编辑器、游戏及虚拟显示。

## 源码、设计与素材

| 目录 / 文件 | 用途 |
| --- | --- |
| [完整设计索引](docs/README.md) | 世界、五章剧情、角色、美术与系统设计 |
| `scripts/campaign_data.gd` | 地图、调查文字、NPC、敌人、Boss、支线与奖励 |
| `scripts/campaign_model.gd` | 战斗、成长、任务、机关与存档状态 |
| `scripts/puzzle_rules.gd` | 四种机关的纯规则、线索与状态验证 |
| `scripts/main.gd` | 场景、输入、三槽存档、界面与音频接线 |
| `scripts/world_view.gd`、`shaders/` | 三维环境、像素角色、灯光与攻击预告 |
| `scripts/game_ui.gd`、`scripts/puzzle_panel.gd` | 中文菜单、对话、地图、日记与图形机关 |
| `scripts/game_audio.gd`、`assets/audio/` | 原创配乐与音效 |
| `scripts/pixel_art.gd`、`assets/art/` | 原创像素生成器、动作、头像与敌人素材 |
| `scripts/hero_visual.gd`、`assets/art/characters/lynn_hd/` | 64×96林恩四方向八动作图集与加载接口 |
| `assets/environments/textures/` | 原创无缝地表与透明植被，来源工具在 `tools/` |
| `tests/`、`tools/` | 功能验证、环境配置、导出与打包 |

正式像素与音频均为本项目原创，生成工具在 `tools/`；森林另有一张按原创简报生成的高清透明古树，[来源记录](assets/environments/README.md)随包保留。中文字体从 Noto Sans CJK 的简体中文字形派生并重命名，采用 SIL OFL 1.1；发行时保留授权。[素材说明](docs/licenses/art-licenses.md)、[音频说明](docs/licenses/audio-licenses.md)与 Godot MIT 及第三方版权说明一起放入独立包。生成辅助概念稿保留在设计目录，未纳入发行资源。

云任务已有独立环境，直接使用 `/workspace/111` 的现有仓库；无需另建 Git worktree。保存环境配置与发布环境快照是不同步骤，环境的发布由环境设置界面完成。

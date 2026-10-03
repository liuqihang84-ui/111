# 暮光之森 0.3.0-dev 运行与交付验证

验证日期：2026-10-03（Asia/Shanghai；原始 GUI 记录时间 2026-10-02 18:28 UTC）。引擎与导出模板均为官方 Godot 4.6.3，GDScript、GL Compatibility、Linux x86_64 云环境。当前版本能从开场推进至固定结局，并在结局后继续探索；属于全流程开发测试版。

## 源码功能检查

本次最终修改后执行 `bash tools/dev.sh test`，退出状态为 0，全部套件实际执行，日志没有 `SCRIPT ERROR` 或 `ERROR`。

| 套件 | 本次结果 | 范围 |
| --- | --- | --- |
| CampaignModel | 148/148 | 五章推进、能力与战斗、Boss、任务与奖励、存读档、结局后继续探索 |
| ProgressStore | 42/42 | 原子写入、文件大小与结构校验、损坏与失败路径 |
| CampaignContent | 1645/1645 | 十五地图、对象可达性、能力依赖、对白、支线与奖励数据 |
| PuzzleRules | 1143/1143 | 三十机关的初始状态、有效操作、解法、非法输入与保存状态 |
| World | 15 地图，failures=0 | 几何与精灵、灯具能力、攻击预告和地图切换 |
| CampaignScene | 295/295 | 实际主场景、UI 操作、对话、商店、机关界面、三槽保存、已读调查回看与结局探索 |

输出为 `builds/*-tests.log`，完整本轮摘要为 `builds/final-tests-summary.log`。自动测试会设置位置、能力或战斗状态以检查边界和章节依赖，不能代替真人连续首次游玩、操作手感或时长验收。

## 打包与独立程序

`bash tools/dev.sh build` 和 `bash tools/dev.sh release` 均成功，导出 PCK、Linux 与 Windows x86_64 独立程序。固定模板文件 SHA-256 校验通过；没有导出脚本错误。

`bash tools/dev.sh release-acceptance` 从仓库外的临时目录，用同版本 Godot 加载真实 Linux 发行 PCK，执行菜单、字体、音频加载、新旅途、对白、移动、暂停和真实存读档检查，结果 **14/14**，退出状态 0。该检查验证发行数据包及其代码；它不是直接向官方 release 可执行文件注入脚本，因为官方 release 模板不支持该路径覆盖。

另用 `tools/native_gui_check.py` 启动真实 Linux 独立可执行文件，工作目录与用户数据均在隔离 `/tmp` 目录，无 `--path`、`--script` 或替换 PCK 参数。通过 X11 给该子进程发送实际键鼠输入，结果 **7/7**：

1. 找到由本次子进程拥有且已显示的窗口。
2. 从标题页新建槽 1，并写入真实存档。
3. 用 E 推进开场对白，进入村庄冒险。
4. 用 D 移动，暂停并保存；保存的位置确实改变。
5. 暂停时再次保存，保存时间推进，游戏内时间保持不变。
6. 返回标题，点击继续、载入槽 1，再移动；继承原有位置与进度。
7. 点击标题页退出，进程正常结束，退出码 0。

结果及包 SHA-256 在 `builds/native-gui-result.json`，与本次导出文件匹配；原始日志为 `builds/native-gui.log`。日志没有脚本错误或退出泄漏。云机没有声卡，正常启动时 ALSA 初始化报告 `ERR_CANT_OPEN` 后引擎切换 Dummy 驱动；虚拟 Mesa 驱动也报告无法设置 VSync。这些记录不代表真实设备声音或性能已经验收。

源码、PCK 与原生程序的强制帧数启动检查均成功。`--quit-after` 直接终止 SceneTree 时仍可能报告 AudioStream 的 ObjectDB 退出泄漏警告；从游戏按钮正常退出已停音频并等待混音线程释放，通过上述第 7 项验证。没有将强制退出警告隐藏或当成正常退出通过证据。

## 交付文件与实景

运行 `python3 tools/package_release.py` 生成：

| 文件 | 用途 |
| --- | --- |
| `builds/lumenfall-0.3.0-dev-windows-x86_64.zip` | Windows 独立游戏，完整解压后运行 exe |
| `builds/lumenfall-0.3.0-dev-linux-x86_64.zip` | Linux 独立游戏，完整解压后运行 x86_64 程序 |
| `builds/lumenfall-0.3.0-dev-source.zip` | 源码、素材、策划、工具与测试备份 |
| `builds/release-manifest.json` | 三个压缩包的大小与 SHA-256，以及发行 exe/PCK 哈希 |

两平台独立包包含操作说明、Godot MIT 与第三方版权清单、字体 OFL、原画与音频来源。压缩包逐一完成 ZIP CRC 校验。源码包来自 Git 已跟踪与未忽略文件清单，保留正式资源、设计文档及生成工具，排除 `.git`、`.godot`、`builds` 和 Python 缓存。

`builds/title.png`、`builds/gameplay.png` 是实际 Godot GL 场景渲染。`builds/native-title.png`、`builds/native-play.png`、`builds/native-pause.png` 与 `builds/native-reloaded.png` 来自真实独立 Linux 程序。它们不是生成的概念插画。

## 尚未完成的验收

- Windows 包已导出，尚未在 Windows 设备运行。
- 尚未完成真人首次连续通关、手柄与不同分辨率实机、声音播放和性能验收；不声明测得 60 FPS。
- 当前主线暂估 **90–200 分钟**，全可选暂估 **120–250 分钟**，均非实测，仍低于已确认的主线五小时以上目标。详见[内容规模与后续扩充](production-design.md#目前时长估计与差距)。
- 美术已形成可运行的像素角色与三维环境，完整商业美术精修仍需继续；不能把已认可概念稿的质量视为每张实机地图的完成度。
- 环境配置保存、远端代码上传、环境快照发布和新任务恢复是不同动作。没有对应结果时，不声明已发布或已验证新任务恢复。

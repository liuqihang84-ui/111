# 一日一笺 · 配色提案 v04

2026-10-05（北京时间） · proposal · 仅 UI / VI 设计，未实现 Android App 或生成 APK。

保留 v02 的可爱造型、手账结构与 v03 的材质区分，本轮只调整颜色。**A 是当前完整概念稿的工作方向，不代表用户已选择或批准**；`defaultDirection: A`、`selectedDirection: null`、`userApproved: false` 记录在 [palettes.json](palettes.json)。

## 三套 nominal HEX

| 角色 | A · 雾莓奶灰 | B · 瓷白雾蓝 | C · 燕麦苔绿 |
| --- | --- | --- | --- |
| background | `#F4F0EC` | `#EEF1F2` | `#F3F0E7` |
| surface | `#FCFAF7` | `#F9FAF8` | `#FBF9F2` |
| ink | `#3E343B` | `#293B45` | `#423B30` |
| secondary | `#6E646A` | `#5E6E75` | `#6C665B` |
| accent | `#927383` | `#718C9C` | `#929476` |
| accentSoft | `#E9DDE1` | `#DCE4E8` | `#E5E5D7` |
| stickerLeaf | `#7E8878` | `#7C8C84` | `#848A6E` |
| stickerFlower | `#C4A7B1` | `#C6ADAA` | `#D0BE91` |

A 使用暖白角色、灰莓折角、轻蓝灰杯与云、鼠尾草叶和淡玫瑰花；B 更清爽，C 更温暖。素材协调明度、光线与反射强度，各物件保留自己的色相；不把全部素材染成同色，不强制调色用户照片。

## 色对计算与使用规则

| 不透明 canonical 色对 / 对比度 | A | B | C |
| --- | ---: | ---: | ---: |
| ink / background | 10.53 | 10.24 | 9.70 |
| secondary / background | 5.01 | 4.67 | 5.00 |
| surface / ink · 主操作 | 11.46 | 11.11 | 10.49 |
| ink / accentSoft | 9.04 | 9.03 | 8.70 |
| secondary / accentSoft | 4.30 | 4.11 | 4.48 |
| accent / background | 3.70 | 3.12 | 2.74 |

以上是指定不透明 sRGB 色值的 WCAG 公式计算，普通文字参考至少 4.5:1。**soft 区域文字只用 ink**；三套 secondary / soft 均不足。主操作用 ink 底、surface 字，accent 与素材色只用于少量装饰，不承担常规小正文。

必要焦点、选中与任务状态不能仅靠 accent 细描边或颜色变化；使用清楚的 ink 边界 / 符号与非颜色语义。A 的 ink / accent 只有 2.84:1，勾选符号应放在 accentSoft 或 surface 上。完整计算、公式与舍入前阈值判断见 JSON。

中性 75%、主色与软色 20%、点缀 5% 是构图 guidance，**不是截图面积测量**。保持可爱色彩，避免满屏粉色、深色漆面或全部灰化。

## 设计板与边界

已归档 [三套配色对照](color-comparison-v04.png) 与 [A 完整工作稿](ui-vi-color-v04.png)，并提供可编辑色板 `palette-swatches.svg`、平面标识和拟议设计 tokens。生成图用于颜色气质比较，不能保证每个像素准确等于 nominal HEX。

图中文字、日期、照片与任务均为示例；首次使用应为空白。色对计算不等于截图或设备验证，未核验实际字体、半透明叠色、键盘、触控、保存、无障碍或性能。本轮为配色提案，未实现 App；v02 / v03 目录保留不改。

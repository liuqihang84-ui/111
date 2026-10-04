# 一日一笺 · 电子手账

**0.2.0**：桌上的布面册子、手工纸与十二件有材质的小物。点击封面打开，切换日期翻页，纸面保持正面，方便写字和摆放。

## 下载与试用

| 下载 | 使用方式 |
| --- | --- |
| [电子手账网页 ZIP](https://github.com/liuqihang84-ui/111/raw/refs/heads/journal-playtest/downloads/yiri-journal.zip?v=0.2.0) | 约 8.0 MB。完整解压后打开 `yiri-journal.html` |
| [独立源码 ZIP](https://github.com/liuqihang84-ui/111/raw/refs/heads/journal-playtest/downloads/yiri-journal-source.zip?v=0.2.0) | React/TypeScript 源码、本地美术、锁文件、测试与启动脚本 |

初次打开已有两本示例手账；可直接修改，或创建新册子。核心功能包括书架、三种封面、月历、每日随笔、待办和心情、照片上传、12 件透明 PNG 小物的拖动/角手柄缩放/旋转/复制/前置、撤销重做、自动保存、PNG 导出和 JSON 备份恢复。手机有大字号文字编辑区，并支持触摸拖动。

## 实际截图

白花枝有叶脉和花瓣，团扇有丝面与扇骨，茶盏有釉面反光，线装书有装订线与纸边；布面和纸张也换了纹理。三种封皮配色使用同一张新布面山水图。

![实际纸页上的小物细节](preview/journal-material-details.png)

![桌上的实体册子](preview/journal-desktop-desk.png)

![每日编辑器](preview/journal-desktop-editor.png)

![手账书架](preview/journal-desktop-books.png)

![月历回顾](preview/journal-desktop-calendar.png)

![手机编辑器](preview/journal-mobile-editor.png)

![手机大字号文字编辑区](preview/journal-mobile-text-editor.png)

## 保存与导出

内容保存到当前浏览器；照片在设备内处理。PNG 为 1280 × 1680 的纸页图片，JSON 可恢复全部文字、照片、贴纸位置与书册。更换设备、浏览器、网页地址或文件路径前，先下载 JSON 备份。导入前会下载当前内容的备份。超出纸页空间的长随笔会缩小排版，过多换行可能在 PNG 中截短，完整文字保存在 JSON 内。

桌面册子的厚度、封面和翻页使用 CSS 3D，小物使用带材质的二维透明图像。旧版 JSON 备份仍可导入。

这是可下载的网页原型，尚未公开托管；没有账号或云端同步。当前环境的浏览器禁止 `file://`，因此离线验收使用真实 HTTP 载入与下载包相同字节的 HTML 后断网，未绕过管理策略。用户本地打开方式见包内说明。

## 验证与开发

31 项单元测试、13 项浏览器验收通过。检查了实际开册、真实手柄缩放与整次操作撤销、素材层级、图片导出、备份恢复、手机触摸、断网使用，浏览器无控制台错误或未捕获异常。详见 [验证记录](journal/docs/QA.md) 和 [交付说明](journal/docs/DELIVERY.md)。

```sh
cd journal
bash tools/install.sh
PORT=4180 bash tools/serve.sh preview
```

开发模式：`PORT=4180 bash tools/serve.sh dev`。启动说明见 [START.md](journal/docs/START.md)，美术来源与完整许可证随源码和网页包保留。

原 [中国美学工作台](https://github.com/liuqihang84-ui/111/tree/art-workbench) 和旧游戏分支保持可用。

# 当前任务：观物 · 中国美学与 AI 美术工作台

当前用户要求研究与制作同等重要，先制作美术工作台，不确定游戏类型，不继续开发旧 Godot 游戏。
当前是加入深研室的第二版：研究馆、深研室、制作台、检验室、项目册五个工作区。新增研究档案、单变量 A/B 任务、三类原创 SVG 结构练习、人工审校和研究笔记导出；实验参数与观察进入制作简报，再保存和恢复项目。
保留 /workspace/111 下全部既有文件和用户更改。每个任务已有隔离云环境，不额外创建 Git worktree。
应用目录为 /workspace/111/art-workbench；独立 art-workbench 远端分支如已交付，源码目录也保持 art-workbench。
不要重置/替换现有未提交或未跟踪的旧游戏文件来同步分支。

## 安装与构建
环境已有 Node.js 24.19.0、npm 11.9.0、Python 3.12.14、/usr/bin/chromium。
项目固定依赖版本与 package-lock.json。执行：
cd /workspace/111/art-workbench
bash tools/install.sh
该脚本检查 Node，使用 /workspace/.npm-cache 安装锁定依赖，执行单元测试、类型检查、生产与单文件构建，并检验嵌入资源/ZIP CRC/SHA-256。
正常 npm 构建使用随源码保留的图片及 Guanwu Serif 字体，不要求重新生成字体，不依赖 Python 第三方包。
字体再生是可选工作：tools/subset-font.py 固定原始字体 SHA，使用 fontTools/Brotli；保留 OFL 许可证与字体出处，不作为常规启动步骤。

## 启动与验收
在应用目录执行 PORT=4173 bash tools/serve.sh dev；生产预览为 PORT=4173 bash tools/serve.sh preview。
脚本监听 0.0.0.0，严格占用指定端口。先检查可用端口；不要结束来源不明的进程。测试前使用内部 HTTP 请求确认标题与资源加载。
常规浏览器检查：BASE_URL=http://127.0.0.1:4173 npm run test:browser。
浏览器检查包含常规研究、制作、项目和图像分析流程，以及深研路线切换、单变量对照、研究 Markdown/JSON 导出、传入制作台、参数和手动编辑保存恢复。具体用例数、通过数和执行范围以当次 test-results/browser-report.json 与 docs/DELIVERY.md 为准，不照抄前次结果。
Playwright 配置使用已安装的 /usr/bin/chromium。仅启动自己任务的服务；直播进程在新任务需要重启。
端口是云环境内部地址，不能把用户电脑 localhost 当作用户可用预览。交付可下载的单文件 HTML/ZIP，或使用实际已配置并验证的公开托管入口。

## 交付和边界
npm run build:portable 输出 dist/、release/guanwu-art-workbench.html、release/guanwu-art-workbench.zip 及 release-manifest.json。
单文件内嵌脚本、CSS、原创研究板、SVG 练习和字体；来源超链接需要联网。用户项目保存在浏览器本地，提供 JSON 导入导出，上传图片只在浏览器 Canvas 分析。研究笔记可导出 Markdown/JSON；滑块与人工勾选用于记录创作者自己的研究，不自动判定美术质量。
当前未连接在线图像生成模型或云端项目同步，不声称网页已自动生成完整可交付资产。
管理员 Chromium URL 策略不允许 file://。保持管理策略，不换浏览器/改策略绕过；用允许的 HTTP 载入与 release 完全相同字节的 HTML，再断网验证页面工具，并明确记录本地文件打开模式未在当前环境实测。
当前研究含 12 条路线与 37 条核心来源。第二版通过官方具体页面核对了12个条目，其中11个对应核心来源，另一个永乐杯只作避免混件的对照。来源最终 verified/reference 数量按 src/data/traditions.ts 及 docs/evidence-audit.md 核对；不因来源状态升级就自动将历史陈述、结构分析或现代制作假设改为确证事实。未核对的书目、对象组与具体器物保留待核标记，不虚构网页ID、访问日期或许可。现代 HEX 色板、AI 原创研究板和 SVG 相对参数与历史依据分开。
核验开始于北京时间2026-10-03夜间，跨至2026-10-04零时；逐条采用实际响应时间，不能全部冒填任务开始日。马远水图按故宫现行卷、十二段说明，千里江山1113按蔡京赐图跋记说明，传李思训的归属不删“传”。
新增官方资料域名只保存在配置草稿，当前运行时策略未必已应用。部分具体官方GET已实际成功，仍须以当前运行时策略与请求结果判断网络能力；不要再声称所有馆网都被阻止。遵守已有代理和 TLS 信任，不绕过域名策略。
本地构建或源码/下载分支交付不会启用 GitHub Pages。公开上线须有当前会话对应的用户授权和实际部署验证。
保存配置草稿不代表已发布云快照或验证跨任务恢复。保留源码/锁文件/许可证，依赖和输出可重建；不要宣称 fresh-task restoration 已验证。

## 以下为保留的旧 Godot 项目运行说明
仅在用户重新明确要求旧游戏时使用。它不是当前安装与启动的默认工作流。

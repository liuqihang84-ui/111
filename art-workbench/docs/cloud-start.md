# 当前任务：观物 · 中国美学与 AI 美术工作台

当前用户要求研究与制作同等重要，先制作美术工作台，不确定游戏类型，不继续开发旧 Godot 游戏。
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
Playwright 配置使用已安装的 /usr/bin/chromium。仅启动自己任务的服务；直播进程在新任务需要重启。
端口是云环境内部地址，不能把用户电脑 localhost 当作用户可用预览。交付可下载的单文件 HTML/ZIP，或使用实际已配置并验证的公开托管入口。

## 交付和边界
npm run build:portable 输出 dist/、release/guanwu-art-workbench.html、release/guanwu-art-workbench.zip 及 release-manifest.json。
单文件内嵌脚本、CSS、原创建议图和字体；来源超链接需要联网。用户项目保存在浏览器本地，提供 JSON 导入导出，上传图片只在浏览器 Canvas 分析。
当前未连接在线图像生成模型或云端项目同步，不声称网页已自动生成完整可交付资产。
管理员 Chromium URL 策略不允许 file://。保持管理策略，不换浏览器/改策略绕过；用允许的 HTTP 载入与 release 完全相同字节的 HTML，再断网验证页面工具，并明确记录本地文件打开模式未在当前环境实测。
当前研究含 12 条路线、37 条参考线索，均标 reference；受网络限制未逐件核验馆藏，不能标 verified 或虚构访问日期。现代 HEX 色板、AI 原创示意与历史依据分开。
新增官方资料域名只保存在配置草稿，当前运行时策略未必已应用。遵守已有代理和 TLS 信任，不绕过域名策略。
本地构建或源码/下载分支交付不会启用 GitHub Pages。公开上线须有当前会话对应的用户授权和实际部署验证。
保存配置草稿不代表已发布云快照或验证跨任务恢复。保留源码/锁文件/许可证，依赖和输出可重建；不要宣称 fresh-task restoration 已验证。

## 以下为保留的旧 Godot 项目运行说明
仅在用户重新明确要求旧游戏时使用。它不是当前安装与启动的默认工作流。

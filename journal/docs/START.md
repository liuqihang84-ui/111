# 当前工作流：一日一笺 · 电子手账

当前应用是 `/workspace/111/journal` 内的电子手账首个原型 `0.1.0`，默认端口 `4180`。保留 `/workspace/111` 中既有美术工作台、旧 Godot 游戏和用户更改。每个任务已有隔离云环境，使用现有检出，不额外创建 Git worktree。

## 安装、检查与构建

需要 Node.js 20.19+、22.12+ 或更新的受支持版本、npm 和 Python 3。使用已锁定的依赖与随源码保留的美术、字体；常规启动不需要生成图片、重新制作字体或安装 Python 第三方库。

```sh
cd /workspace/111/journal
npm ci
npm test
npm run build:portable
```

`bash tools/install.sh` 是同一安装工作流的辅助脚本，会检查 Node/Python，使用工作区 npm 缓存，安装锁定依赖并运行单元测试与生产、单文件构建。

`build:portable` 输出 `dist/`、`release/yiri-journal.html`、`release/yiri-journal.zip` 与 `release/release-manifest.json`。构建验证内嵌资源、压缩包成员、CRC 和文件字节，并记录 SHA-256。`python3 tools/package-source.py` 另行打包可独立安装的 `release/yiri-journal-source.zip`，排除依赖和生成输出。

## 启动与验证

```sh
cd /workspace/111/journal
PORT=4180 bash tools/serve.sh preview
```

开发模式改为 `PORT=4180 bash tools/serve.sh dev`。脚本监听 `0.0.0.0` 并严格使用指定端口。端口被占用时先确认已有进程的用途，不结束来源不明的进程。生产预览需要 `dist/index.html`；新任务中需重启服务，不能假定现场进程随环境快照恢复。

使用内部请求验证当前生产页面：

```sh
curl --fail --silent http://127.0.0.1:4180/ -o /tmp/yiri-journal-start.html
rg '一日一笺' /tmp/yiri-journal-start.html
```

随后可运行 `BASE_URL=http://127.0.0.1:4180 npm run test:browser`。Playwright 配置使用环境现有 `/usr/bin/chromium`；尊重浏览器管理策略。用本次报告核对实际通过、失败和跳过数量，不照抄上次结果。检查范围与重现说明见 [QA.md](QA.md)。

云环境端口是内部地址，使用平台实际提供并验证的预览入口。不要向用户提供其电脑上无法访问的 localhost 预览链接。若浏览器限制 `file://`，保留管理策略，使用允许的 HTTP 载入与发布 HTML 完全一致的字节，再断网验证，并注明本地文件打开方式未在当前环境实测。

## 数据与素材边界

全部手账在当前浏览器 `localStorage` 中自动保存，图片只在浏览器内缩小与使用；存储失败会显示提示。提供可恢复全部手账的 JSON 导入导出，导入覆盖前先下载当前备份；PNG 导出规格为 `1280 × 1680`。本版没有账号、AI API 或云端同步，不需要任何 API 密钥。

三张封面、12 枚贴纸和纸纹等均从本地原创素材衍生，随源码与 HTML 交付。完整来源和软件/字体许可证见 [ART-SOURCES.md](ART-SOURCES.md) 与 [NOTICES.txt](NOTICES.txt)。更换字体或分发衍生字体时继续保留 OFL 声明和来源。

源码与离线文件交付不代表网站已上线。保存环境配置草稿不执行命令、不发布快照，也不证明未来任务恢复已验证；不推送、重置或修改远端发布设置。

## 保留的美术工作台

`/workspace/111/art-workbench` 保持可用，默认端口 `4173`，不是当前手账启动目录。需要查看或继续制作原素材时使用其已有锁文件与脚本：

```sh
cd /workspace/111/art-workbench
PORT=4173 bash tools/serve.sh preview
```

其安装、开发与验证细节见保留的 [cloud-start.md](../../art-workbench/docs/cloud-start.md)。不要用手账的安装或打包任务覆盖美术工作台文件。

## 保留的旧 Godot 项目

旧游戏仍位于 `/workspace/111`，仅在用户重新明确要求该游戏时使用。它不是当前默认安装、启动或验证目标；保留其场景、脚本、美术、导出配置和已有更改。

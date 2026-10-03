# 观物交付与运行说明 · 0.3.0

本轮针对“类型太少、素材不够”扩充广度，同时覆盖游戏与 App 的研究和制作。已完成 48 条美学路线、73 条资料线索、192 件独立 SVG 与 10 张多案例原创 PNG 参考板。11 条旧资料有具体官方记录核验；其他 62 条保留 reference。详细对照深研档案仍是 12 份，新增路线没有借用其他档案冒充已完成实验。

## 可下载内容

| 文件 | 内容 |
| --- | --- |
| `release/guanwu-art-workbench.zip` | 单文件交互 HTML、打开说明与许可证 |
| `release/guanwu-material-library.zip` | 按类型整理的 192 个原始 SVG、10 张参考 PNG、素材清单与来源说明 |
| `release/guanwu-art-workbench-source.zip` | React / TypeScript 源码、锁文件、图像、字体、测试和启动脚本 |
| `release/guanwu-art-workbench.html` | 页面全部脚本、样式、图像与字体内嵌的单个 HTML |
| `release/delivery-manifest.json` | 最终文件大小、SHA-256 和验证记录 |
| `release/material-manifest.json` | 素材逐项尺寸、类型、用途、关联路线、透明、平铺与 SHA-256 |

先完整解压网页 ZIP，再用现代 Chrome、Edge 或 Firefox 打开 HTML。网页核心工具和下载在浏览器本地运行；点击博物馆资料需要联网。本机收藏、选中素材和项目保存使用 localStorage，重要项目请导出 JSON 备份。

素材库有分类、家族、48 条美学路线、推荐制作方向、透明、平铺、收藏与文字搜索，支持真实放大预览、深浅底色、可平铺图样重复查看，以及 SVG / PNG / 选中 ZIP / 清单下载。“用于制作”会保留所选方向与路线，带入素材 ID、源尺寸、透明和重复属性，兼容字段编辑与项目恢复。

192 个 SVG 分为 60 图标、32 纹样、24 边框、24 材质、16 界面、20 器物、16 场景；104 件有透明区域，48 件标为可平铺。7 个界面主要推荐 App、9 个主要推荐游戏，其余 176 个双向；推荐分类不限制个人或商业使用许可。

10 张整板参考图中的案例用于观察与讨论；未当作已拆分透明角色、连续动画、可通行地图、PBR 材质或实际运行的 App 控件。界面类 SVG 是可编辑布局图形，实际文本、交互、响应式和业务仍需开发。网页没有连接在线 AI 模型 API。

## 本轮验证

- `bash tools/install.sh` 在本项目实际执行，按锁文件安装 109 个依赖；27/27 单元测试、TypeScript、正常生产构建、单文件资源检查、网页 ZIP CRC 和完整素材包 CRC 通过。
- 新增素材检查验证独立图形与光照结构、全部 48 条路线关联、SVG 自包含、完整 ZIP 中原 SVG 字节一致及独立 CRC；不以单纯换色充当不同素材。
- 另外实际在 Chromium Canvas 渲染全部 192 个 SVG：没有空图或解码失败，透明标记与像素一致。48 个平铺素材检查边缘跳变，修正了四个明显断边；该检查是筛查明显接缝的启发式，不代表自动审美或所有放大尺度都完美。
- 本轮完整 `npm run test:browser` 正常退出，22/22 通过，56.1 秒；跳过、失败与不稳定重试均为 0。22 份浏览器错误附件全部为空。桌面和 390px 手机截图已生成。
- 两份离线附件分别记录深研传入参数与素材库 SVG/PNG/ZIP/参考板下载；断网阶段 HTTP(S) 资源请求尝试为 0。实际 HTML 的初次加载与刷新均校验原始字节一致。
- 44 MB 单文件超过默认调试响应缓存；测试采用同一 CDP 会话放大仅用于响应检查的缓存并读取真实请求体。未伪造响应、关闭 URL 策略或绕过网络限制。

浏览器 `file://` 导航被管理员策略阻止，未声称本机文件模式在本环境已通过。离线验收以允许的 HTTP 载入与最终 HTML 完全相同的字节，再设置浏览器离线并阻止全部 HTTP(S)，验证页面的真实图像、过滤和下载；不修改管理策略，也不把云环境 localhost 提供为用户可用网站。

## 安装与启动

```sh
cd /workspace/111/art-workbench
bash tools/install.sh
PORT=4173 bash tools/serve.sh dev
```

生产预览：

```sh
npm run build
PORT=4173 bash tools/serve.sh preview
```

重建网页与完整素材包：

```sh
npm run build:portable
npm run build:materials
npm run test:browser
```

使用锁文件和已有 `/usr/bin/chromium`，启动脚本严格监听指定端口，不自动改端口。安装脚本包含全部构建步骤，普通构建使用随源码保留的字体与图片。

## 云配置与发布

本轮安装、启动与素材包构建说明已保存到环境配置草稿。增加安徽博物院、中国丝绸博物馆、湖北省博物馆和浙江省博物馆四个资料域名的自定义允许项，保留之前的域名、包管理预设和仓库配置。保存草稿不意味着配置已激活、云快照已发布或跨任务恢复已验证。

交付继续使用 `art-workbench` 独立分支，保留旧游戏与概念图。源码与下载文件上传不代表 GitHub Pages 或公开网站已上线；`dist/` 可供授权后的静态站发布。

参考核验详见 `evidence-audit.md`，类型说明见 `rich-taxonomy.md`，192 件清单见 `material-catalog.md`，图像原始简报与 SHA 见两份 reference provenance，新增图形与资料审校见 `rich-content-audit.md` 与 `material-qa.md`。不把引用状态当作馆藏图像再分发许可，也不把现代 SVG、AI 参考板或 HEX 工作色称为历史复原。

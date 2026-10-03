import { sources } from '../data/traditions';
import type { ArtTradition, AssetKind, BriefInput, GeneratedBrief, SourceReference } from '../types';

export const assetLabels: Record<AssetKind, string> = {
  scene: '场景', character: '角色', prop: '器物', icon: '图标', interface: '界面',
};

export const formatOptions = [
  { value: 'hd2d', label: 'HD-2D / 2.5D' },
  { value: 'pixel', label: '像素绘制' },
  { value: 'vector', label: '矢量与平面' },
  { value: 'painted', label: '绘画与插画' },
] as const;

export function defaultInput(traditionId: string): BriefInput {
  return {
    traditionId, target: 'game', assetKind: 'scene',
    subject: '雨后临水的旧书铺，门前有人停舟', feeling: '安静、有生活痕迹，带一点未知',
    format: 'painted', detail: 58, colorIntensity: 62, whitespace: 42,
  };
}

const clean = (value: string, fallback: string) => value.trim().replace(/\s+/g, ' ') || fallback;
const percent = (value: number) => Math.round(Math.min(100, Math.max(0, Number.isFinite(value) ? value : 50)));
const markdownText = (value: string) => value
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/([\\`*{}\[\]()#+!|])/g, '\\$1').replace(/\r?\n/g, ' ');

function luminance(hex: string): number {
  const rgb = hex.replace('#', '').match(/.{2}/g)?.map((part) => parseInt(part, 16) / 255) ?? [0, 0, 0];
  const linear = rgb.map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

function contrast(a: string, b: string): number {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}

function designTokens(tradition: ArtTradition, input: BriefInput): Record<string, string> {
  const ordered = [...tradition.palette].sort((a, b) => luminance(a.hex) - luminance(b.hex));
  const darkest = ordered[0]?.hex ?? '#29251F';
  const surface = ordered.at(-1)?.hex ?? '#F5F0E6';
  const ink = contrast(darkest, surface) >= 4.5 ? darkest
    : contrast('#181818', surface) >= contrast('#FFFFFF', surface) ? '#181818' : '#FFFFFF';
  return {
    'color.primary': tradition.palette[0]?.hex ?? darkest,
    'color.secondary': tradition.palette[1]?.hex ?? surface,
    'color.accent': tradition.palette[2]?.hex ?? darkest,
    'color.surface': surface,
    'color.text': ink,
    'color.textOnSurfaceContrast': `${contrast(ink, surface).toFixed(2)}:1`,
    'color.textIsFunctionalAddition': ink === darkest ? 'false' : 'true',
    ...Object.fromEntries(tradition.palette.map((color, index) => [`palette.${index + 1}`, color.hex])),
    'spacing.unit': '8px',
    'spacing.contentGap': `${percent(input.whitespace) >= 60 ? 32 : 24}px`,
    'radius.control': input.target === 'app' ? '8px' : '4px',
    'texture.opacity': `${percent(input.detail) >= 70 ? 0.06 : 0.03}`,
    'composition.emptySpace': `${percent(input.whitespace)}%`,
    'rendering.detail': `${percent(input.detail)}%`,
    'rendering.colorIntensity': `${percent(input.colorIntensity)}%`,
    'source.traditionId': tradition.id,
    'source.referenceIds': tradition.sourceIds.join(', '),
  };
}

interface AssetPlan { intent: string; composition: string; specification: string; checks: string[] }

function assetPlan(input: BriefInput): AssetPlan {
  const game = input.target === 'game';
  const pixel = input.format === 'pixel';
  const vector = input.format === 'vector';
  const hd = input.format === 'hd2d';
  switch (input.assetKind) {
    case 'scene':
      return game ? {
        intent: '制作可供游戏关卡进一步拆分的场景视觉方案；先让通行路线、交互物与背景层次可以分辨。',
        composition: '明确前景遮挡、中景行走面、远景三层；主要交互入口在中景形成视觉停顿，路径不得被装饰吞没。',
        specification: pixel
          ? '场景预览 1280 × 720 PNG；地表 32 × 32 px 逻辑格，交付 1024 × 1024 PNG 图集及 JSON rect 清单。地表四边平铺检查；物件单独透明 PNG。全部使用整数像素，不以缩放滤镜制造像素。图集边缘保留 2 px 复制边界，导入 nearest，无有损压缩。'
          : vector
            ? '场景预览 1280 × 720；前景 / 行走面 / 远景分别交付 SVG（统一 viewBox）与透明 PNG。线宽使用 2 / 4 px 两档，描边端点一致，去掉外链与字体依赖。地形碰撞参考层独立，装饰不写入碰撞层。'
            : hd
              ? '2.5D 场景预览 1280 × 720，正交视角保持统一俯视角；地表交付 1024 × 1024 可平铺 albedo PNG，树木 / 器物交付透明 billboard PNG。另交分层前中远景与脚点标记 JSON。billboard 底部脚点落在同一地面，不在贴图里烘焙第二个方向的投影；角色与物件边缘保留 8 px 透明区。'
              : '场景预览 1920 × 1080 sRGB PNG；前景 / 中景 / 远景各交透明 PNG，分层命名与预览位置一致。地表若可复用另交 1024 × 1024 无缝贴图，不能把完整概念画当作可平铺材质；单物件保持同一光向与尺度。',
        checks: ['缩到 320 × 180 仍能辨认入口、路线和主要交互物。', '关掉纹理与装饰，只看明暗剪影仍能读懂空间。', '拆层后无重复阴影；透明物件没有白边；平铺地面无接缝。'],
      } : {
        intent: '制作 App 的入口插画或空状态背景；视觉承担情绪引导，操作与信息仍由界面组件承载。',
        composition: '预留标题与主按钮的安静区域；分别检查竖屏和横屏裁切，主体不能占据安全区。',
        specification: vector
          ? '交付 SVG 主图（viewBox 0 0 1440 900）与 390 × 844 / 1440 × 900 两份布局预览；提供 1× / 2× PNG fallback。移除脚本、外部资源与嵌入字体；核心主体独立分组，以 CSS 变量引用色值。'
          : '交付 1440 × 900 横屏与 780 × 1688 竖屏 sRGB WebP / PNG，以及透明主体 PNG。注明主体安全裁切区域和 object-position；首屏背景建议压缩到 300 KB 以下，用真实导出结果复核。界面文字不得烘焙进图片。',
        checks: ['390 px 宽屏与 1440 px 宽屏均不裁掉主体。', '加入真实标题和按钮后背景不争夺注意力。', '文字与按钮由前端绘制；图片关闭时页面仍可操作。'],
      };
    case 'character':
      return game ? {
        intent: '制作原创游戏角色；服装与随身物件服务于职业、动作和可识别轮廓，不照抄参考画中的人物。',
        composition: '同一角色先画正面、侧面、背面三视图；通过衣服外轮廓、头身比例、负重位置辨认，不只靠颜色区分。',
        specification: pixel
          ? '动画帧 64 × 96 PNG、RGBA 透明；四方向各 6 帧行走，共 24 帧，6 列 × 4 行图集 384 × 384。统一脚点 (32, 88)，JSON 标注每帧 rect / pivot / duration。整数像素与 nearest 过滤；锁定脸、衣领、腰带和装备位置，移动不能改变角色比例。'
          : hd
            ? 'billboard 动画帧 128 × 192 PNG、RGBA 透明；四方向各 6 帧行走，共 24 帧，6 列 × 4 行图集 768 × 768。统一脚点 (64, 176)，JSON 标注 rect / pivot / duration；另交正侧背三视图。脚点与角色碰撞体分离，照明主方向统一，不能把环境投影画进透明帧。'
            : vector
              ? '角色正 / 侧 / 背三视图各 512 × 768 SVG；头、躯干、四肢、随身物按一致 ID 分组，另交 PNG 预览和 pivot JSON 供骨骼动画。描边宽度统一，装饰不跨越可动关节，前后面装备对应。'
              : '三视图各 1024 × 1536 PNG，RGBA 透明；同一头身比例、衣褶结构和装备位置。另交 128 × 192 缩小预览检验轮廓。若进入动画管线，再绘制部件拆分与 pivot JSON；三视图不能直接宣称可用动画图集。',
        checks: ['黑色剪影下能辨认职业与主要装备。', '正侧背衣领、腰带、鞋型与装备数量对应。', '24 帧图集的脚点一致，无抖动、断帧或装备瞬移；静态稿先不冒充动画。'],
      } : {
        intent: '制作 App 引导人物或品牌角色；清楚的表情与手势辅助任务，不替代导航标签。',
        composition: '固定脸型、头身比例与服装轮廓；设计欢迎、解释、完成三个表情和姿态，区别情绪而不更换身份。',
        specification: vector
          ? '交付三姿态 SVG，统一 viewBox 0 0 512 640；独立命名 face / hand / body 分组，另交 1024 × 1280 透明 PNG。颜色映射 CSS token，屏幕阅读器使用真实文本描述，插画装饰时 aria-hidden。'
          : '交付三姿态 1024 × 1280 RGBA PNG / WebP 与 128 × 160 缩略预览；四边 8% 安全区，服装与脸型保持一致。三姿态静态资源不冒充逐帧动画，文字和按钮由前端实现。',
        checks: ['128 px 尺度表情仍清楚，细节不变成噪点。', '三个姿态脸型、服装色块与手指数一致。', '角色不遮挡主要任务，插画关闭后功能仍可理解。'],
      };
    case 'prop':
      return {
        intent: game ? '制作可拾取或可交互器物；从实际用途与制作工艺确定结构，再做原创变化。' : '制作 App 功能插画中的器物；借结构和质感表达功能，避免把难识别的古物强当按钮。',
        composition: game ? '统一 3/4 视角与光向，器物落在明确脚点；重要功能部位比纹饰更醒目。' : '保持同一视角和基线；在轮廓内表现材质，不依靠复杂背景暗示用途。',
        specification: vector
          ? '交付 256 × 256 viewBox SVG、512 × 512 透明 PNG；主轮廓与材质细节分组，描边统一 2 px。JSON 清单提供 id / file / viewBox / accessibleLabel；同系列边距统一 16%。'
          : pixel
            ? '交付单件 64 × 64 RGBA PNG 和 8 列图集；每格 64 × 64，格间 2 px 复制边界，JSON rect 不包含边界。统一脚点、光向、比例；nearest 导入；一像素高光不能跨帧闪烁。'
            : '交付单件 512 × 512 RGBA PNG、128 × 128 缩略图与 JSON 清单（id / file / pivot / scale）。透明边距 12%；轮廓外不能烘焙大范围背景或阴影。同一组使用同一 3/4 视角与主光方向。',
        checks: ['缩至 64 px 仍能识别器物结构与用途。', '材质特征来自木 / 漆 / 陶 / 金属等真实差异，不靠任意纹饰填满。', '同一组透视、脚点与光向一致；透明边缘无白色污染。'],
      };
    case 'icon':
      return game ? {
        intent: '制作游戏能力或物品图标；优先建立形状与功能的联系，历史纹样只做辅助。',
        composition: '主要剪影占画面约 70%；同一套使用同一个容器、光向、边框和光学重心。',
        specification: vector
          ? '交付 64 × 64 viewBox SVG 与 64 / 128 px RGBA PNG；内容安全区 6 px。逐项交 JSON（id / semanticLabel / file / states）；选中、禁用和冷却状态由引擎实现，不合并在一张静态图里。'
          : pixel
            ? '交付 32 × 32 与 64 × 64 分别绘制的 RGBA PNG；16 图标图集按 4 列排列，每格保留 2 px 复制边界并提供 rect JSON。禁止把 32 px 双线性放大当作 64 px 成品；透明底，无界面文字。'
            : '交付 64 × 64 与 128 × 128 RGBA PNG；母版 512 × 512。各尺寸分别检验边缘与细节，JSON 提供 id / semanticLabel / file。激活与禁用不仅改变颜色，还用形状或边框反馈。',
        checks: ['在实际 32 / 64 px 大小能区别同组图标。', '所有图标的光学重心、边距和光向一致。', '技能含义需文字或可访问标签补充，不以难懂纹样代替语义。'],
      } : {
        intent: '制作 App 功能图标；先保证搜索、返回、保存等操作可识别，再从传统提炼线条与比例。',
        composition: '以 24 px 功能网格建立同族轮廓；尽量使用熟悉语义，历史符号不冒充通用交互。',
        specification: vector
          ? '交付 24 × 24 viewBox SVG 与 24 / 48 px PNG fallback；描边 2 px、圆端点、圆连接，2 px 安全边距，currentColor 控制颜色。独立 path 无嵌入位图或字体；JSON 提供 id / label / viewBox / strokeWidth / file。点击区域至少 44 × 44 CSS px，图标与点击区域分离。'
          : pixel
            ? '交付 24 × 24 与 48 × 48 分别绘制的 RGBA PNG；以 24 px 逻辑网格组织轮廓，2 px 安全边距，整数像素，无双线性缩放。JSON 提供 id / label / size / file / states；点击区域至少 44 × 44 CSS px，图标与点击区域分离。'
            : '交付 64 × 64 与 128 × 128 RGBA PNG / WebP；另交 24 px 实际显示预览检查可读性。光向、光学重心与边距固定，最多三个材质色块；JSON 提供 id / label / size / file / states。点击区域至少 44 × 44 CSS px；不以插画细节取代功能轮廓。',
        checks: ['24 px 尺度清晰，描边不混用 1 / 2 / 3 px。', '搭配可访问标签；返回、删除等动作使用可辨认语义。', '44 px 点击区域、键盘焦点与禁用状态由组件实现并验证。'],
      };
    case 'interface':
      return game ? {
        intent: '制作游戏 HUD 与菜单视觉规范；状态、交互与提示的层级先于装饰。',
        composition: '中央保留动作区域；生命、资源与目标分区，关键数值使用清晰字形。',
        specification: '交付 1280 × 720 和 1920 × 1080 HUD 预览、9-slice 面板 PNG / SVG、独立按钮状态与 token JSON。标题 / 数值 / 文本不烘焙进贴图；JSON 提供组件 id / sliceMargins / padding / state 色值。兼顾 125% 字体缩放与手柄焦点，HUD 不挡交互目标。',
        checks: ['战斗时能在一秒内找到生命与主要状态。', '1280 × 720、1920 × 1080、125% 字体下无截断或遮挡。', '按钮 normal / hover / focus / pressed / disabled 状态齐全，文字保持可读对比。'],
      } : {
        intent: '制作 App 页面与组件系统；古代美学通过版式、比例、色彩和材质进入功能界面。',
        composition: '以 8 px 间距系统组织标题、内容与主操作；留白服务阅读，不增加无意义的滚动。',
        specification: '交付 390 × 844 移动端与 1440 × 900 桌面端预览、SVG 图标、设计 token JSON 与组件状态清单。组件包含 button / input / card / navigation，normal / hover / focus / error / disabled 状态；颜色进入 CSS 自定义属性，标注 8 px 网格、字号与行高。正文对比至少 4.5:1，大字至少 3:1；点击区域至少 44 × 44 px；纹理层不可拦截指针。',
        checks: ['390 px 与 1440 px 均无横向溢出；真实长文案不会撑破组件。', '正文对比至少 4.5:1，状态不能只以颜色区分。', 'Tab 可操作所有控件，焦点可见；错误说明、标签和按钮名字完整。'],
      };
  }
}

function codeBlock(value: string): string {
  const ticks = value.match(/`+/g)?.reduce((max, part) => Math.max(max, part.length), 0) ?? 0;
  const fence = '`'.repeat(Math.max(3, ticks + 1));
  return `${fence}text\n${value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}\n${fence}`;
}

export function briefMarkdown(
  brief: Omit<GeneratedBrief, 'markdown'> | GeneratedBrief,
  input: BriefInput,
  tradition: ArtTradition,
  references: SourceReference[] = sources,
): string {
  const cited = references.filter((source) => tradition.sourceIds.includes(source.id));
  return [
    `# ${markdownText(brief.title)}`,
    `这是原创制作规范与提示词，不是历史复原，也未调用图像模型。参考路线：${markdownText(tradition.name)}（${markdownText(tradition.era)}）。`,
    `用途：${input.target === 'game' ? '游戏' : 'App'} · ${assetLabels[input.assetKind]} · ${formatOptions.find((item) => item.value === input.format)?.label ?? markdownText(input.format)}`,
    '## 正向提示词', codeBlock(brief.positive),
    '## 约束与避免项', codeBlock(brief.negative),
    '## 交付规格', markdownText(brief.specification),
    '## 验收清单', brief.checklist.map((item) => `- [ ] ${markdownText(item)}`).join('\n'),
    '## 设计变量', `\`\`\`json\n${JSON.stringify(brief.tokens, null, 2)}\n\`\`\``,
    '## 研究依据', cited.length ? cited.map((source) =>
      `- [${markdownText(source.title)}](${source.url}) · ${markdownText(source.institution)} · ${markdownText(source.period)} · ${markdownText(source.medium)}。${markdownText(source.note)}${source.status === 'verified' ? '（已核对来源页）' : '（参考线索，请核对来源页）'}`).join('\n')
      : `参考记录 ID：${tradition.sourceIds.map(markdownText).join('、')}。请在研究页核对来源，不能据此声称作品为历史复原。`,
    '## 修改原则', '保持主体身份、轮廓、镜头、脚点与调色板，只修改明确指定的变量。首次制作先做单件与实际尺寸预览，审核通过后再扩展同系列；历史参考与现代交付规则分开记录。',
  ].join('\n\n');
}

export function generateBrief(
  input: BriefInput,
  tradition: ArtTradition,
  references: SourceReference[] = sources,
): GeneratedBrief {
  const subject = clean(input.subject, input.assetKind === 'interface' ? '日常阅读与收藏界面' : '一处可被记住的生活细节');
  const feeling = clean(input.feeling, '克制、清晰、有生活气息');
  const detail = percent(input.detail);
  const intensity = percent(input.colorIntensity);
  const whitespace = percent(input.whitespace);
  const plan = assetPlan(input);
  const palette = tradition.palette.map((color) => `${color.name} ${color.hex}（${color.role}）`).join('；');
  const cited = references.filter((source) => tradition.sourceIds.includes(source.id));
  const format = formatOptions.find((option) => option.value === input.format)?.label ?? clean(input.format, '绘画与插画');
  const detailRule = detail < 35 ? '细节集中在主轮廓与一个材质特征，删除缩小后消失的纹饰'
    : detail < 70 ? '保持中等细节，主体有结构，次要区域减少纹理与装饰'
      : '高细节只留给焦点与近景，细部服从结构；缩小预览中仍需保留大形';
  const colorRule = intensity < 35 ? '低色彩强度，以明度和少量色相差组织画面'
    : intensity < 70 ? '中等设色，用大色块区分层次，强调色少量重复'
      : '较强设色，让主次色有明确面积差，强色集中于焦点，避免全画面同饱和';
  const emptyRule = whitespace < 25 ? '留白较少；通过明暗与大色块分组，防止纹饰铺满形成噪点'
    : whitespace < 60 ? '留白适中；安静区域围绕视觉焦点，装饰在边缘收束'
      : '较多留白；主体偏侧或成小群组织，空处有呼吸，但不可挤压功能内容';
  const translation = input.target === 'game' ? tradition.gameTranslation : tradition.appTranslation;
  const title = `${tradition.name} · ${assetLabels[input.assetKind]}方案`;
  const positive = [
    `用途：${input.target === 'game' ? '游戏美术' : 'App 美术'}；素材：${assetLabels[input.assetKind]}；表现：${format}。`,
    `原创主体：「${subject}」。情绪：「${feeling}」。`,
    plan.intent,
    `审美研究方向：${tradition.name}，${tradition.era}，媒介依据：${tradition.medium}。${tradition.promptCore}`,
    `构图原则：${tradition.composition} ${plan.composition}`,
    `造型与轮廓：${tradition.silhouette}`,
    `材质与笔触：${tradition.materials}`,
    `固定调色板：${palette}。这些色值是现代设计提案，不是文物颜料检测结果。`,
    `细节 ${detail}/100：${detailRule}。设色 ${intensity}/100：${colorRule}。留白目标 ${whitespace}%：${emptyRule}。`,
    `应用转换：${translation.join('；')}。`,
    `交付：${plan.specification}`,
    '一致性约束：锁定主体身份、镜头方向、头身比例或物件比例、主轮廓、光向与上述色值；仅调整明确指定的局部，新增同系列素材也遵循同一规范。',
    `研究线索：${cited.length ? cited.map((source) => `${source.title}（${source.institution}）`).join('；') : tradition.sourceIds.join('、')}。借鉴组织方法与工艺，不临摹原作人物或复制作品。`,
  ].join('\n\n');
  const negative = [
    ...tradition.pitfalls,
    '不把不同朝代、媒介和地域的符号随意混成一个所谓古风；不宣称历史复原。',
    '不照抄参考原作角色、题字、章印或完整构图；不生成伪古文和不可读文字。',
    input.target === 'app'
      ? '不把装饰纹样当作唯一操作语义；不烘焙界面文字；不以低对比浅色正文、纹理遮挡和过小点击区域牺牲使用。'
      : '不以概念图替代可用资源；不混合不同视角、脚点、光向和角色比例；不要背景污染透明边缘。',
    input.format === 'pixel' ? '不使用双线性缩放、随机像素噪点和非整数像素线；不让图集帧错位。'
      : input.format === 'vector' ? '不将位图伪装成 SVG；不使用不一致线宽、外部字体链接或隐藏脚本。'
        : '不靠全画面泛光、随机做旧和统一高饱和掩盖结构；不混淆插画预览与可直接导入的资源。',
    '修改时不重设全局风格；修一处细节不得连带改变主体身份或整套素材轮廓。',
  ].join('\n');
  const tokens = designTokens(tradition, input);
  const checklist = [
    `逐项对照研究页的「${tradition.principles[0]?.title ?? '构图与材质'}」，能指出至少两处具体转译，而不只解释为配色。`,
    ...plan.checks,
    `核对固定调色板（${tradition.palette.map((color) => color.hex).join(' / ')}）；功能色若另加，需单独说明。`,
    '先验收一件、同系列三件及最终显示尺寸，再批量扩展；记录修订前后与保留项。',
    '来源、授权与媒介信息分别记录；原创研究提案不冒充馆藏图或历史复原。',
  ];
  const brief = { title, positive, negative, specification: plan.specification, checklist, tokens };
  return { ...brief, markdown: briefMarkdown(brief, input, tradition, references) };
}

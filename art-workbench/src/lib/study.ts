import type { AssetKind, ProjectTarget } from '../types';
import type { ResearchDossier } from '../data/dossier-types';

export type StudyModel = 'landscape' | 'object' | 'line';
export interface StudyParameter {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  baseline: number;
  initial: number;
  unit: string;
  consequence: string;
  question: string;
}
export interface StudyModelConfig {
  model: StudyModel;
  title: string;
  parameters: StudyParameter[];
  assetKind: AssetKind;
  subject: string;
  rules: string[];
}
export interface StudyTransfer {
  traditionId: string;
  target: ProjectTarget;
  assetKind: AssetKind;
  subject: string;
  experimentTitle: string;
  parameters: Record<string, number>;
  constraints: string[];
  checklist: string[];
  sourceIds: string[];
}

const landscapeParameters: StudyParameter[] = [
  { id: 'mass', label: '近景山体尺度', min: 20, max: 90, step: 1, baseline: 48, initial: 68, unit: '%', consequence: '改变近景山体的宽度与高度；岸线、远山和观察点固定。', question: '近景变重后，主体、方向和远处目的地是否仍然能找到？' },
  { id: 'opening', label: '开放区宽度', min: 15, max: 85, step: 1, baseline: 46, initial: 46, unit: '%', consequence: '改变中央开放区和近岸的间距；山体尺度与焦点对比固定。', question: '空白是否被岸线和路径限定？它有没有承接方向或正文？' },
  { id: 'focus', label: '主次明度差', min: 10, max: 90, step: 1, baseline: 66, initial: 66, unit: '%', consequence: '改变远层与主地标的明度差，保持几何位置和所有形状不变。', question: '灰阶里能否认出地标？背景是否与下一步行动争夺注意？' },
];
const objectParameters: StudyParameter[] = [
  { id: 'mouth', label: '口部 / 承托面宽度', min: 20, max: 85, step: 1, baseline: 42, initial: 64, unit: '%', consequence: '改变器口宽度；明式家具路线对应承托面的宽度。腹体和支撑保持固定。', question: '器口与容量、承托面与坐姿是否协调？是否只剩一个装饰符号？' },
  { id: 'body', label: '腹体 / 框架宽度', min: 25, max: 90, step: 1, baseline: 64, initial: 64, unit: '%', consequence: '改变腹部外轮廓；家具对应腿架横向展开。高度与口部保持固定。', question: '纯色轮廓里能否辨认用途？承重部分是否形成可靠的连接关系？' },
  { id: 'ornament', label: '纹饰覆盖比例', min: 0, max: 80, step: 1, baseline: 24, initial: 24, unit: '%', consequence: '改变纹饰带宽与重复单元数量，器物轮廓和结构连接不变。', question: '纹样是否随口沿、腹面或构件分区？它有没有掩盖把持、承重与操作区？' },
];
const lineParameters: StudyParameter[] = [
  { id: 'stroke', label: '主线强调强度', min: 10, max: 90, step: 1, baseline: 42, initial: 66, unit: '%', consequence: '用归一化档位改变主轮廓的线宽，辅助线保持固定；百分比不是主辅线的实际线宽比。', question: '缩小后主轮廓是否连续？辅助线是否把动作或骨架淹没？' },
  { id: 'layers', label: '设色层数量', min: 1, max: 5, step: 1, baseline: 3, initial: 3, unit: '层', consequence: '启用不同数量的独立色层；所有形状、笔线与布局保持固定。', question: '每一层颜色承担什么？删掉一层后，主次和语义是否还成立？' },
  { id: 'textzone', label: '图文开放区', min: 15, max: 70, step: 1, baseline: 34, initial: 34, unit: '%', consequence: '调整图像的横向容纳区与右侧文本留区，图像不与文字叠印。', question: '文字区能否独立阅读？裁切、缩放后，主要形体会不会被挤断？' },
];

const routes: Record<string, Omit<StudyModelConfig, 'parameters'>> = {
  'han-lacquer': { model: 'object', title: '内外分区与随形装饰', assetKind: 'prop', subject: '具有明确口沿、内腔与把持方向的原创漆器道具', rules: ['把口沿、内腔、外壁作为独立材质区，不把朱黑平均铺满所有面。', '器物用途与把持部分先成立，再安置原创云气线；不复制题字。', '同套资产锁定外壳、口沿与操作提示的色彩角色。'] },
  'han-relief': { model: 'line', title: '层带叙事与行动轮廓', assetKind: 'icon', subject: '以原创侧向行动和统一刻线组织的任务图标', rules: ['先画清朝向、支撑点与行动工具，缩小后保留动作识别。', '每条层带承担一个场所或一个事件；线刻与浅浮雕要选定主规则。', '石材、画像砖与拓本分开研究，不把墓祠图像直接套作无语境装饰。'] },
  'blue-green-landscape': { model: 'landscape', title: '山势、岸线与生活尺度', assetKind: 'scene', subject: '山势、开放水域与通行地标关系明确的原创山水场景', rules: ['先锁定近山、远山、水域和可通行路径，再决定青绿设色。', '建筑、舟、人物使用同一尺度参照，主地标不靠无限增饱和吸引注意。', '将手卷观看规律转译成逐屏观察，不把连续游观等同一张横向壁纸。'] },
  'southern-song': { model: 'landscape', title: '偏侧重量与有方向的开放区', assetKind: 'scene', subject: '以近岸遮挡和远处目的地形成呼应的原创临水小景', rules: ['一处近景重量、一条引导关系、一处开放区分别承担明确角色。', '留白由岸、枝或视线限定；雾化不能替代结构，也不能隐藏行动目标。', '移动屏幕裁切后重新布置焦点，不机械复制左下角放树的模板。'] },
  'song-bird-flower': { model: 'line', title: '枝干支撑、体势与设色层', assetKind: 'icon', subject: '枝干支撑与鸟体重心清楚的原创物候图标', rules: ['先观察枝干转折、叶序、鸟的支撑足与重心；不靠细羽毛补错误形体。', '勾线、色层与背景各有主次；宋代花鸟不是统一的淡灰水墨。', '功能图标选用原创物象，缩小后保留主轮廓与语义。'] },
  'song-ceramics': { model: 'object', title: '器形、支撑与釉面分区', assetKind: 'prop', subject: '口腹足结构连续、釉面与胎体区分明确的原创容器', rules: ['口、腹、足以用途为依据连接，先验证纯色轮廓与稳定支撑。', '釉面、胎体、口缘分别制定材质规则，开片不可当作所有宋瓷的统一特征。', '不得用一组现代青灰色值来鉴定窑口或复原真实釉色。'] },
  dunhuang: { model: 'line', title: '壁面分区与人物主次', assetKind: 'interface', subject: '采用明确分区和原创叙事的展览信息界面', rules: ['先记录洞窟、壁面、年代与题材，不能把北魏与唐代视为一套统一模板。', '中心信息、侧区与边饰各自分层，关键操作不藏入繁复装饰。', '宗教形象、铭文与功德语境单独核对；优先创作属于新项目的题材。'] },
  garden: { model: 'landscape', title: '门洞、路径与借景显露', assetKind: 'scene', subject: '有实际转折路径和框景显露次序的原创园林空间', rules: ['先确认可通行路径、遮挡与下一处可见目标；门洞不是孤立的图案。', '框景服务观看位置，变换入口与视点后重新测试，不能只加假山池塘。', '游戏碰撞、导航与 App 操作区域采用明确现代规则。'] },
  woodblock: { model: 'line', title: '主版、色版与图文留区', assetKind: 'interface', subject: '主线版清楚、色层各有任务的原创信息卡片', rules: ['主轮廓、色版与字区分别制作，字不能与高频纹样叠印。', '色层数量由信息和成本决定；错版、拱花与饾版不能混成一项通用效果。', '同套卡片锁定两级线宽、图文安全区与色版职责。'] },
  'ming-furniture': { model: 'object', title: '承托、腿架与构件关系', assetKind: 'prop', subject: '承托面、腿架与横枨关系清楚的原创木作座具', rules: ['先建立座面、腿架、横枨的连接和承重关系，再添加木纹。', '构件的宽窄服从连接与受力；现代示意不等于可制造的榫卯施工图。', '明式是研究类型，不凭简洁外观将每件家具断代为明代。'] },
  calligraphy: { model: 'line', title: '主笔、转折与行间空间', assetKind: 'interface', subject: '以原创笔线节奏和清楚正文区组织的阅读界面', rules: ['研究墨迹、碑刻、拓本的不同观看条件，不能用飞白覆盖所有文本。', '书写节奏用于图形与标题层，正文、表单与导航保留可读的现代字形。', '原创笔线只示意起止、连断与粗细，不冒充古代书家真迹。'] },
  'blue-white': { model: 'object', title: '器形与纹饰分带', assetKind: 'prop', subject: '口腹足分区与蓝色装饰层级明确的原创青花器物', rules: ['先区分器类、用途与尺寸，再比较元明装饰与器形。', '纹饰按口、肩、腹、足分带，覆盖比例不能破坏轮廓和把持区。', '蓝色深浅不是可靠断代工具；釉下色层与釉面反光分开制作。'] },
};

export function getStudyConfig(traditionId: string): StudyModelConfig {
  const route = routes[traditionId] ?? routes['blue-green-landscape'];
  const source = route.model === 'landscape' ? landscapeParameters : route.model === 'object' ? objectParameters : lineParameters;
  const parameters = source.map(parameter => ({ ...parameter }));
  if (traditionId === 'garden') {
    parameters[0].label = '框景遮挡尺度';
    parameters[0].consequence = '改变近侧院墙和门洞框的厚度，路径、远处借景和观察点固定。';
    parameters[1].label = '门洞开放宽度';
  }
  if (traditionId === 'ming-furniture') {
    parameters[0].label = '座面宽度';
    parameters[1].label = '腿架展开宽度';
    parameters[2].label = '构件饰带比例';
  }
  return { ...route, rules: [...route.rules], parameters };
}

export function initialStudyParameters(config: StudyModelConfig): Record<string, number> {
  return Object.fromEntries(config.parameters.map(parameter => [parameter.id, parameter.initial]));
}

export function studyNoteMarkdown(dossier: ResearchDossier, transfer: StudyTransfer, note: string, checked: string[]): string {
  const section = (title: string, rows: string[]) => `\n## ${title}\n\n${rows.map(row => `- ${row}`).join('\n')}\n`;
  const samples = dossier.samples.map(sample => `${sample.role === 'primary' ? '主例' : '对照'}：${sample.title}；${sample.period}；${sample.medium}；来源 ID：${sample.sourceId}。观察：${sample.focus}`);
  const facts = dossier.evidence.historicalFacts.map(item => `${item.claim}（来源：${item.sourceIds.join('、')}；${item.status === 'verified' ? '已核对馆方记录，仅限声明范围' : '待核验线索'}）`);
  const interpretation = dossier.evidence.interpretations.map(item => `${item.claim}（解释，依据：${item.sourceIds.join('、')}）`);
  const translations = dossier.evidence.translations.map(item => `${item.claim}（现代制作假设，依据：${item.sourceIds.join('、')}）`);
  return `# 观物研究笔记 · ${dossier.title}\n\n问题：${dossier.question}\n\n制作对象：${transfer.target === 'game' ? '游戏' : 'App'} / ${transfer.assetKind} / ${transfer.subject}\n\n当前实验：${transfer.experimentTitle}\n\n这些参数是原创示意的现代试验值，不是古代比例标准、实物测量或自动审美评分。百分比为本练习旋钮的相对档位，不是画面面积、实物宽度或线宽比的测量。\n`
    + section('对象与对照', samples)
    + section('历史记录与待核验线索', facts)
    + section('结构解释', interpretation)
    + section('现代转译假设', translations)
    + section('实验参数', Object.entries(transfer.parameters).map(([key, value]) => `${key}: ${value}`))
    + section('制作约束', transfer.constraints)
    + section('人工审校', transfer.checklist.map(item => `[${checked.includes(item) ? 'x' : ' '}] ${item}`))
    + `\n## 我的观察\n\n${note.trim() || '尚未记录。'}\n`
    + section('研究边界', dossier.limits)
    + section('来源 IDs', transfer.sourceIds);
}

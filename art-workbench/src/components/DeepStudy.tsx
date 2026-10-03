import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ArrowRight, BookOpen, CheckCheck, Download, FlaskConical, Layers3, RotateCcw, ScrollText, SlidersHorizontal } from 'lucide-react';
import { dossiers } from '../data/dossiers';
import type { ResearchDossier, StudyStatement } from '../data/dossier-types';
import { sources, traditions } from '../data/traditions';
import { downloadText } from '../lib/projects';
import { getStudyConfig, initialStudyParameters, studyNoteMarkdown } from '../lib/study';
import type { StudyModelConfig, StudyTransfer } from '../lib/study';
import type { ArtTradition, ProjectTarget } from '../types';
import './deep-study.css';

interface DeepStudyProps {
  traditionId: string;
  onSelectTradition: (id: string) => void;
  onUseStudy: (payload: StudyTransfer) => void;
}
type StudyTab = 'evidence' | 'experiment' | 'review';
const studyTabs: { id: StudyTab; name: string; icon: typeof BookOpen }[] = [
  { id: 'evidence', name: '对象与证据', icon: BookOpen },
  { id: 'experiment', name: '结构实验', icon: FlaskConical },
  { id: 'review', name: '制作审校', icon: CheckCheck },
];

function mixHex(first: string, second: string, amount: number): string {
  const a = first.replace('#', '');
  const b = second.replace('#', '');
  const weight = Math.max(0, Math.min(1, amount));
  return '#' + [0, 2, 4].map(index => Math.round(parseInt(a.slice(index, index + 2), 16) * (1 - weight) + parseInt(b.slice(index, index + 2), 16) * weight).toString(16).padStart(2, '0')).join('');
}

function grayHex(hex: string): string {
  const code = hex.replace('#', '');
  const value = Math.round(parseInt(code.slice(0, 2), 16) * .2126 + parseInt(code.slice(2, 4), 16) * .7152 + parseInt(code.slice(4, 6), 16) * .0722);
  return `#${value.toString(16).padStart(2, '0').repeat(3)}`;
}

function StructurePreview({ tradition, config, values, gray, structure, variant, activeParameter }: {
  tradition: ArtTradition;
  config: StudyModelConfig;
  values: Record<string, number>;
  gray: boolean;
  structure: boolean;
  variant: 'a' | 'b';
  activeParameter: string;
}) {
  const id = useId().replace(/:/g, '');
  const colors = tradition.palette.map(color => gray ? grayHex(color.hex) : color.hex);
  const background = gray ? '#f3f3f0' : '#f7f2e5';
  const ink = gray ? '#414141' : '#33493d';
  const guide = gray ? '#6c6c6c' : '#ad5d42';
  const far = mixHex(colors[0], background, .35 + (values.focus ?? 50) / 180);
  const focal = mixHex(colors[0], background, .8 - (values.focus ?? 50) / 115);
  const mouth = 48 + (values.mouth ?? 42) * 1.7;
  const belly = 56 + (values.body ?? 64) * 1.9;
  const foot = 58 + (values.body ?? 64) * .28;
  const vessel = `M ${300 - mouth / 2} 78 Q ${300 - mouth / 2 - 5} 110 ${300 - belly / 2} 160 C ${300 - belly / 2 - 18} 235 ${300 - belly / 2 + 8} 266 ${300 - foot / 2} 282 L ${300 + foot / 2} 282 C ${300 + belly / 2 - 8} 266 ${300 + belly / 2 + 18} 235 ${300 + belly / 2} 160 Q ${300 + mouth / 2 + 5} 110 ${300 + mouth / 2} 78 Z`;
  const ornament = values.ornament ?? 24;
  const frameWidth = 500 * (1 - (values.textzone ?? 34) / 100);
  const mainStroke = 1.3 + (values.stroke ?? 42) / 17;
  const layers = values.layers ?? 3;
  const layerColor = (index: number) => index < layers ? colors[index % colors.length] : background;
  const mass = values.mass ?? 48;
  const opening = values.opening ?? 46;
  const nearWidth = 125 + mass * 1.45;
  const nearHeight = 35 + mass * 1.7;
  const rightStart = 285 + opening * 1.85;
  const nearPath = `M -10 334 L -10 ${321 - nearHeight * .42} L ${nearWidth * .29} ${319 - nearHeight} L ${nearWidth * .59} ${326 - nearHeight * .53} L ${nearWidth * .75} ${322 - nearHeight * .76} L ${nearWidth} 322 Z`;
  const isFurniture = tradition.id === 'ming-furniture';
  const isGarden = tradition.id === 'garden';
  return <svg viewBox="0 0 600 350" role="img" aria-label={`${variant.toUpperCase()}：${config.title}原创结构示意${gray ? '，灰阶' : ''}${structure ? '，显示结构线' : ''}`} data-testid={`study-preview-${variant}`} data-parameter={activeParameter} data-values={JSON.stringify(values)} className="deep-preview-svg">
    <title>{config.title} · 原创现代结构实验，不是古画复原</title>
    <rect width="600" height="350" fill={background} />
    {config.model === 'landscape' && <>
      <path d="M 0 230 L 65 169 L 115 194 L 166 116 L 214 170 L 255 146 L 308 198 L 350 183 L 396 142 L 449 197 L 490 174 L 552 215 L 600 208 L 600 289 L 0 289 Z" fill={far} />
      <path d="M 0 281 Q 140 251 260 277 T 600 259 L 600 350 L 0 350 Z" fill={mixHex(colors[1], background, .75)} />
      <path d={`M ${rightStart} 318 Q ${rightStart + 30} 291 600 254 L 600 350 L ${rightStart - 30} 350 Z`} fill={mixHex(colors[1], background, .12)} />
      {!isGarden && <path d={nearPath} fill={colors[0]} />}
      <path d={`M ${nearWidth * .63} 331 Q ${250 + opening / 2} 322 330 291 Q 367 275 ${rightStart + 35} 291`} fill="none" stroke={colors[2]} strokeWidth="8" strokeLinecap="round" />
      <path d="M 351 235 L 389 211 L 427 235 Z" fill={focal} />
      <rect x="361" y="235" width="58" height="29" fill={mixHex(focal, background, .25)} />
      <rect x="381" y="242" width="14" height="22" fill={focal} />
      <path d="M 302 295 Q 316 302 331 295" fill="none" stroke={focal} strokeWidth="4" />
      {isGarden && <>
        <path d={`M 0 350 L 0 32 L ${76 + mass * 1.3} 32 L ${76 + mass * 1.3} 350 Z`} fill={colors[0]} />
        <path d={`M ${455 + opening * .6} 350 L ${455 + opening * .6} 32 L 600 32 L 600 350 Z`} fill={colors[0]} />
        <path d={`M ${70 + mass} 35 Q ${275 + opening * .3} ${28 + mass * .9} ${468 + opening * .4} 35`} fill="none" stroke={colors[0]} strokeWidth={30 + mass * .7} />
        <path d={`M ${102 + mass} 35 L ${102 + mass} 350 M ${455 + opening * .6} 35 L ${455 + opening * .6} 350`} fill="none" stroke={colors[3]} strokeWidth="3" />
      </>}
      {structure && <g data-testid={`study-guides-${variant}`} fill="none" stroke={guide} strokeWidth="1.5" strokeDasharray="6 6">
        <path d={`M 0 318 L 600 318 M ${nearWidth} 70 L ${nearWidth} 350 M ${rightStart} 70 L ${rightStart} 350`} />
        <rect x="344" y="204" width="90" height="70" />
        <path d="M 38 328 Q 243 318 386 250" />
      </g>}
    </>}
    {config.model === 'object' && !isFurniture && <>
      <defs><clipPath id={`deep-vessel-${id}`}><path d={vessel} /></clipPath></defs>
      <ellipse cx="300" cy="293" rx={belly * .53} ry="10" fill={mixHex(colors[0], background, .9)} />
      <path d={vessel} fill={tradition.id === 'blue-white' ? mixHex(background, '#ffffff', .5) : mixHex(colors[0], background, .22)} stroke={colors[0]} strokeWidth="3" />
      {ornament > 0 && <g clipPath={`url(#deep-vessel-${id})`}>
        <rect x={300 - belly} y={178 - ornament * .62} width={belly * 2} height={ornament * 1.32} fill={mixHex(colors[1], background, .2)} />
        {Array.from({ length: Math.max(1, Math.ceil(ornament / 10)) }, (_, index) => <path key={index} d={`M ${300 - belly / 2 + 10 + index * belly / Math.max(1, Math.ceil(ornament / 10))} ${178 + ornament * .2} q 16 -22 28 -3 q -4 17 -16 9`} fill="none" stroke={colors[0]} strokeWidth="2" />)}
      </g>}
      <ellipse cx="300" cy="78" rx={mouth / 2} ry="11" fill={tradition.id === 'han-lacquer' ? colors[1] : mixHex(colors[0], background, .68)} stroke={colors[0]} strokeWidth="3" />
      <path d={`M ${300 - foot / 2} 282 L ${300 - foot / 2 - 2} 292 L ${300 + foot / 2 + 2} 292 L ${300 + foot / 2} 282`} fill={colors[0]} />
      {structure && <g data-testid={`study-guides-${variant}`} fill="none" stroke={guide} strokeWidth="1.5" strokeDasharray="6 5"><path d={`M 300 38 L 300 313 M ${300 - mouth / 2} 78 L ${300 + mouth / 2} 78 M ${300 - belly / 2} 180 L ${300 + belly / 2} 180 M ${300 - foot / 2} 292 L ${300 + foot / 2} 292`} /><circle cx="300" cy="180" r="4" /></g>}
    </>}
    {config.model === 'object' && isFurniture && <>
      <ellipse cx="300" cy="311" rx={belly * .53} ry="10" fill={mixHex(colors[0], background, .9)} />
      <path d={`M ${300 - mouth / 2} 157 L ${300 - mouth / 2} 66 Q 300 29 ${300 + mouth / 2} 66 L ${300 + mouth / 2} 157`} fill="none" stroke={colors[0]} strokeWidth="12" />
      <path d="M 300 47 Q 283 96 300 153" fill="none" stroke={colors[0]} strokeWidth="15" />
      <rect x={300 - mouth / 2 - 9} y="153" width={mouth + 18} height="19" rx="2" fill={colors[0]} />
      <path d={`M ${300 - mouth / 2 + 10} 171 L ${300 - belly / 2} 305 M ${300 + mouth / 2 - 10} 171 L ${300 + belly / 2} 305`} fill="none" stroke={colors[0]} strokeWidth="12" />
      <path d={`M ${300 - belly / 2 + 12} 263 L ${300 + belly / 2 - 12} 263`} fill="none" stroke={colors[0]} strokeWidth="8" />
      {ornament > 0 && <rect x={300 - mouth / 2 + 12} y="177" width={Math.max(18, mouth - 24)} height={ornament / 2.8} fill={colors[2]} />}
      {structure && <g data-testid={`study-guides-${variant}`} fill="none" stroke={guide} strokeWidth="1.5" strokeDasharray="6 5"><path d={`M 300 25 L 300 326 M ${300 - mouth / 2} 151 L ${300 + mouth / 2} 151 M ${300 - belly / 2} 310 L ${300 + belly / 2} 310`} /><circle cx={300 - mouth / 2 + 10} cy="171" r="10" /><circle cx={300 + mouth / 2 - 10} cy="171" r="10" /></g>}
    </>}
    {config.model === 'line' && <>
      <rect x="30" y="30" width={frameWidth} height="288" fill="none" stroke={mixHex(ink, background, .7)} strokeWidth="1" />
      <g transform={`translate(36 40) scale(${Math.max(.25, frameWidth / 390)} 1)`}>
        {tradition.id === 'han-relief' ? <>
          <path d="M 0 92 L 370 92 M 0 205 L 370 205" stroke={ink} strokeWidth={mainStroke} fill="none" />
          {[0, 1, 2].map(index => <g key={index} transform={`translate(${index * 114 + 28} 15)`}><circle cx="26" cy="20" r="15" fill={layerColor(index)} stroke={ink} strokeWidth={mainStroke} /><path d="M 24 37 L 10 79 L 51 79 L 33 42 M 12 51 L 2 33 M 41 53 L 63 42" fill={layerColor(index)} stroke={ink} strokeWidth={mainStroke} strokeLinejoin="round" /></g>)}
          <path d="M 35 148 L 140 148 L 128 177 L 57 177 Z M 68 137 L 114 137" fill={layerColor(2)} stroke={ink} strokeWidth={mainStroke} /><circle cx="63" cy="186" r="14" fill="none" stroke={ink} strokeWidth={mainStroke} /><circle cx="125" cy="186" r="14" fill="none" stroke={ink} strokeWidth={mainStroke} />
          <path d="M 192 170 L 208 137 L 239 143 L 249 176 M 208 139 L 194 118 M 239 144 L 255 125" fill="none" stroke={ink} strokeWidth={mainStroke} />
        </> : tradition.id === 'calligraphy' ? <>
          <path d="M 32 64 Q 117 38 225 53 M 82 23 Q 85 111 59 151 M 88 80 Q 128 120 157 145 M 238 30 Q 218 107 247 181 M 168 185 Q 92 224 52 255 M 166 185 Q 231 206 315 248" fill="none" stroke={layerColor(0)} strokeWidth={mainStroke * 2.4} strokeLinecap="round" />
          <path d="M 194 112 Q 238 103 300 123 M 109 215 L 187 257" fill="none" stroke={layerColor(1)} strokeWidth="2" />
          <path d="M 280 235 L 307 235 L 307 263 L 280 263 Z" fill={layerColor(2)} />
        </> : tradition.id === 'dunhuang' ? <>
          <rect x="12" y="6" width="346" height="270" fill={layerColor(0)} stroke={ink} strokeWidth={mainStroke} />
          <path d="M 12 54 L 358 54 M 12 224 L 358 224 M 75 54 L 75 224 M 297 54 L 297 224" fill="none" stroke={ink} strokeWidth="1.6" />
          <circle cx="186" cy="141" r="63" fill={layerColor(1)} stroke={ink} strokeWidth={mainStroke} />
          <path d="M 153 162 L 185 113 L 219 162 Z" fill={layerColor(2)} stroke={ink} strokeWidth={mainStroke} />
          {[27, 102, 177, 252, 327].map((x, index) => <path key={x} d={`M ${x} 22 l 15 -8 l 14 8 l -14 9 Z M ${x} 249 l 15 -8 l 14 8 l -14 9 Z`} fill={layerColor(index % 5)} stroke={ink} strokeWidth="1" />)}
        </> : <>
          <path d="M 28 252 Q 151 185 211 103 Q 248 56 340 29 M 146 193 Q 123 122 79 98 M 217 96 Q 214 47 183 20" fill="none" stroke={ink} strokeWidth={mainStroke} strokeLinecap="round" />
          {[{ x: 100, y: 139, r: -22 }, { x: 161, y: 166, r: 42 }, { x: 243, y: 79, r: -15 }, { x: 279, y: 55, r: 43 }].map((leaf, index) => <path key={index} d={`M ${leaf.x} ${leaf.y} q 12 -39 45 -43 q 7 38 -45 43 Z`} fill={layerColor(index)} stroke={ink} strokeWidth="1.5" transform={`rotate(${leaf.r} ${leaf.x} ${leaf.y})`} />)}
          <path d="M 134 104 C 134 63 198 66 214 100 Q 189 133 160 128 Z" fill={layerColor(1)} stroke={ink} strokeWidth={mainStroke} />
          <path d="M 139 94 L 118 99 L 140 104 M 181 122 L 174 145 M 194 119 L 188 141" fill="none" stroke={ink} strokeWidth={mainStroke} /><circle cx="149" cy="91" r="3.3" fill={ink} />
          {tradition.id === 'woodblock' && <path d="M 36 271 L 330 271" stroke={layerColor(4)} strokeWidth="8" />}
        </>}
      </g>
      <g fill={ink}><text x={frameWidth + 51} y="81" fontSize="15">观察册</text><rect x={frameWidth + 51} y="104" width={Math.max(12, 507 - frameWidth)} height="3" /><rect x={frameWidth + 51} y="118" width={Math.max(10, 457 - frameWidth)} height="3" /><rect x={frameWidth + 51} y="159" width={Math.max(12, 507 - frameWidth)} height="2" /><rect x={frameWidth + 51} y="173" width={Math.max(10, 477 - frameWidth)} height="2" /><rect x={frameWidth + 51} y="187" width={Math.max(10, 497 - frameWidth)} height="2" /></g>
      <path d={`M ${frameWidth + 51} 255 L ${Math.min(553, frameWidth + 132)} 255 L ${Math.min(553, frameWidth + 132)} 282 L ${frameWidth + 51} 282 Z`} fill={colors[0]} />
      {structure && <g data-testid={`study-guides-${variant}`} fill="none" stroke={guide} strokeWidth="1.5" strokeDasharray="6 5"><path d={`M ${frameWidth + 39} 15 L ${frameWidth + 39} 334 M 20 40 L 580 40 M 20 300 L 580 300`} /><rect x="42" y="62" width={Math.max(35, frameWidth - 25)} height="232" /></g>}
    </>}
    <text x="16" y="339" fill={mixHex(ink, background, .25)} fontSize="10" letterSpacing="1.5">ORIGINAL STRUCTURE STUDY / {variant.toUpperCase()}</text>
  </svg>;
}

function EvidenceColumn({ title, description, items, className }: { title: string; description: string; items: StudyStatement[]; className: string }) {
  return <section className={`deep-evidence-column ${className}`}><h3>{title}</h3><p>{description}</p><ol>{items.map((item, index) => <li key={index}><span>{item.claim}</span><small>依据：{item.sourceIds.join(' · ')}{className === 'historical' ? (item.status === 'verified' ? ' · 已核对馆方记录' : ' · 待核验线索') : className === 'interpretive' ? ' · 研究解释' : ' · 现代制作假设'}</small></li>)}</ol></section>;
}

function sourceIdsFor(dossier: ResearchDossier): string[] {
  return [...new Set([...dossier.samples.map(sample => sample.sourceId), ...Object.values(dossier.evidence).flatMap(items => items.flatMap(item => item.sourceIds))])];
}

export default function DeepStudy({ traditionId, onSelectTradition, onUseStudy }: DeepStudyProps) {
  const tradition = traditions.find(item => item.id === traditionId) ?? traditions[0];
  const dossier = dossiers.find(item => item.traditionId === tradition.id) ?? dossiers[0];
  const config = useMemo(() => getStudyConfig(tradition.id), [tradition.id]);
  const [tab, setTab] = useState<StudyTab>('evidence');
  const [parameters, setParameters] = useState<Record<string, number>>(() => initialStudyParameters(config));
  const [activeParameter, setActiveParameter] = useState(config.parameters[0].id);
  const [gray, setGray] = useState(false);
  const [structure, setStructure] = useState(false);
  const [adopted, setAdopted] = useState<'a' | 'b'>('b');
  const [target, setTarget] = useState<ProjectTarget>('game');
  const [subject, setSubject] = useState(config.subject);
  const [note, setNote] = useState('');
  const [checked, setChecked] = useState<string[]>([]);
  const [notice, setNotice] = useState('');
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const panelId = useId();

  useEffect(() => {
    setParameters(initialStudyParameters(config));
    setActiveParameter(config.parameters[0].id);
    setSubject(config.subject);
    setAdopted('b');
    setChecked([]);
    setNote('');
    setNotice('');
  }, [config]);

  if (!dossier) return <section className="deep-study"><h2>研究档案尚未加载</h2><p>请返回研究馆选择一条路线。</p></section>;

  const active = config.parameters.find(parameter => parameter.id === activeParameter) ?? config.parameters[0];
  const bValues = Object.fromEntries(config.parameters.map(parameter => [parameter.id, parameters[parameter.id] ?? parameter.initial]));
  const aValues = { ...bValues, [active.id]: active.baseline };
  const adoptedValues = adopted === 'a' ? aValues : bValues;
  const sourceIds = sourceIdsFor(dossier);
  const references = sources.filter(source => sourceIds.includes(source.id));
  const experimentTitle = `${active.label}单变量对照 · 采用 ${adopted.toUpperCase()}${adopted === 'a' ? '研究起点' : '当前方案'}（${adoptedValues[active.id]}${active.unit}）`;
  const checklist = [...new Set([...dossier.reviewChecks, active.question])];
  const constraints = [
    `试验范围：${config.title}。以下数值仅用于本项目的原创结构示意，不是古代比例标准、实物测量或最终交付图尺寸。`,
    '参数解释：百分比为本练习旋钮的相对档位，不是画面面积、实物宽度或主辅线宽比的测量；设色层数量表示启用的示意色层。',
    `单变量：${active.label}；A=${active.baseline}${active.unit}，B=${bValues[active.id]}${active.unit}；其余结构参数与观看开关相同。${experimentTitle}。`,
    ...config.parameters.map(parameter => `采用的现代实验参数：${parameter.label}=${adoptedValues[parameter.id]}${parameter.unit}。${parameter.consequence}`),
    ...config.rules,
    ...dossier.productionLocks.map(lock => `${lock.parameter}：${lock.rule}（${lock.rationale}）`),
    `人工审校：${checked.filter(item => checklist.includes(item)).length}/${checklist.length} 项已人工勾选；勾选表示用户核对记录，不是系统评定或出处核验。`,
    ...(note.trim() ? [`研究观察：${note.trim()}`] : []),
  ];
  const transfer: StudyTransfer = {
    traditionId: tradition.id, target, assetKind: target === 'app' && config.assetKind === 'scene' ? 'interface' : config.assetKind,
    subject: subject.trim() || config.subject, experimentTitle,
    parameters: { ...adoptedValues, [`baseline.${active.id}`]: active.baseline, grayscale: gray ? 1 : 0, structure: structure ? 1 : 0, adoptedPreview: adopted === 'a' ? 0 : 1 },
    constraints, checklist, sourceIds,
  };
  const checks = config.model === 'landscape' ? [
    { title: '尺度与视点', prompt: bValues.mass > 75 ? '当前近景较重：请缩小预览，核对地标与可通行方向是否还看得见。' : '用角色、舟或门宽作为一致尺度参照，不能仅凭山峰大小判断空间是否成立。' },
    { title: '开放与目标', prompt: bValues.opening > 70 ? '当前开放区较宽：明确它承接的是水域、行走、文字还是停顿，避免丢失下一步。' : '沿岸线和路径观察开放区的方向；空白面积本身不会证明阅读或关卡体验良好。' },
    { title: '灰阶与焦点', prompt: bValues.focus < 35 ? '当前主次差较弱：请打开灰阶，人工检查地标是否与远层混合。' : '打开灰阶后再看主地标；颜色可承担层次，但不能成为唯一导航提示。' },
  ] : config.model === 'object' ? [
    { title: '用途与比例', prompt: bValues.mouth > bValues.body ? '当前口部或座面较宽：请核对容量、把持或承托关系，确认这种展开有用途依据。' : '先用纯色轮廓辨认器类与用途，再核对口部、腹体、支撑部分的连接。' },
    { title: '装饰与结构', prompt: bValues.ornament > 60 ? '当前饰带覆盖较多：请核对把持、受力与关键结构是否被掩盖。' : '沿真实构件与曲面分配饰带，未装饰的区域也需要明确材质角色。' },
    { title: '材质与出处', prompt: '示意没有模拟胎体、釉层或榫卯力学。真实制作前，分别核验结构、表面材料与历史语境。' },
  ] : [
    { title: '轮廓与辅助线', prompt: bValues.stroke > 70 ? '当前主线较厚：在最终使用尺寸核对细小间隙、转折和支撑点是否仍分得开。' : '比较主线和辅助线的职责：外轮廓与主要动作不应依赖细碎纹理。' },
    { title: '色层与信息', prompt: bValues.layers > 4 ? '当前启用了五个色层：逐层关闭检查职责，避免多色只是重复增强装饰。' : '逐层检查哪一层表达体积、分区或强调；少色并不自动等于高级或古代风格。' },
    { title: '图文与裁切', prompt: bValues.textzone < 25 ? '当前文字留区较小：需要在真实正文长度、字号与手机裁切条件下验证。' : '示意里的文本只是位置参照；在真实内容和操作目标下检验字区与图像边界。' },
  ];

  function exportNote(kind: 'md' | 'json') {
    const metadata = { version: 1, kind: 'guanwu-study-note', dossierId: dossier.id, transfer, note, checked, sourceReferences: references, parameterDefinitions: config.parameters, boundary: '原创现代结构实验；来源按具体条目记录核对范围，其他线索与制作假设仍需检验；不构成实物测量或自动美术评分。' };
    const referenceMarkdown = `\n## 可追溯来源入口\n\n${references.map(source => `- ${source.title} · ${source.institution} · ${source.period} · ${source.medium}\n  ${source.url}\n  状态：${source.status === 'verified' ? `已核验${source.checkedAt ? `，核对日期：${source.checkedAt}` : ''}` : '资料线索，待核验'}；核对范围 / 研究说明：${source.note}`).join('\n')}\n`;
    downloadText(`guanwu-study-${tradition.id}.${kind}`, kind === 'json' ? JSON.stringify(metadata, null, 2) : studyNoteMarkdown(dossier, transfer, note, checked) + referenceMarkdown, kind === 'json' ? 'application/json;charset=utf-8' : 'text/markdown;charset=utf-8');
    setNotice(`${kind === 'json' ? 'JSON' : 'Markdown'} 研究笔记已下载，包含当前采用方案、参数与出处。`);
  }

  function changeTab(next: StudyTab) { setTab(next); setNotice(''); }

  return <section className="deep-study" data-testid="study-root">
    <div className="deep-intro"><div><p className="eyebrow">OBSERVE / COMPARE / TRANSLATE</p><h2>从一个具体问题，研究到一套制作规则</h2><p>比较作品与媒介，区分史料线索、解释和现代假设。用单变量实验观察结构，再把你的判断送到制作台。</p></div><span className="deep-research-seal">有据可问<br />有形可试</span></div>
    <div className="deep-context"><label>研究路线<select aria-label="深研路线" data-testid="study-tradition" value={tradition.id} onChange={event => onSelectTradition(event.target.value)}>{traditions.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="deep-subject-label">制作对象<input data-testid="study-subject" aria-label="研究制作对象" value={subject} maxLength={250} onChange={event => setSubject(event.target.value)} /></label><div className="deep-target"><span>转译用途</span><div>{(['game', 'app'] as const).map(value => <button key={value} data-testid={`study-target-${value}`} aria-pressed={target === value} className={target === value ? 'selected' : ''} onClick={() => setTarget(value)}>{value === 'game' ? '游戏' : 'App'}</button>)}</div></div></div>
    <div className="deep-dossier-heading"><div><span className="eyebrow">RESEARCH DOSSIER / {String(dossiers.indexOf(dossier) + 1).padStart(2, '0')}</span><h3 data-testid="study-dossier-title">{dossier.title}</h3><p>{dossier.question}</p></div><span className="deep-citation-state">证据与解释分列 · 参数为现代假设</span></div>
    <div className="deep-tabs" role="tablist" aria-label="深研步骤">{studyTabs.map((item, index) => <button key={item.id} ref={element => { tabRefs.current[index] = element; }} role="tab" id={`${panelId}-${item.id}-tab`} aria-controls={`${panelId}-${item.id}-panel`} aria-selected={tab === item.id} tabIndex={tab === item.id ? 0 : -1} data-testid={`study-tab-${item.id}`} onClick={() => changeTab(item.id)} onKeyDown={event => {
      let next = index;
      if (event.key === 'ArrowRight') next = (index + 1) % studyTabs.length;
      else if (event.key === 'ArrowLeft') next = (index - 1 + studyTabs.length) % studyTabs.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = studyTabs.length - 1;
      else return;
      event.preventDefault(); changeTab(studyTabs[next].id); tabRefs.current[next]?.focus();
    }}><item.icon size={17} /><span><small>{String(index + 1).padStart(2, '0')}</small>{item.name}</span></button>)}</div>

    {tab === 'evidence' && <div role="tabpanel" id={`${panelId}-evidence-panel`} aria-labelledby={`${panelId}-evidence-tab`} className="deep-panel" data-testid="study-evidence">
      <div className="deep-sample-grid">{dossier.samples.map((sample, index) => <article className="deep-sample" key={`${sample.sourceId}-${index}`}><span className="deep-card-label">{sample.role === 'primary' ? '主例 · 先看这一件' : '对照 · 换一件验证'}</span><h4>{sample.title}</h4><p className="deep-sample-meta">{sample.period}<br />{sample.medium}</p><p>{sample.focus}</p><a href={sources.find(source => source.id === sample.sourceId)?.url ?? '#'} target="_blank" rel="noreferrer" className="text-button">前往机构资料入口 <ArrowRight size={14} /></a></article>)}</div>
      <div className="deep-reading-note"><Layers3 size={18} /><p>这里提供研究对象和观察路径。未核验的线索不当作已确认事实；下方结构示意是原创试验，不代替原作或实物图像。</p></div>
      <div className="deep-evidence-grid"><EvidenceColumn title="历史线索" description="原作、媒介与时代的可追溯说法，仍需逐项核对。" items={dossier.evidence.historicalFacts} className="historical" /><EvidenceColumn title="研究解释" description="把观看关系说清楚，可与其他作品交叉比较。" items={dossier.evidence.interpretations} className="interpretive" /><EvidenceColumn title="现代转译" description="为你的游戏或 App 提出的制作假设，需要实际验证。" items={dossier.evidence.translations} className="translational" /></div>
      <div className="deep-subheading"><span>观察原作时，看哪里？</span><small>对象 → 关系 → 复核方法</small></div><div className="deep-observations">{dossier.observations.map((observation, index) => <article key={index}><span>{String(index + 1).padStart(2, '0')}</span><div><h4>{observation.location}</h4><p>{observation.observation}</p><p className="deep-observation-meaning">为什么看：{observation.significance}</p><small>如何复核：{observation.verify}</small></div></article>)}</div>
      <div className="deep-subheading"><span>出处与研究边界</span><small>入口链接不是实物图授权</small></div><div className="deep-source-list">{references.map(source => <article key={source.id}><div><h4>{source.title}</h4><p>{source.institution} · {source.period} · {source.medium}{source.status === 'verified' && source.checkedAt ? ` · 核对日期 ${source.checkedAt}` : ''}</p><small>{source.note}</small></div><a data-testid={`study-source-${source.id}`} href={source.url} target="_blank" rel="noreferrer">{source.status === 'verified' ? '已核验来源' : '待核验入口'} <ArrowRight size={13} /></a></article>)}</div><ul className="deep-limits">{dossier.limits.map((limit, index) => <li key={index}>{limit}</li>)}</ul>
      <button className="button button-dark deep-step-button" onClick={() => changeTab('experiment')}>带着这个问题做实验 <ArrowRight size={16} /></button>
    </div>}

    {tab === 'experiment' && <div role="tabpanel" id={`${panelId}-experiment-panel`} aria-labelledby={`${panelId}-experiment-tab`} className="deep-panel">
      <div className="deep-experiment-header"><div><p className="eyebrow">ONE VARIABLE AT A TIME</p><h3>结构可视化练习 · {config.title}</h3><p>A 与 B 仅在“{active.label}”不同，其他数值与观看方式完全一致。</p></div><button className="text-button" data-testid="study-reset" onClick={() => { setParameters(initialStudyParameters(config)); setActiveParameter(config.parameters[0].id); setAdopted('b'); setGray(false); setStructure(false); }}><RotateCcw size={14} />重置实验</button></div>
      <div className="deep-experiment-choices" aria-label="选择单变量实验">{config.parameters.map((parameter, index) => <button key={parameter.id} data-testid={`study-experiment-${parameter.id}`} aria-pressed={active.id === parameter.id} className={active.id === parameter.id ? 'selected' : ''} onClick={() => setActiveParameter(parameter.id)}><small>实验 {String(index + 1).padStart(2, '0')}</small><strong>{parameter.label}</strong></button>)}</div>
      <div className="deep-experiment-layout"><aside className="deep-controls"><div className="deep-control-title"><SlidersHorizontal size={16} /><strong>现代实验参数</strong></div><p className="deep-control-scope">百分比是本练习旋钮的相对档位，不是画面面积、实物宽度或线宽比的测量。数值只描述原创示意的变化。</p>{config.parameters.map(parameter => <label className={`deep-slider ${active.id === parameter.id ? 'active' : ''}`} key={parameter.id}><span>{parameter.label}<output>{bValues[parameter.id]}{parameter.unit}</output></span><input aria-label={parameter.label} data-testid={`study-slider-${parameter.id}`} type="range" min={parameter.min} max={parameter.max} step={parameter.step} value={bValues[parameter.id]} onChange={event => { setActiveParameter(parameter.id); setParameters(current => ({ ...current, [parameter.id]: Number(event.target.value) })); }} /><small>{active.id === parameter.id ? `当前对照变量；A 起点为 ${parameter.baseline}${parameter.unit}` : '两侧同值；调整后将成为当前对照变量'}</small></label>)}<div className="deep-view-switches"><label><input data-testid="study-grayscale" type="checkbox" checked={gray} onChange={event => setGray(event.target.checked)} />灰阶观察</label><label><input data-testid="study-structure" type="checkbox" checked={structure} onChange={event => setStructure(event.target.checked)} />显示结构辅助线</label></div><div className="deep-active-hypothesis"><span>本次只改变</span><strong>{active.label}</strong><p>{active.consequence}</p></div></aside><div className="deep-comparison"><div className="deep-preview-pair">{(['a', 'b'] as const).map(variant => <figure key={variant} className={`deep-preview-card ${adopted === variant ? 'adopted' : ''}`}><figcaption><span><b>{variant.toUpperCase()}</b>{variant === 'a' ? '研究起点' : '当前方案'}</span><small>{active.label} {variant === 'a' ? active.baseline : bValues[active.id]}{active.unit}</small></figcaption><StructurePreview tradition={tradition} config={config} values={variant === 'a' ? aValues : bValues} gray={gray} structure={structure} variant={variant} activeParameter={active.id} /><button data-testid={`study-adopt-${variant}`} aria-pressed={adopted === variant} onClick={() => setAdopted(variant)}>{adopted === variant ? <CheckCheck size={14} /> : <ArrowRight size={14} />}{adopted === variant ? `将采用 ${variant.toUpperCase()}` : `采用 ${variant.toUpperCase()}`}</button></figure>)}</div><p className="deep-svg-boundary">原创结构示意 · 不复制古画、不复原古物。两侧使用同一现代参考色，灰阶和结构开关同步作用。</p><div className="deep-observe-question"><span>观察问题</span><h4>{active.question}</h4><p>先在 A / B 中选择更符合当前用途的一侧，再记录理由。画面好坏仍需要人来判断。</p></div></div></div>
      <div className="deep-subheading"><span>把示意变成真实资产的实验</span><small>一次只换一项，固定模型与使用尺寸</small></div><p className="deep-real-experiment-boundary">以下研究方案需要制作实际资产并人工比较，不由上方结构滑块自动完成。</p><div className="deep-real-experiments">{dossier.experiments.map((experiment, index) => <article key={experiment.id}><span className="deep-card-label">制作实验 {String(index + 1).padStart(2, '0')}</span><h4>{experiment.variable}</h4><p><b>固定：</b>{experiment.fixed.join('；')}</p><p><b>A：</b>{experiment.a}</p><p><b>B：</b>{experiment.b}</p><small>人工验收：{experiment.acceptance}</small></article>)}</div>
      <button className="button button-dark deep-step-button" onClick={() => changeTab('review')}>检查制作规则与失败原因 <ArrowRight size={16} /></button>
    </div>}

    {tab === 'review' && <div role="tabpanel" id={`${panelId}-review-panel`} aria-labelledby={`${panelId}-review-tab`} className="deep-panel">
      <div className="deep-subheading"><span>当前参数下，优先人工检查什么？</span><small>观察提示，不是审美打分</small></div><div className="deep-diagnostic-grid">{checks.map(check => <article key={check.title}><FlaskConical size={17} /><h4>{check.title}</h4><p>{check.prompt}</p></article>)}</div>
      <div className="deep-subheading"><span>AI 出图失败时，从原因修正</span><small>修结构与约束，避免不断堆风格词</small></div><div className="deep-failures">{dossier.aiFailures.map((failure, index) => <article key={index}><div><span>看到的症状</span><h4>{failure.symptom}</h4></div><div><span>可能的原因</span><p>{failure.cause}</p></div><div><span>下一轮怎么改</span><p>{failure.correction}</p></div></article>)}</div>
      <div className="deep-subheading"><span>把决定锁定为项目规则</span><small>这些是现代制作建议</small></div><div className="deep-production-locks">{dossier.productionLocks.map((lock, index) => <article key={index}><h4>{lock.parameter}</h4><p>{lock.rule}</p><small>{lock.rationale}</small></article>)}</div>
      <div className="deep-review-panel"><div><h3>逐项审校，留下判断依据</h3><p>勾选只记录你已人工检查。它不代表历史来源已核验，也不会自动证明资产美术质量。</p><div className="deep-review-checks" data-testid="study-review-checks">{checklist.map((item, index) => <label key={item}><input data-testid={`study-check-${index}`} type="checkbox" checked={checked.includes(item)} onChange={event => setChecked(current => event.target.checked ? [...current, item] : current.filter(value => value !== item))} /><span>{item}</span></label>)}</div><small className="deep-review-count">已记录 {checked.filter(item => checklist.includes(item)).length} / {checklist.length} 项人工检查</small></div><label className="deep-note-label"><span><ScrollText size={16} />我的观察与取舍</span><textarea data-testid="study-note" aria-label="研究观察笔记" value={note} maxLength={4000} onChange={event => setNote(event.target.value)} placeholder="例如：B 的近景更有重量，但挡住了桥头。我保留 A 的尺度，另外固定可通行入口的轮廓。" /><small>记录选择 A / B 的理由、待核验问题和下一轮动作。笔记随导出保存，制作时也会带入约束。</small></label></div>
    </div>}

    <div className="deep-handoff"><div><span className="eyebrow">RESEARCH BECOMES A PRODUCTION CONTRACT</span><h3>把你的判断带到制作台</h3><p data-testid="study-adopted-summary">{experimentTitle} · {target === 'game' ? '游戏' : 'App'}用</p><small>发送参数、约束、审校问题与来源；也可下载完整研究笔记。</small></div><div className="deep-handoff-actions"><button className="button button-light" data-testid="study-export-md" onClick={() => exportNote('md')}><Download size={15} />笔记 MD</button><button className="button button-light" data-testid="study-export-json" onClick={() => exportNote('json')}><Download size={15} />笔记 JSON</button><button className="button button-dark" data-testid="study-transfer" onClick={() => onUseStudy(transfer)}>送到制作台 <ArrowRight size={16} /></button></div></div>
    <p role="status" className="deep-notice" data-testid="study-notice">{notice}</p>
  </section>;
}

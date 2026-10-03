import type { LibraryMaterial, MaterialCategory } from './material-types';

export const materialCategories: { id: MaterialCategory; label: string }[] = [
  { id: 'icon', label: '图标' }, { id: 'pattern', label: '纹样' },
  { id: 'frame', label: '边框' }, { id: 'texture', label: '材质' },
  { id: 'interface', label: '界面' }, { id: 'prop', label: '器物' }, { id: 'scene', label: '场景' },
];

const names: Record<string, string> = {
  'han-lacquer': '汉漆器', 'han-relief': '汉画像', 'blue-green-landscape': '青绿山水', 'southern-song': '南宋小景',
  'song-bird-flower': '宋花鸟', 'song-ceramics': '宋瓷', dunhuang: '敦煌壁画', garden: '园林', woodblock: '木版画',
  'ming-furniture': '明式家具', calligraphy: '书法', 'blue-white': '青花',
  'bronze-taotie': '礼器兽面', 'bronze-inlay': '错金银', 'liangzhu-jade': '良渚玉琮', 'hongshan-jade': '红山玉器',
  'warring-states-jade': '战国透雕玉', 'han-eaves-tile': '汉瓦当', 'tang-sancai': '唐三彩', 'song-cizhou': '磁州窑',
  'longquan-celadon': '龙泉青瓷', 'jun-glaze': '钧釉', 'dehua-porcelain': '德化白瓷', 'qing-famille-rose': '清粉彩',
  'tang-figure': '唐人物', 'five-dynasties-narrative': '长卷叙事', 'yuan-literati': '元文人山水', 'ming-wu-school': '吴门册页',
  'qing-eccentric-ink': '扬州墨笔', 'jiehua-architecture': '界画', 'seal-script': '篆书', 'han-clerical': '汉隶',
  'tang-regular': '唐楷', 'cursive-calligraphy': '草书', 'seal-carving': '篆刻', 'song-brocade': '织锦',
  'kesi-weaving': '缂丝', 'indigo-resist': '蓝染', 'silk-embroidery': '刺绣', 'dougong-timber': '木构斗拱',
  'huizhou-dwellings': '徽州民居', 'architectural-polychrome': '建筑彩画', cloisonne: '掐丝珐琅',
  'mother-of-pearl-lacquer': '螺钿', 'filigree-metal': '花丝', 'new-year-prints': '年画', 'paper-cut': '剪纸', 'shadow-puppetry': '皮影',
};
const ink = '#293e37', red = '#ad4d3d', gold = '#b49758', blue = '#315b7b', jade = '#638e7b', paper = '#f3eee2';
type Item = [id: string, name: string, traditionIds: string[], body: string, tags?: string[]];
const escapeXml = (s: string) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const line = (body: string, color = ink, width = 3.5) => `<g fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round">${body}</g>`;
const path = (d: string, fill = 'none', stroke = ink, width = 3) => `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
const rect = (x: number, y: number, w: number, h: number, fill: string, radius = 0, stroke = 'none') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="${fill}" stroke="${stroke}"/>`;
const circle = (cx: number, cy: number, r: number, fill: string, stroke = 'none') => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${stroke}"/>`;

function material(category: MaterialCategory, item: Item, width: number, height: number, transparent: boolean, tileable = false): LibraryMaterial {
  const [id, name, traditionIds, body, tags = []] = item;
  const family = names[traditionIds[0]] ?? '中国美学';
  const usage: Record<MaterialCategory, string> = {
    icon: '用于工具栏、物品栏、技能、地图标记或状态图标；建议先在实际显示尺寸检查轮廓。',
    pattern: '用于布料、纸张、界面底纹或装饰带；可重复平铺，低对比背景应另行降低透明度。',
    frame: '用于对话、卡片、道具详情和弹窗；中央留空，使用 SVG 保持比例缩放，不按九宫格自动拉伸。',
    texture: '用于材质基底、界面背景或插画叠层；标为可平铺的文件可 repeat，其他文件按单幅使用。',
    interface: '用于界面视觉结构研究与静态原型；分区、控件和图形均为可编辑 SVG，不含交互或业务代码。',
    prop: '用于道具概念、物品卡或场景装饰；属于现代简化矢量图，不替代角色或道具三维模型。',
    scene: '用于关卡气氛板、标题背景或 App 插画；为扁平矢量场景，可编辑层次与颜色，不含碰撞或动画。',
  };
  return {
    id, name, category, family, traditionIds,
    targets: category === 'interface' ? appInterfaces.has(id) ? ['app'] : ['game'] : ['game', 'app'],
    tags: [...tags, family, materialCategories.find(c => c.id === category)!.label],
    description: `${name}：取${family}的形态与组织方式，重新设计为现代矢量${materialCategories.find(c => c.id === category)!.label}。这是原创转译，不是历史原件复刻。`,
    usage: usage[category], width, height, transparent, tileable,
    assetKind: category === 'scene' ? 'scene' : category === 'prop' ? 'prop' : category === 'icon' || category === 'pattern' ? 'icon' : 'interface',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="${id}-title"><title id="${id}-title">${escapeXml(name)}</title>${body.replaceAll('__ID__', id)}</svg>`,
  };
}

const iconItems: Item[] = [
  ['icon-brush', '蘸墨毛笔', ['calligraphy', 'tang-regular'], line('<path d="M45 102 91 28l11 7-46 74Z"/><path d="M45 102q-6 18-19 18 14-9 10-24Z"/><path d="m86 36 11 7"/>')],
  ['icon-ink-stick', '墨锭', ['calligraphy', 'han-clerical'], line('<path d="m48 23 48 5-5 91-48-5Z"/><path d="m54 36 30 3m-32 64 30 3"/><path d="m67 48 9 1-2 14-9-1Zm-3 25 14 1-1 13-14-1Z"/>')],
  ['icon-inkstone', '砚池', ['calligraphy', 'ming-wu-school'], line('<path d="M37 25h70q9 0 9 10v77q0 11-10 11H37q-9 0-9-11V35q0-10 9-10Z"/><path d="M47 44h48v20H47Z"/><path d="M45 78h53v25H45Z"/><path d="m47 86 12-4 9 5 13-5 14 3"/>')],
  ['icon-scroll', '手卷', ['five-dynasties-narrative', 'blue-green-landscape'], line('<path d="M26 38h85v65H31q-12 0-12-11t12-11h80M26 38q-7-12 4-15 11-3 11 9v62M111 38q15 0 15 11v66q0 9-11 9"/><path d="M54 54h38m-38 13h28"/>')],
  ['icon-book', '线装书', ['woodblock', 'tang-regular'], line('<path d="M33 25h80v93H33q-10 0-10-12V37q0-12 10-12Z"/><path d="M39 25v93M23 43h18m-18 24h18m-18 26h18M64 40h28v35H64Z"/><path d="M71 48h14m-14 8h14m-14 8h14"/>')],
  ['icon-bamboo-slips', '竹简', ['han-clerical', 'han-relief'], line('<path d="M28 30h17v85H28Zm24-8h17v100H52Zm24 8h17v85H76Zm24-4h17v95h-17Z"/><path d="M23 49h99M23 94h99"/>')],
  ['icon-seal', '闲章', ['seal-carving', 'seal-script'], line('<path d="M32 34h79v79H32Z"/><path d="M40 43h64v61H40Z"/><path d="M49 52h22v14H60v27m0-15H49m34-26v42m-8-33h22m-11 16h10"/>', red, 4)],
  ['icon-sun', '日轮', ['han-eaves-tile', 'han-relief'], line('<circle cx="72" cy="72" r="27"/><path d="M72 15v13m0 88v13M15 72h13m88 0h13M32 32l9 9m62 62 9 9M32 112l9-9m62-62 9-9"/>')],
  ['icon-moon', '月钩', ['southern-song', 'song-bird-flower'], line('<path d="M95 22a51 51 0 1 0 24 82A49 49 0 0 1 95 22Z"/><path d="m48 96 5 2m-10-14 4 3"/>')],
  ['icon-cloud', '卷云', ['han-lacquer', 'dunhuang'], line('<path d="M23 92q-13-26 13-28-1-28 27-25 18-26 35-1 26-8 30 15 17 22-7 39H23Z"/><path d="M41 70q7-12 17-6t11 15m12-31q-10 2-8 12m35 3q-12-7-16 6"/>')],
  ['icon-rain', '细雨', ['southern-song', 'yuan-literati'], line('<path d="M30 65q-15-21 9-25 3-23 24-17 20-21 35 1 24-2 24 20 11 21-12 21Z"/><path d="m43 81-8 18m36-18-8 18m36-18-8 18m-42 4-8 17m36-17-8 17"/>')],
  ['icon-snow', '六出雪', ['silk-embroidery', 'paper-cut'], line('<path d="M72 19v106M26 46l92 53m-92 0 92-53M62 29l10 10 10-10m-20 86 10-10 10 10M32 59l14-4-4-14m-10 44 14 4-4 14m70-44-14-4 4-14m10 44-14 4 4 14"/>', blue, 3)],
  ['icon-wind', '流风', ['cursive-calligraphy', 'dunhuang'], line('<path d="M22 49h69q18 0 18-14t-16-13q-10 1-10 12M16 69h103q14 0 14 14t-14 14q-10 0-11-9M30 89h44q18 0 18 14t-18 15q-12 0-12-12"/>')],
  ['icon-bamboo', '竹叶', ['qing-eccentric-ink', 'yuan-literati'], line('<path d="m62 124 16-105M68 85l-34-29m39-14 30-18M64 111l38-25M64 100H79M68 73h16M74 44h13"/>') + path('M37 58Q13 54 20 34q22 1 17 24Z', jade, 'none') + path('M103 25q14-16 24-10-1 18-24 10ZM96 88q20-21 31-12-2 22-31 12Z', jade, 'none')],
  ['icon-lotus', '莲瓣', ['song-bird-flower', 'dunhuang'], line('<path d="M72 109V91M40 115q20-14 32-6 21-11 38 1"/>') + path('M72 89q-24-16 0-59 24 43 0 59Z', '#d8a599', red, 2) + path('M71 91Q32 95 29 56q35 4 42 35Zm3 0q39 4 42-35-35 4-42 35Z', '#e8c7ad', red, 2)],
  ['icon-plum', '梅枝', ['song-bird-flower', 'qing-eccentric-ink'], line('<path d="M29 120q38-38 61-102M57 88l51-11M72 62 36 48"/>') + [ [38,47], [90,28], [104,77] ].map(([x,y]) => `<g transform="translate(${x} ${y})">${[0,72,144,216,288].map(a => `<ellipse cx="0" cy="-7" rx="5" ry="8" transform="rotate(${a})" fill="${red}"/>`).join('')}${circle(0,0,3,gold)}</g>`).join('')],
  ['icon-orchid', '兰草', ['yuan-literati', 'ming-wu-school'], line('<path d="M53 122q2-44 48-87M58 122Q30 77 37 43M56 117Q29 94 17 95M61 122q37-26 56-18M59 124q2-69 17-92"/>') + path('M96 48q-2-20 13-18 4 16-8 17 20-5 21 7-14 11-26-6Z', jade, 'none')],
  ['icon-pine', '松针', ['southern-song', 'yuan-literati'], line('<path d="M56 124q20-38 13-82M61 97l47-18M66 72 31 56M69 48l34-19M31 56l-13-6m13 6-8-18m8 18 1-20m0 20 15-12M102 31l3-16m-3 16 17-13m-17 13 23-3M106 80l8-18m-8 18 21-5m-21 5 21 9"/>')],
  ['icon-peony', '牡丹', ['qing-famille-rose', 'silk-embroidery'], line('<path d="M72 89v36m0-16Q49 98 40 113q16 15 32 6m0-18q20-17 33-7-10 23-33 19"/>', jade, 3) + path('M72 83Q32 94 27 67q-18-27 14-35 16-27 31-8 23-20 32 10 31 7 14 35-10 29-46 14Z', '#dfab9c', red, 2) + line('<path d="M48 49q24-29 46 2-3 32-27 30-19-1-19-22 21-18 34 2-7 16-17 4"/>', red, 2)],
  ['icon-ginkgo', '银杏', ['silk-embroidery', 'song-brocade'], path('M73 111Q27 112 18 65q21-31 39-14l15 24 16-23q19-18 37 16-7 45-52 43Z', '#c7af69', ink, 3) + line('<path d="M72 127V75M72 105 37 68m35 37 32-37M60 101 39 54m42 47 21-44"/>', ink, 2)],
  ['icon-chrysanthemum', '菊瓣', ['song-bird-flower', 'silk-embroidery'], `<g>${Array.from({length:12},(_,i)=>`<ellipse cx="72" cy="44" rx="7" ry="19" transform="rotate(${i*30} 72 72)" fill="${paper}" stroke="${gold}" stroke-width="2"/>`).join('')}${circle(72,72,13,gold)}</g>` + line('<path d="M72 100v30m0-10 22-13m-22 6-18-11"/>', jade, 3)],
  ['icon-qin', '七弦琴', ['ming-furniture', 'five-dynasties-narrative'], path('M32 104q-8-10 5-27l49-48q16-11 28-2 11 8 0 21l-49 54q-19 19-33 2Z', '#bb855c', ink, 3) + line('<path d="M37 92l61-58M39 94l61-58M41 96l61-58M43 98l61-58M45 100l61-58M47 102l61-58M49 104l61-58M48 75l12 12m21-46 14 13"/>', '#f6ead2', 1.1)],
  ['icon-flute', '竹笛', ['ming-wu-school', 'five-dynasties-narrative'], path('m26 107 78-82 11 11-78 82Z', '#c1a373', ink, 3) + line('<path d="m36 95 11 10m47-72 11 10m-3-15 12 10"/>', ink, 2) + [52,65,78,91].map((x,i)=>circle(x,86-i*14,2.5,ink)).join('')],
  ['icon-bell', '编钟', ['bronze-inlay', 'bronze-taotie'], line('<path d="M62 28v-8h20v8M41 40h62l12 68q-43 16-86 0Z"/><path d="M41 40q31 15 62 0M36 96q36 14 72 0"/>') + [49,70,91].map(x=>[58,74,89].map(y=>circle(x,y,3,gold)).join('')).join('')],
  ['icon-sheng', '笙管', ['dunhuang', 'five-dynasties-narrative'], line('<path d="M50 100V39h8v54m4 0V23h8v70m4 0V14h8v79m4 0V30h8v70M50 93q-9 5-9 18 4 23 30 18 26-6 30-22-2-14-22-16M98 104l25-11 2 8-24 14"/>')],
  ['icon-fan', '团扇', ['song-bird-flower', 'tang-figure'], line('<circle cx="72" cy="59" r="39"/><path d="M67 98v30h10V98M50 82q18-13 43-33m-28 18-12-15m26 3 5-14"/>') + circle(84,43,4,red)],
  ['icon-umbrella', '油纸伞', ['ming-wu-school', 'new-year-prints'], line('<path d="M17 69q17-45 55-47 38 2 55 47-12-7-22 2-14-10-27 0-14-10-27 0-18-11-34-2ZM72 22v96q0 14 14 14 12 0 12-12M72 23Q46 42 42 66m30-43q27 21 29 43"/>')],
  ['icon-lantern', '宫灯', ['architectural-polychrome', 'new-year-prints'], line('<path d="M63 22V12h18v10M41 31h62l13 24v43l-13 14H41L28 98V55ZM41 31l11 24v42l-11 15m62-81L92 55v42l11 15M28 55h88M28 97h88M67 112v19m10-19v19"/>', red, 3)],
  ['icon-compass', '司南', ['han-relief', 'bronze-inlay'], line('<path d="M26 34h92v85H26Z"/><circle cx="72" cy="76" r="30"/><path d="M72 57q16-8 18 8-2 12-14 13-7 0-8-8l-16 26-6-4 15-26q2-8 11-9Z"/><path d="M72 39v9m0 59v7m-41-38h9m64 0h9"/>')],
  ['icon-gate', '城门', ['jiehua-architecture', 'han-relief'], line('<path d="M30 66h84v56H30ZM23 66l16-15h66l17 15M44 51V34h56v17M38 34l16-14h37l16 14M59 122V89q13-24 26 0v33M26 86h19m-15 15h17m54-15h16m-18 15h15"/>')],
  ['icon-bridge', '拱桥', ['garden', 'jiehua-architecture'], line('<path d="M18 98q54-65 108 0M25 106q47-51 94 0M18 98v-19m108 19V79M35 80V62m22 5V46m29 21V46m23 34V62M17 78q55-66 110 0M23 119q10-8 20 0t20 0t20 0t20 0t20 0"/>')],
  ['icon-boat', '篷舟', ['southern-song', 'five-dynasties-narrative'], line('<path d="M17 88h110l-20 27H38Z"/><path d="M45 88V75q5-38 29-38 24 0 28 38v13M60 87V62m24 25V54M37 129q12-9 25 0t25 0t25 0"/>')],
  ['icon-mountain', '山峦', ['blue-green-landscape', 'yuan-literati'], path('M17 114 53 36l22 40 20-58 33 96Z', '#95b1a0', ink, 3) + line('<path d="m38 66 15-9 16 9m17-19 9-10 13 20m-33 18-8 28m-14-21-8 20"/>')],
  ['icon-pavilion', '六角亭', ['garden', 'dougong-timber'], line('<path d="m19 60 53-40 53 40ZM29 60v54m26-54v54m35-54v54m26-54v54M22 114h100M72 20V12M43 43h58M22 123h100"/>')],
  ['icon-path', '石径', ['garden', 'ming-wu-school'], line('<path d="M25 126q88-37 32-65-22-15 18-44M68 127q92-41 31-78-20-13 2-32M37 99l28 11m2-32 27 10M60 57l26-4M75 35l18 4"/>')],
  ['icon-jade-bi', '玉璧', ['warring-states-jade', 'hongshan-jade'], line('<circle cx="72" cy="72" r="49"/><circle cx="72" cy="72" r="18"/><circle cx="72" cy="72" r="41"/>', jade, 4) + [0,60,120,180,240,300].map(a=>`<path d="M70 36q11-8 13 3" transform="rotate(${a} 72 72)" stroke="${jade}" fill="none" stroke-width="3"/>`).join('')],
  ['icon-jade-cong', '方琮', ['liangzhu-jade'], line('<path d="m32 39 40-18 40 18v67l-40 19-40-19ZM32 39l40 18 40-18M72 57v68M34 65l35 15m6 0 35-15M34 88l35 15m6 0 35-15"/>', jade, 3) + `<ellipse cx="72" cy="39" rx="19" ry="8" fill="none" stroke="${jade}" stroke-width="3"/>`],
  ['icon-jue', '爵杯', ['bronze-taotie', 'bronze-inlay'], line('<path d="M33 47q28 12 62-4l18 4-23 27H45L27 36l23 7M52 45V26m30 17V24M48 75l-9 44m41-44 12 44M92 49q30-5 18 25H91M38 91h51"/>', '#726445', 3)],
  ['icon-ding', '三足鼎', ['bronze-taotie'], line('<path d="M36 47h72v36q-4 27-36 27T36 83ZM47 47V27h13v20m24 0V27h13v20M42 102l-6 26m66-26 6 26M72 110v18M46 69q11-13 26 0 15-13 26 0m-49 12 10 3m26 0 10-3"/>')],
  ['icon-bowl', '敞口盏', ['song-ceramics', 'longquan-celadon'], line('<ellipse cx="72" cy="43" rx="50" ry="16"/><path d="M22 43q7 57 50 60t50-60M56 102v14h33v-14M38 66q32 16 67 0"/>', jade, 3)],
  ['icon-vase', '梅瓶', ['blue-white', 'song-cizhou'], line('<path d="M61 22h22v26q30 11 29 39v29H32V87q-1-28 29-39ZM56 23h32M39 72h66M39 104h66"/>', blue, 3) + line('<path d="M50 93q10-24 22-9t23-2m-23 2-2 12m9-10 10 6"/>', blue, 2)],
  ['icon-teacup', '茶盏', ['dehua-porcelain', 'song-ceramics'], line('<ellipse cx="64" cy="52" rx="40" ry="13"/><path d="M24 52v23q0 34 41 34 39 0 39-34V52M104 60q33-8 22 21-5 9-25 7M46 109v10h37v-10"/>')],
  ['icon-incense', '香炉', ['song-ceramics', 'ming-furniture'], line('<path d="M36 77h72v25q-36 25-72 0ZM31 77h82M44 109l-4 17m59-17 5 17M51 64q-14-13 0-26t0-24m24 50q-14-13 0-26t0-24m23 50q-14-13 0-26t0-24"/>')],
  ['icon-ruyi', '如意', ['filigree-metal', 'qing-famille-rose'], line('<path d="M36 104q21 10 48-44-21 8-25-4-10-19 7-29 12-18 25-4 25-7 27 17 7 22-25 20-15 68-55 56-11-4-2-12Z"/><path d="M65 48q-5-10 9-13 10-10 14 2 19-7 20 8"/>')],
  ['icon-crane', '鹤影', ['song-bird-flower', 'silk-embroidery'], line('<path d="M26 90q27-41 58-20 11 8 13-1l-5-27q-6-23 12-28 17-3 13 12l-13 3 18 13M97 68q12 24-22 36l-39-4ZM68 103l-3 28m18-32 13 30M36 97l-15 11m38-33 28 13"/>') + circle(107,21,2,red)],
  ['icon-fish', '双弧鱼', ['han-relief', 'new-year-prints'], path('M31 72q38-47 78 0-40 47-78 0ZM31 72 13 48v48Z', '#c59b68', ink, 3) + line('<path d="M87 50q-11 24 0 44M52 63l20 9-20 9M63 47l11-12 13 15m-24 47 11 12 13-15"/>') + circle(97,69,3,ink)],
  ['icon-butterfly', '蝶翼', ['kesi-weaving', 'silk-embroidery'], path('M69 62Q32 11 20 39q-11 27 25 43-25 16-10 32 16 19 34-23Zm6 0q37-51 49-23 11 27-25 43 25 16 10 32-16 19-34-23Z', '#b9c8b2', ink, 3) + line('<path d="M72 53v46m0-46L59 29m13 24 13-24M39 47l17 23m51-23L89 70M46 101l12-12m40 12L86 89"/>')],
  ['icon-swallow', '燕归', ['song-bird-flower', 'paper-cut'], path('M72 81Q42 35 14 44l32 40-28 23 43-6 11 25 11-25 43 6-28-23 32-40q-28-9-58 37Z', ink, 'none') + path('M71 81q11-25 25-20l15 6-14 6-17 22', '#8bafbd', 'none')],
  ['icon-beast-mask', '兽面', ['bronze-taotie'], line('<path d="M19 48h28V29h15v28h20V29h15v19h28v53h-23v16H82V89H62v28H42v-16H19ZM29 60h20v19H29Zm66 0h20v19H95ZM62 67h20v14H62Z"/>', '#746444', 4)],
  ['icon-deer', '鹿行', ['han-relief', 'shadow-puppetry'], line('<path d="M25 67q37-22 59-9l10-26 18 3 12 14-19 9-3 38H45L25 84ZM44 94l-3 32m24-32 3 32m31-32 7 32M94 33l-6-15m10 15 5-19m0 9 11-6M25 71l-12-13"/>')],
  ['icon-star', '星芒', ['han-eaves-tile', 'architectural-polychrome'], path('M72 20 84 56l39 2-31 23 10 40-30-24-31 24 11-40-32-23 39-2Z', '#c9b47a', ink, 3)],
  ['icon-drop', '水滴', ['jun-glaze', 'longquan-celadon'], path('M72 20q-42 49-40 72 3 39 40 39t40-39q2-23-40-72Z', '#9ab7c0', blue, 3) + line('<path d="M48 85q-8 21 13 27"/>', '#e9f0e6', 5)],
  ['icon-flame', '焰纹', ['dunhuang', 'cloisonne'], path('M75 16q10 36 25 44 6-17 1-28 35 33 18 72-11 29-47 27-36-3-48-31-8-24 14-46 0 27 11 27 21-23 26-65Z', '#c5784c', red, 3) + path('M73 64q-18 28-12 40 7 13 19 6 15-9-7-46Z', '#e6c078', 'none')],
  ['icon-leaf', '一叶', ['song-bird-flower', 'indigo-resist'], path('M31 113Q9 27 117 22q16 89-86 91Z', '#a8bca0', ink, 3) + line('<path d="m24 123 79-82M50 95l-7-36m32 15 30 1M69 76l-7-31"/>')],
  ['icon-shield', '护心盾', ['bronze-inlay', 'shadow-puppetry'], path('M72 18 119 37v46q-8 29-47 49-39-20-47-49V37Z', '#b1aa87', ink, 3) + line('<path d="M72 31 104 45v34q-5 22-32 39-27-17-32-39V45ZM72 46v57M53 75h38"/>')],
  ['icon-sword', '青锋', ['warring-states-jade', 'shadow-puppetry'], path('m34 113 42-60 35-36-17 47-48 62Z', '#a7b7b2', ink, 3) + line('<path d="m31 91 27 25m-17-13-20 24m4-5 10 8m13-26 43-54"/>')],
  ['icon-bow', '弓弦', ['han-relief', 'shadow-puppetry'], line('<path d="M35 21q83 51 0 103l17-52ZM35 21l18 52-18 51M15 72h111m-17-10 17 10-17 10M25 65l-9 7 9 7"/>')],
  ['icon-coin', '方孔钱', ['han-relief', 'bronze-inlay'], circle(72,72,49,'#c0aa70',ink) + line('<circle cx="72" cy="72" r="41"/><path d="M59 58h26v28H59ZM72 34v12m0 53v12M34 72h12m53 0h12"/>')],
  ['icon-key', '铜锁钥', ['ming-furniture', 'bronze-inlay'], line('<circle cx="51" cy="45" r="25"/><circle cx="51" cy="45" r="12"/><path d="m65 64 51 51-10 10-12-12 9-9-12-12-9 9-26-26"/>', '#8b784c', 4)],
  ['icon-chess', '弈棋', ['garden', 'ming-furniture'], line('<path d="M30 29h85v86H30ZM58 29v86m29-86v86M30 57h85m-85 29h85"/>') + circle(58,57,10,ink) + circle(87,86,10,paper,ink)],
];

function repeat(body: string, period: number, background = paper): string {
  return `<defs><pattern id="__ID__-repeat" width="${period}" height="${period}" patternUnits="userSpaceOnUse">${body}</pattern></defs>${rect(0,0,256,256,background)}<rect width="256" height="256" fill="url(#__ID__-repeat)"/>`;
}

const patternItems: Item[] = [
  ['pattern-cloud-key', '回云方胜', ['han-lacquer'], repeat(line('<path d="M8 8h40v40H16V24h16v8M56 56H24V16h24v24H40v-8"/>',red,2),64)],
  ['pattern-thunder-key', '雷纹连续格', ['bronze-taotie'], repeat(line('<path d="M0 0h64v64H0ZM8 8h48v48H8V20h36v24H20V32h12"/>','#9a8253',2),64,'#ede4ca')],
  ['pattern-inlay-hooks', '错金钩连', ['bronze-inlay'], repeat(line('<path d="M0 32h12q0-20 20-20t20 20H64M32 0v12m0 40v12M12 32q0 20 20 20t20-20M20 32q0-12 12-12t12 12-12 12-12-12"/>',gold,2),64,'#293e37')],
  ['pattern-cong-eyes', '琮面双目格', ['liangzhu-jade'], repeat(line('<path d="M8 15h48v8H8Zm0 29h48v5H8ZM19 31h8v8h-8Zm18 0h8v8h-8ZM30 24v19"/>',jade,2),64)],
  ['pattern-jade-spiral', '玉弧勾连', ['hongshan-jade'], repeat(line('<path d="M7 46q-7-32 25-33 28 0 21 25-5 20-24 8-14-10-1-18 9-4 11 6"/>',jade,3),64,'#e4e8d5')],
  ['pattern-openwork-diamond', '透雕交菱', ['warring-states-jade'], repeat(line('<path d="m32 0 32 32-32 32L0 32Zm0 14 18 18-18 18-18-18ZM0 0l16 16M64 0 48 16M0 64l16-16m48 16L48 48"/>',jade,2),64)],
  ['pattern-eaves-rosette', '瓦当四瓣', ['han-eaves-tile'], repeat(`<circle cx="32" cy="32" r="25" fill="none" stroke="${ink}" stroke-width="2"/>${path('M32 11q17 12 0 21-17-9 0-21Zm0 21q17 9 0 21-17-12 0-21Zm0 0q-9 17-21 0 12-17 21 0Zm0 0q9-17 21 0-12 17-21 0Z','none',ink,2)}`,64)],
  ['pattern-lotus-chain', '莲瓣串带', ['dunhuang'], repeat(path('M32 52Q8 39 32 10q24 29 0 42ZM32 52Q5 54 5 28q24 2 27 24ZM32 52q27 2 27-24-24 2-27 24Z','#e4c9a1',red,1.5),64,'#eee2c8')],
  ['pattern-pearl-roundel', '联珠团窠', ['song-brocade'], repeat(`<circle cx="32" cy="32" r="24" fill="none" stroke="${gold}" stroke-width="4" stroke-dasharray="1 6"/>${path('M32 16 43 32 32 48 21 32Z','#ad4d3d','none')}`,64,'#f1e2c9')],
  ['pattern-brocade-flower', '织锦八瓣', ['song-brocade'], repeat(Array.from({length:8},(_,i)=>`<ellipse cx="32" cy="19" rx="5" ry="10" transform="rotate(${i*45} 32 32)" fill="${gold}"/>`).join('')+circle(32,32,5,red),64,'#304c4a')],
  ['pattern-kesi-clouds', '缂丝曲云', ['kesi-weaving'], repeat(line('<path d="M0 16h12q0-12 12-12h16q12 0 12 12h12M0 48h12q0 12 12 12h16q12 0 12-12h12M0 32h64"/>',blue,3),64,'#e7debc')],
  ['pattern-indigo-stars', '蓝染八角花', ['indigo-resist'], repeat(path('M32 6 39 22 56 16 47 32 58 47 40 42 32 59 25 43 8 49 17 32 7 18 24 22Z',paper,'none')+circle(32,32,5,blue),64,blue)],
  ['pattern-indigo-dots', '蓝染四点格', ['indigo-resist'], repeat(circle(16,16,5,paper)+circle(48,16,5,paper)+circle(16,48,5,paper)+circle(48,48,5,paper)+path('M32 19 45 32 32 45 19 32Z','none',paper,2),64,blue)],
  ['pattern-embroidered-leaves', '绣叶交枝', ['silk-embroidery'], repeat(line('<path d="M0 32h64M32 0v64"/>',jade,1.5)+path('M16 32q-14-16 0-23 13 12 0 23Zm32 0q14 16 0 23-13-12 0-23Zm-16-16q16-14 23 0-12 13-23 0Zm0 32q-16 14-23 0 12-13 23 0Z',jade,'none'),64)],
  ['pattern-bluewhite-vine', '青花缠枝', ['blue-white'], repeat(line('<path d="M0 32q16-32 32 0t32 0M16 20q-11 0-12-11 13-3 12 11Zm30 25q11 0 12 11-13 3-12-11Z"/>',blue,2),64)],
  ['pattern-rose-sprigs', '粉彩折枝格', ['qing-famille-rose'], repeat(line('<path d="M24 50 40 14m-9 21-14-9m16 4 16 8"/>',jade,2)+circle(40,16,7,'#d5a096')+circle(15,25,4,'#cdb873')+path('M31 42q11-1 15 11-16 4-15-11Z',jade,'none'),64)],
  ['pattern-cizhou-scroll', '磁州黑绘弧', ['song-cizhou'], repeat(line('<path d="M0 32h8q0-26 24-26 26 0 26 26h6M8 32q0 26 24 26 26 0 26-26M23 32q-5-15 9-14 14 1 9 14-4 12-13 4"/>',ink,2.5),64)],
  ['pattern-celadon-petals', '青瓷瓣影', ['longquan-celadon'], repeat(path('M32 3q28 29 0 58Q4 32 32 3ZM3 32q29-28 58 0Q32 60 3 32Z','none',jade,1.5),64,'#dce7d4')],
  ['pattern-polychrome-bracket', '彩画折线带', ['architectural-polychrome'], repeat(path('M0 10h24V0h16v10h24v12H40v20h24v12H40v10H24V54H0V42h24V22H0Z','#385f69',gold,1.5),64,'#b56244')],
  ['pattern-cloisonne-fan', '珐琅扇瓣', ['cloisonne'], repeat(path('M8 56A48 48 0 0 1 56 8V56ZM20 56q0-31 36-36M32 56q0-19 24-24M44 56q0-7 12-12','none',gold,2),64,'#32687b')],
  ['pattern-pearl-stars', '螺钿星网', ['mother-of-pearl-lacquer'], repeat(path('M32 9 39 25 55 32 39 39 32 55 25 39 9 32 25 25Z','#c6dbd5','none')+circle(8,8,2,'#d6b5d0')+circle(56,56,2,'#d6b5d0'),64,'#293b37')],
  ['pattern-filigree-loops', '花丝连环', ['filigree-metal'], repeat(line('<circle cx="16" cy="32" r="15"/><circle cx="48" cy="32" r="15"/><path d="M16 17V0m0 47v17M48 17V0m0 47v17M1 32h62"/>',gold,1.5),64)],
  ['pattern-paper-cut-flowers', '剪纸四瓣窗花', ['paper-cut'], repeat(path('M32 4q15 0 9 19 19-6 19 9t-19 9q6 19-9 19t-9-19Q4 47 4 32t19-9Q17 4 32 4Zm0 16-12 12 12 12 12-12Z',red,'none'),64)],
  ['pattern-newyear-wave', '年画鱼鳞浪', ['new-year-prints'], repeat(line('<path d="M0 32q16-28 32 0t32 0M0 64q16-28 32 0t32 0M0 0q16 28 32 0t32 0"/>',blue,3),64,'#e7c591')],
  ['pattern-shadow-lattice', '皮影透孔网', ['shadow-puppetry'], repeat(path('M0 0h64v64H0Zm10 10v20h20V10Zm24 0v20h20V10ZM10 34v20h20V34Zm24 0v20h20V34Z',red,'none'),64,'#f1d3a3')],
  ['pattern-garden-hexagon', '园林六角窗格', ['garden'], repeat(line('<path d="m16 0 32 0 16 32-16 32H16L0 32Zm0 0L0 32m48-32 16 32M16 64 0 32m48 32 16-32"/>',ink,2),64)],
  ['pattern-huizhou-roof', '马头墙节奏', ['huizhou-dwellings'], repeat(path('M0 48V32h12V20h8V12h24v8h8v12h12v16H0Z','none',ink,2),64,'#e4e0d4')],
  ['pattern-bracket-join', '斗拱交叠', ['dougong-timber'], repeat(line('<path d="M0 24h24V8h16v16h24M0 40h16v16h32V40h16M16 24v16h32V24M24 40V24h16v16"/>','#9c7153',3),64)],
  ['pattern-seal-maze', '篆线方迷', ['seal-script', 'seal-carving'], repeat(line('<path d="M8 8h48v48H8V24h16v16h16V24H24m16 0V8M24 40v16"/>',red,3),64)],
  ['pattern-clerical-bars', '隶意横波', ['han-clerical'], repeat(path('M5 15q24 4 46-5l7 11Q30 29 5 21Zm0 26q24 4 46-5l7 11Q30 55 5 47Z',ink,'none'),64)],
  ['pattern-regular-grid', '楷意九宫格', ['tang-regular'], repeat(line('<path d="M0 0h64v64H0ZM21 0v64M43 0v64M0 21h64M0 43h64"/>','#b2b49f',1),64)],
  ['pattern-cursive-ribbon', '草意回带', ['cursive-calligraphy'], repeat(line('<path d="M0 32q16-32 32 0t32 0M0 44q16-32 32 0t32 0"/>',ink,3),64)],
];

const frameBase = (body: string) => body;
const frameItems: Item[] = [
  ['frame-key-corners', '回纹角框', ['han-lacquer'], frameBase(line('<path d="M24 80V24h70m-46 34V42h29v29H41v-5M488 80V24h-70m46 34V42h-29v29h36v-5M24 304v56h70m-46-34v16h29v-29H41v5m447-14v56h-70m46-34v16h-29v-29h36v5M104 24h304M24 92v200m464-200v200M104 360h304"/>',red,3))],
  ['frame-bronze-tabs', '铜器耳边框', ['bronze-taotie'], line('<path d="M46 38h420v308H46ZM30 79H16v56h30m420-56h30v56h-30M30 249H16v56h30m420-56h30v56h-30M46 65h420M46 319h420M78 38v27m356-27v27M78 319v27m356-27v27"/>','#8d774c',3)],
  ['frame-inlay-cross', '错金交角框', ['bronze-inlay'], line('<path d="M32 48h448v288H32ZM20 72h472M20 312h472M56 24v336m400-336v336M40 36h32v32H40ZM440 36h32v32h-32ZM40 316h32v32H40Zm400 0h32v32h-32Z"/>',gold,2)],
  ['frame-jade-square', '玉琮分节框', ['liangzhu-jade'], line('<path d="M36 36h440v312H36ZM20 20h472v344H20M20 84h16m440 0h16M20 300h16m440 0h16M84 20v16m344-16v16M84 348v16m344-16v16"/>',jade,4)],
  ['frame-jade-oval', '玉环椭圆框', ['hongshan-jade'], '<ellipse cx="256" cy="192" rx="227" ry="162" fill="none" stroke="'+jade+'" stroke-width="4"/><ellipse cx="256" cy="192" rx="218" ry="153" fill="none" stroke="'+jade+'" stroke-width="1"/>'+line('<path d="M256 22v21m0 298v21M20 192h23m426 0h23"/>',jade,3)],
  ['frame-jade-interlace', '透雕连角框', ['warring-states-jade'], line('<path d="M66 28h380q38 0 38 38v252q0 38-38 38H66q-38 0-38-38V66q0-38 38-38ZM52 88V52h36m336 0h36v36M52 296v36h36m336 0h36v-36M24 72l48-48 24 24-48 48Zm392-24 24-24 48 48-24 24ZM24 312l24-24 48 48-24 24Zm392 24 48-48 24 24-48 48Z"/>',jade,2)],
  ['frame-eaves-disc', '瓦当圆徽框', ['han-eaves-tile'], line('<path d="M62 31h388v322H62ZM31 62h450v260H31"/>',ink,2)+[ [47,47],[465,47],[47,337],[465,337] ].map(([x,y])=>circle(x,y,22,paper,ink)+circle(x,y,14,'none',ink)+path(`M${x-6} ${y-6}h12v12h-12Z`,'none',ink,2)).join('')],
  ['frame-cave-niche', '石窟龛形框', ['dunhuang'], line('<path d="M43 349V158Q43 32 256 18q213 14 213 140v191ZM55 338V160Q55 45 256 30q201 15 201 130v178ZM43 301h-15v48h455v-48h-14"/>',gold,3)],
  ['frame-lotus-points', '莲瓣端头框', ['dunhuang', 'cloisonne'], line('<path d="M64 36h384v312H64M36 64v256m440-256v256M90 26h332M90 358h332"/>',gold,2)+[ [52,52],[460,52],[52,332],[460,332] ].map(([x,y])=>path(`M${x} ${y-20}q20 20 0 40-20-20 0-40Zm-20 20q20-20 40 0-20 20-40 0Z`,'none',red,2)).join('')],
  ['frame-silk-thread', '织锦细线框', ['song-brocade'], line('<path d="M26 26h460v332H26ZM34 34h444v316H34"/>',gold,1.5)+`<rect x="20" y="20" width="472" height="344" fill="none" stroke="${red}" stroke-width="3" stroke-dasharray="2 8"/>`],
  ['frame-kesi-stepped', '缂丝阶边框', ['kesi-weaving'], line('<path d="M52 24h408v12h24v296h-24v28H52v-28H28V36h24ZM64 45h384v12h15v254h-15v25H64v-25H49V57h15Z"/>',blue,2)],
  ['frame-embroidered-vine', '绣枝边框', ['silk-embroidery'], line('<path d="M38 45h436v294H38ZM26 64q35-18 17-36m405 0q-18 35 37 36M26 320q35 18 17 36m405 0q-18-35 37-36"/>',jade,2)+[ [38,45],[474,45],[38,339],[474,339] ].map(([x,y])=>circle(x,y,8,'#d6a293')).join('')],
  ['frame-indigo-seams', '蓝染针迹框', ['indigo-resist'], `<rect x="25" y="25" width="462" height="334" rx="14" fill="none" stroke="${blue}" stroke-width="14"/><rect x="25" y="25" width="462" height="334" rx="14" fill="none" stroke="${paper}" stroke-width="2" stroke-dasharray="5 7"/>`],
  ['frame-blue-white-scroll', '青花卷枝框', ['blue-white'], line('<path d="M54 35h404v314H54M38 80q-30-45 15-54 27-3 24 16-3 16-21 10m378 0q-18 6-21-10-3-19 24-16 45 9 13 54M38 304q-30 45 15 54 27 3 24-16-3-16-21-10m378 0q-18-6-21 10-3 19 24 16 45-9 13-54"/>',blue,2.5)],
  ['frame-cizhou-black', '磁州黑绘框', ['song-cizhou'], line('<path d="M34 35h444v314H34ZM43 44h426v296H43M58 60h28m-28 0v28M426 60h28v28M58 324h28m-28 0v-28m368 28h28v-28"/>',ink,3)],
  ['frame-celadon-soft', '青瓷柔角框', ['longquan-celadon', 'song-ceramics'], '<rect x="29" y="29" width="454" height="326" rx="47" fill="none" stroke="'+jade+'" stroke-width="6"/><rect x="40" y="40" width="432" height="304" rx="38" fill="none" stroke="'+jade+'" stroke-width="1"/>'],
  ['frame-garden-moon', '园林月洞框', ['garden'], '<ellipse cx="256" cy="192" rx="227" ry="162" fill="none" stroke="'+ink+'" stroke-width="7"/>'+line('<path d="M48 300h416M54 312h404M256 30v-9M29 192H16m467 0h13"/>',ink,2)],
  ['frame-huizhou-wall', '马头墙顶框', ['huizhou-dwellings'], line('<path d="M36 350V68h44V52h44V32h44V18h176v14h44v20h44v16h44v282ZM36 350h440M48 78h32V64h44V44h44V30h176v14h44v20h44v14h32"/>',ink,3)],
  ['frame-bracket-corner', '斗拱托角框', ['dougong-timber'], line('<path d="M54 35h404v314H54M28 78h70V58H78V28H58v30H28ZM414 58h20V28h20v30h30v20h-70ZM28 306h30v50h20v-30h20v-20h-70ZM414 306h70v20h-30v30h-20v-30h-20Z"/>','#9e7255',3)],
  ['frame-polychrome-beam', '彩画梁框', ['architectural-polychrome'], rect(26,26,460,12,blue)+rect(26,346,460,12,blue)+rect(26,38,12,308,red)+rect(474,38,12,308,red)+line('<path d="M20 20h472v344H20ZM38 38h436v308H38M256 20v18m0 308v18M20 192h18m436 0h18"/>',gold,2)],
  ['frame-pearl-flower', '螺钿花角框', ['mother-of-pearl-lacquer'], line('<path d="M54 33h404v318H54ZM44 43h424v298H44"/>',ink,2)+[ [44,43],[468,43],[44,341],[468,341] ].map(([x,y])=>path(`M${x} ${y-18}l7 12 12 6-12 7-7 12-7-12-12-7 12-6Z`,'#9daab8',ink,1)).join('')],
  ['frame-filigree-loops', '花丝环角框', ['filigree-metal'], line('<path d="M52 32h408v320H52M32 52h448v280H32"/>',gold,1.5)+[ [42,42],[470,42],[42,342],[470,342] ].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="18" fill="none" stroke="${gold}" stroke-width="2"/><circle cx="${x}" cy="${y}" r="10" fill="none" stroke="${gold}" stroke-width="1.5"/>`).join('')],
  ['frame-cut-paper', '剪纸花角框', ['paper-cut', 'new-year-prints'], line('<path d="M58 30h396v324H58M30 58h452v268H30"/>',red,5)+[ [43,43],[469,43],[43,341],[469,341] ].map(([x,y])=>path(`M${x} ${y-23}q17-2 12 12 16-4 15 11-1 16-15 11 4 15-12 15-16 0-11-15-15 5-15-11-1-15 15-11-5-15 11-12Z`,red,'none')).join('')],
  ['frame-seal-impression', '章印分栏框', ['seal-carving', 'seal-script'], line('<path d="M26 26h460v332H26ZM37 37h438v310H37M26 102h11m438 0h11M26 280h11m438 0h11M109 26v11m294-11v11M109 347v11m294-11v11"/>',red,4)],
];

const textureItems: Item[] = [
  ['texture-paper-fibers', '短纤维纸纹', ['calligraphy'], repeat(line('<path d="m5 9 6 3m14 31 8-2m14-16 7 2m-39 29 6 2m31-4 7-2m-2-42 5 1M29 10v4m-15 19 2 4"/>','#beb9a4',0.7),64)],
  ['texture-paper-flecks', '散点纸纹', ['woodblock'], repeat([ [8,7,1],[28,19,1.3],[53,12,.8],[43,44,1],[12,53,.8],[29,61,.6],[58,59,1] ].map(([x,y,r])=>circle(x,y,r,'#c6bfa8')).join(''),64,'#efe7d7')],
  ['texture-silk-warp', '丝绢经纬', ['kesi-weaving'], repeat(line('<path d="M4 0v32M12 0v32M20 0v32M28 0v32M0 8h32M0 24h32"/>','#c6bc9f',0.6),32,'#e9dfc1')],
  ['texture-brocade-weave', '锦面斜织', ['song-brocade'], repeat(line('<path d="M0 0 32 32M0 16l16 16M16 0l16 16M0 8h32M0 24h32M8 0v32M24 0v32"/>','#a18c66',.7),32,'#d4c49f')],
  ['texture-indigo-grain', '蓝染细颗粒', ['indigo-resist'], repeat([ [6,5],[17,11],[28,4],[5,22],[20,25],[29,19] ].map(([x,y])=>circle(x,y,1,'#82a3b1')).join(''),32,'#315b7b')],
  ['texture-lacquer-sheen', '漆面纵向光带', ['han-lacquer'], `<defs><linearGradient id="__ID__-shine"><stop stop-color="#1f302c"/><stop offset=".35" stop-color="#425248"/><stop offset=".62" stop-color="#253730"/><stop offset="1" stop-color="#1b2b27"/></linearGradient></defs><rect width="256" height="256" fill="url(#__ID__-shine)"/>` + line('<path d="M36 12v232M46 17v217M197 28v202"/>','#566151',.6)],
  ['texture-russet-lacquer', '朱漆斑驳', ['han-lacquer'], repeat(circle(13,17,12,'#a34e3e')+circle(49,43,8,'#b95e48')+path('M8 39q17-14 32 7t14 7l-5 7H18Z','#934333','none'),64,'#ac503d')],
  ['texture-bronze-speckle', '铜绿颗粒', ['bronze-taotie'], repeat(path('M5 5h15l3 9-9 8-12-7Zm27 30 15-5 13 13-4 13-19-5Z','#6e8b76','none')+circle(43,12,5,'#a49562')+circle(16,48,4,'#9e8957'),64,'#777452')],
  ['texture-inlay-dashes', '金属细划痕', ['bronze-inlay'], repeat(line('<path d="m6 6 17 1m19 21 15 2M11 46l24-2m7 15 15 1M45 10l7-1"/>','#c0ae77',.8),64,'#817653')],
  ['texture-jade-mottling', '青玉云斑', ['hongshan-jade', 'warring-states-jade'], repeat(path('M0 14q14-16 35-4t29 4v25q-20 13-37-1T0 39Z','#b7c9a6','none')+path('M10 44q24-16 41 3l-7 10H16Z','#92b299','none'),64,'#a6bf9e')],
  ['texture-cong-stone', '玉琮细雾点', ['liangzhu-jade'], repeat([ [8,11,3],[29,8,2],[53,26,4],[18,48,4],[44,55,2],[36,31,3] ].map(([x,y,r])=>circle(x,y,r,'#a5b297')).join(''),64,'#c3cbb2')],
  ['texture-celadon-soft', '青釉柔光', ['longquan-celadon'], `<defs><radialGradient id="__ID__-glaze" cx=".35" cy=".28" r=".8"><stop stop-color="#d8e5ce"/><stop offset=".6" stop-color="#a5c4b0"/><stop offset="1" stop-color="#759d89"/></radialGradient></defs><rect width="256" height="256" fill="url(#__ID__-glaze)"/>`],
  ['texture-jun-bloom', '钧釉晕斑', ['jun-glaze'], `<defs><radialGradient id="__ID__-jun"><stop stop-color="#b38b9f"/><stop offset=".43" stop-color="#a3a6bc"/><stop offset="1" stop-color="#7597ac"/></radialGradient></defs><rect width="256" height="256" fill="url(#__ID__-jun)"/>`+path('M10 24q42-26 68 6t12 57q-45 11-58-17T10 24Zm126 127q64-8 94 53v52h-79q-29-30-15-105Z','#b9a0ae','none')],
  ['texture-dehua-milk', '白瓷乳光', ['dehua-porcelain'], `<defs><linearGradient id="__ID__-white" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f9f6e9"/><stop offset=".5" stop-color="#f3edda"/><stop offset="1" stop-color="#d6d6c8"/></linearGradient></defs><rect width="256" height="256" fill="url(#__ID__-white)"/>`],
  ['texture-sancai-drips', '三彩垂流', ['tang-sancai'], rect(0,0,256,256,'#dbc695')+path('M0 0h50v130q-13 26-24 0V76H0Zm90 0h60v164q-16 28-30-3V90H90Z','#9aaf75','none')+path('M55 0h28v81q-12 26-28 0Zm114 0h49v127q-25 29-49-5Z','#b57944','none')],
  ['texture-cizhou-brushed', '磁州白地刷痕', ['song-cizhou'], rect(0,0,256,256,'#e9e1cc')+line('<path d="M8 51q79-28 234-7M12 60q83-19 231-10M7 147q87-21 238-10M12 155q82-14 225-8M20 205q79-13 201-4"/>','#b2ad9a',1.5)],
  ['texture-bluewhite-speckles', '青花料点', ['blue-white'], repeat([ [9,9,1.7],[45,18,2.3],[23,40,1.2],[53,54,1.4],[7,59,.9] ].map(([x,y,r])=>circle(x,y,r,'#68829d')).join(''),64,'#edf0e6')],
  ['texture-timber-grain', '木材顺纹', ['ming-furniture', 'dougong-timber'], repeat(line('<path d="M0 10q16-8 32 0t32 0M0 22q16-5 32 0t32 0M0 45q16-8 32 0t32 0M0 57q16-5 32 0t32 0"/>','#a17a57',1.1),64,'#c0a17a')],
  ['texture-stone-stipple', '石面点刻', ['han-relief'], repeat([ [5,7,1.7],[14,25,1],[26,12,1.3],[30,29,1],[8,18,.7] ].map(([x,y,r])=>circle(x,y,r,'#8f8f7e')).join(''),32,'#bcbeab')],
  ['texture-tile-roof', '灰瓦叠片', ['huizhou-dwellings', 'jiehua-architecture'], repeat(path('M0 0h64v32q-16 15-32 0-16 15-32 0Zm0 32q16-15 32 0 16-15 32 0v32H0Z','#87938c','#596c65',1),64,'#87938c')],
  ['texture-wall-plaster', '白墙灰脚', ['huizhou-dwellings'], rect(0,0,256,256,'#e8e5d8')+path('M0 219q40-16 84 1t83 0 89 9v27H0Z','#a5aba0','none')+line('<path d="M18 31h13m80 72h17m65-45h9M39 173h7m106-27h13"/>','#c5c8bb',1)],
  ['texture-pearl-dark', '螺钿细闪', ['mother-of-pearl-lacquer'], repeat(path('M8 8 14 4 19 10 14 18ZM39 36l12-4 5 11-10 8ZM20 49l6-3 6 6-7 7Z','#b9cad0','none')+circle(49,13,2,'#c3b2ca'),64,'#293c36')],
  ['texture-metal-wire', '花丝编线', ['filigree-metal'], repeat(line('<path d="M0 8q8-8 16 0t16 0M0 24q8-8 16 0t16 0M8 0q-8 8 0 16t0 16M24 0q-8 8 0 16t0 16"/>',gold,1),32,'#ede3ca')],
  ['texture-ink-wash', '淡墨晕层', ['yuan-literati', 'qing-eccentric-ink'], rect(0,0,256,256,paper)+path('M0 110q53-53 104-24t152-30v124q-66 36-133-8T0 192Z','#d3d7c8','none')+path('M0 159q58-29 125-2t131-43v76q-55 34-143 9T0 228Z','#b8c4b5','none')],
];

function interfaceBase(body: string): string {
  return rect(0,0,480,320,paper)+rect(16,16,448,288,'#faf7ed',8, '#a5b49f')+body;
}
const chip = (x: number, y: number, w: number, color = jade) => rect(x,y,w,7,color,3);
const tile = (x: number,y: number,w: number,h: number) => rect(x,y,w,h,'#eee9d9',5,'#b5bfaa');
const interfaceItems: Item[] = [
  ['interface-inventory', '漆色道具栏', ['han-lacquer'], interfaceBase(rect(16,16,448,39,ink,8)+chip(35,32,90,gold)+Array.from({length:12},(_,i)=>tile(35+(i%6)*67,75+Math.floor(i/6)*85,55,67)+circle(62+(i%6)*67,105+Math.floor(i/6)*85,14,i%3===0?red:i%3===1?jade:gold)).join('')+chip(35,266,172)+rect(339,259,104,28,red,5))],
  ['interface-dialogue', '宋景对话窗', ['southern-song'], interfaceBase(path('M24 192 91 68l60 89 56-64 69 99Z','#b9c8b3','none')+circle(380,80,25,'#dbc095')+rect(34,213,412,70,'#f5f0e1',6,ink)+circle(65,248,19,jade)+chip(100,232,83,red)+chip(100,250,313)+chip(100,266,255))],
  ['interface-quest-scroll', '长卷任务册', ['five-dynasties-narrative'], interfaceBase(rect(36,34,103,253,ink,4)+chip(52,52,69,gold)+[85,119,153,187,221].map(y=>chip(52,y,64,'#a6baa0')).join('')+chip(162,47,171,red)+[85,139,193].map((y,i)=>circle(178,y+9,11,i===0?red:jade)+chip(200,y,216)+chip(200,y+18,170,'#adb8a5')).join('')+rect(320,254,111,27,red,5))],
  ['interface-map', '青绿山水地图', ['blue-green-landscape'], interfaceBase(path('M27 229 81 91l56 97 61-142 55 96 68-77 97 164Z','#96b0a0','none')+path('M72 286q11-89 101-71t105-79q20-30 80-73','none','#f5ecce',8)+[ [92,210],[181,208],[270,156],[348,89] ].map(([x,y],i)=>circle(x,y,10,i===0?red:paper,ink)).join('')+rect(31,32,96,31,paper,4,ink)+chip(44,44,66)+rect(357,241,91,49,paper,5,ink)+chip(370,255,61)+chip(370,274,43))],
  ['interface-skill-tree', '玉系技能树', ['warring-states-jade'], interfaceBase(line('<path d="M242 68v66m0 0-126 61m126-61 126 61m-126-61v124M116 195l-44 60m44-60 51 60m201-60-51 60m51-60 42 60"/>',jade,2)+[ [242,58],[242,134],[116,195],[368,195],[242,258],[72,255],[167,255],[317,255],[410,255] ].map(([x,y],i)=>circle(x,y,17,i<3?jade:paper,ink)+circle(x,y,6,i<3?paper:gold)).join(''))],
  ['interface-battle-hud', '皮影战斗界面', ['shadow-puppetry'], interfaceBase(path('M24 199q53-21 106-2t96-5 106-2 124-7v121H24Z','#d3c2a4','none')+rect(35,36,152,11,red,5)+rect(35,54,117,7,blue,3)+circle(62,259,25,'none',ink)+circle(62,259,8,jade)+[ [336,262,21],[391,262,23],[424,210,15] ].map(([x,y,r])=>circle(x,y,r,red,ink)).join('')+path('M221 235 245 189l13 41-14 10Z',ink,'none')+rect(188,47,119,4,gold,2))],
  ['interface-codex', '木版图鉴页', ['woodblock'], interfaceBase(tile(35,41,152,237)+line('<path d="M60 231 106 87l51 144ZM80 170h57m-64 32h73"/>',ink,3)+chip(207,46,181,red)+chip(207,77,224)+chip(207,96,204)+chip(207,115,213)+chip(207,147,164)+chip(207,166,224)+chip(207,185,201)+chip(207,218,77,gold)+chip(300,218,99,gold)+rect(207,249,222,28,ink,5))],
  ['interface-shop', '青花物品铺', ['blue-white'], interfaceBase(chip(34,35,92,blue)+rect(339,29,105,23,'#e2e8db',5)+[ [36,74],[174,74],[312,74] ].map(([x,y],i)=>tile(x,y,130,159)+path(`M${x+46} ${y+26}h36v22q18 12 20 38v29h-76V86q2-26 20-38Z`,i===1?'#a7bcaa':'#dae1d9',blue,2)+chip(x+18,y+133,90,blue)).join('')+chip(38,255,135)+rect(311,254,130,29,blue,5))],
  ['interface-onboarding', '园林引导页', ['garden'], interfaceBase('<circle cx="240" cy="119" r="71" fill="none" stroke="'+jade+'" stroke-width="5"/>'+path('M171 138q18-27 51-17t43-9 45 19v40H170Z','#bdcbb7','none')+chip(159,210,162,ink)+chip(139,229,202)+[207,240,273].map((x,i)=>circle(x,257,4,i===0?red:'#b7bfaa')).join('')+rect(355,266,82,26,red,5))],
  ['interface-dashboard', '宋瓷数据面板', ['song-ceramics'], interfaceBase(chip(35,35,162,ink)+[ [35,70],[180,70],[325,70] ].map(([x,y])=>tile(x,y,120,69)+chip(x+14,y+13,45)+chip(x+14,y+36,77,ink)).join('')+tile(35,157,263,130)+line('<path d="m50 261 35-32 32 13 34-54 37 21 39-28 54 17"/>',jade,3)+tile(315,157,130,130)+'<circle cx="380" cy="222" r="41" fill="none" stroke="#c2cebd" stroke-width="15"/><path d="M380 181a41 41 0 1 1-39 55" fill="none" stroke="'+jade+'" stroke-width="15"/>')],
  ['interface-reading', '隶意阅读器', ['han-clerical'], interfaceBase(chip(34,36,80,red)+chip(163,51,155,ink)+[83,100,117,134,166,183,200,217].map((y,i)=>chip(61,y,i===3||i===7?264:350,'#8e9b87')).join('')+rect(50,245,380,1,'#c2c7b6')+circle(67,274,9,jade)+chip(89,271,164)+rect(345,262,78,22,ink,4))],
  ['interface-music', '琴音播放器', ['ming-furniture'], interfaceBase(rect(42,42,174,220,ink,8)+line('<path d="M67 85h125m-125 20h125m-125 20h125m-125 20h125m-125 20h125m-125 20h125m-125 20h125"/>',gold,1.3)+circle(129,234,9,gold)+chip(247,63,179,ink)+chip(247,86,138)+rect(245,136,182,3,'#bec8b4')+rect(245,136,107,3,red)+circle(352,137,6,red)+circle(335,191,26,jade)+path('M329 180v22l18-11Z',paper,'none')+path('M259 182v18l-15-9Zm143 0v18l15-9Z',ink,'none'))],
  ['interface-portfolio', '吴门作品集', ['ming-wu-school'], interfaceBase(chip(33,35,109,ink)+[ [35,73,132,106],[177,73,132,166],[319,73,126,106],[35,189,132,90],[319,189,126,90] ].map(([x,y,w,h],i)=>tile(x,y,w,h)+path(`M${x+7} ${y+h-20}l${w/3} -${h*.6} ${w/3} ${h*.35} ${w/3-14} -${h*.25}v${h*.5}H${x+7}Z`,i%2?jade:'#b9c7ad','none')).join('')+chip(183,254,118,red))],
  ['interface-calendar', '篆印日历', ['seal-carving'], interfaceBase(chip(35,35,118,red)+line('<path d="M35 77h410M35 111h410M35 145h410M35 179h410M35 213h410M35 247h410M35 77v204m58-204v204m58-204v204m58-204v204m58-204v204m58-204v204m58-204v204m62-204v204"/>','#bbc5b0',1)+rect(213,149,49,27,red,4)+[ [60,94],[118,94],[176,94],[234,94],[292,94],[350,94],[409,94] ].map(([x,y])=>circle(x,y,3,ink)).join('')+circle(237,163,4,paper)+circle(118,196,6,jade))],
  ['interface-settings', '楷序设置页', ['tang-regular'], interfaceBase(chip(36,36,119,ink)+[76,125,174,223].map((y,i)=>chip(36,y,127)+chip(36,y+16,186,'#b4bfac')+rect(380,y-2,62,25,i<2?jade:'#d5d9cb',13)+circle(i<2?429:393,y+10,9,paper)).join('')+line('<path d="M34 111h410M34 160h410M34 209h410M34 258h410"/>','#d2d8c8',1))],
  ['interface-character-card', '唐绘人物卡', ['tang-figure'], interfaceBase(tile(34,37,172,244)+circle(120,96,28,'#d4ab83')+path('M119 124q-55 3-57 112h114q-2-112-57-112Z','#b96646','none')+path('M88 81q1-42 32-39 33 2 34 39-29-14-66 0Z',ink,'none')+chip(231,43,148,red)+chip(231,66,188)+[101,145,189].map(y=>chip(231,y,76,ink)+rect(231,y+17,196,8,'#d4dcca',4)+rect(231,y+17,y===101?171:y===145?125:152,8,jade,4)).join('')+rect(231,246,195,30,red,6))],
];

const propItems: Item[] = [
  ['prop-lacquer-box', '漆木方盒', ['han-lacquer'], path('M35 82 128 42l93 40v113l-93 36-93-36Z',red,ink,3)+path('M35 82 128 120l93-38-93-40Z','#31473c',ink,3)+line('<path d="M128 120v111M35 105l93 38 93-38M52 123l56 22v61l-56-23Zm96 24 54-22v59l-54 22Z"/>',gold,2)],
  ['prop-relief-plaque', '刻线石牌', ['han-relief'], rect(31,29,194,198,'#b9baa5',8,ink)+rect(42,40,172,176,'none',0,ink)+path('M59 177h135l-21-30-22 11-23-80-20 68-20-18Z','#748a76','none')+circle(171,71,17,'#a8ae8f')+line('<path d="M66 197h123M67 64h62m-62 15h39"/>',ink,2)],
  ['prop-bronze-vessel', '兽面方壶', ['bronze-taotie'], path('M91 31h74v35l33 32v118H58V98l33-32Z','#8b8255',ink,3)+line('<path d="M82 31h92M58 111h140M58 191h140M86 125h20v20H86Zm64 0h20v20h-20ZM116 125h24v40h-24ZM78 166h30v14H78Zm70 0h30v14h-30Z"/>','#b3a477',3)],
  ['prop-inlay-bird', '错金鸟形饰件', ['bronze-inlay'], path('M39 192q17-93 91-106l-6-26 15-21 28 12-14 16 3 28q66 13 63 42-35-20-56 6-14 56-124 49Z','#515d42',ink,3)+line('<path d="M56 180q52-60 100-60M64 183q48-33 93-40M153 96l-9 67M132 119l-7 39M57 148l31 14m-20-34 37 22"/>',gold,2)+circle(141,54,3,gold)],
  ['prop-cong', '节面玉琮', ['liangzhu-jade'], path('M54 69 128 34l74 35v139l-74 25-74-25Z','#bdc9ad',jade,3)+path('M54 69 128 102l74-33-74-35Z','#d0d8bc',jade,3)+line('<path d="M128 102v131M54 116l74 29 74-29M54 161l74 29 74-29M68 131l45 17m30-2 46-17M68 178l45 17m30-2 46-17"/>',jade,2)+'<ellipse cx="128" cy="69" rx="29" ry="13" fill="#779881" stroke="'+jade+'" stroke-width="3"/>'],
  ['prop-jade-dragon', '弧形玉龙饰', ['hongshan-jade'], path('M166 45q-97-28-123 68-19 79 59 112 71 23 116-39-38 33-90 14-57-30-34-91 25-45 70-29l18 16 30-16-23-41Z','#a9bc99',jade,3)+circle(175,68,4,ink)],
  ['prop-openwork-pendant', '透雕玉佩', ['warring-states-jade'], '<path d="M128 22 228 128 128 234 28 128Zm0 33-25 29 25 30 25-30Zm-42 45-26 28 26 28 25-28Zm84 0-25 28 25 28 26-28Zm-42 46-25 29 25 28 25-28Z" fill="'+jade+'" fill-rule="evenodd"/>'+circle(128,38,4,paper)],
  ['prop-eaves-tile', '卷云瓦当', ['han-eaves-tile'], circle(128,128,103,'#b9b8a0',ink)+circle(128,128,89,'none',ink)+circle(128,128,13,ink)+[0,90,180,270].map(a=>`<g transform="rotate(${a} 128 128)">${line('<path d="M128 105q-45-54-63-8-8 27 20 26 21 0 9-19"/>',ink,5)}</g>`).join('')],
  ['prop-sancai-horse', '三彩立马', ['tang-sancai'], path('M47 118q42-37 98-19l8-58 27-12 33 20-12 28-31-10 3 71-15 11-5 65h-16l-1-68h-44l-11 68H66l5-76-24-21Z','#b8894a',ink,3)+path('M156 43l20-9 18 14-8 15-18-5-3 71-16 3Z','#7e9b65','none')+path('M73 107q35-16 66 2l-10 27H87Z','#dfcf9e','none')+line('<path d="M48 119q-16-13-17 22M171 66l17 13"/>',ink,4)],
  ['prop-cizhou-pillow', '磁州枕', ['song-cizhou'], path('M36 108q92-40 184 0v48q-92 30-184 0Z','#d9d0b8',ink,3)+'<ellipse cx="128" cy="108" rx="92" ry="28" fill="#eee6ce" stroke="'+ink+'" stroke-width="3"/>'+line('<path d="M72 118q49-28 116-7M119 107l-10-13m39 11 16 16M99 115q-11-17-26-10 4 16 26 10m55-9q10-17 27-10-6 16-27 10M48 153q80 17 160 0"/>',ink,2.5)],
  ['prop-celadon-vase', '龙泉弦纹瓶', ['longquan-celadon'], path('M104 26h48v90q45 14 43 80v35H61v-35q-2-66 43-80Z','#a8c5ad',jade,3)+line('<path d="M99 27h58M98 72h60M97 94h62M83 140h90M68 200h120M68 211h120"/>',jade,2)],
  ['prop-jun-planter', '钧色花盆', ['jun-glaze'], path('M42 58h172l-19 140q-67 24-134 0Z','#8da6b9',blue,3)+'<ellipse cx="128" cy="58" rx="86" ry="23" fill="#b9bdd0" stroke="'+blue+'" stroke-width="3"/>'+path('M82 81q-12 60 36 108l55-4q-36-72-26-103Z','#b69cac','none')+line('<path d="M56 204h144l-12 19H68Z"/>',blue,3)],
  ['prop-white-ewer', '白瓷执壶', ['dehua-porcelain'], path('M93 72q-30 32-30 89t58 70q67-4 61-72-5-50-32-87V38H93Z','#e9e5d2',ink,3)+path('M150 83q73-37 67 34-2 20-36 35M75 112 37 86l-7-31q42 14 56 43','none',ink,5)+line('<path d="M86 37h73M75 214h94"/>',ink,2)],
  ['prop-bluewhite-jar', '青花盖罐', ['blue-white'], path('M91 52h74q41 36 41 99v65H50v-65q0-63 41-99Z','#e8ecde',blue,3)+path('M81 48q47-19 94 0M82 47l10-15h72l12 15M118 26h20v6','none',blue,3)+line('<path d="M59 174q26-45 60-10t76-4M96 161q-11-24-27-20 3 27 27 20m60 12q3-25 27-29 7 27-27 29M66 93h124M58 201h140"/>',blue,2.5)],
  ['prop-rose-plate', '粉彩花盘', ['qing-famille-rose'], circle(128,128,102,'#ede8d7',gold)+circle(128,128,83,'none',gold)+line('<path d="M82 190q18-61 98-104m-58 47-17-43m46 32 37 17"/>',jade,3)+[ [108,91,13],[181,85,18],[186,139,11] ].map(([x,y,r])=>circle(x,y,r,'#d7a397')+circle(x,y,r*.35,gold)).join('')],
  ['prop-garden-rock', '庭石', ['garden'], path('M33 225 53 178l-14-39 45-27 16-57 41-29 25 43-19 28 56 45-13 47 35 36Z','#9baa96',ink,3)+path('M115 71q-21 21-10 36 25 11 31-17Zm36 58q-25 4-24 22 21 15 36-4ZM73 162q-19 14-6 30 22 4 26-15Z',paper,ink,2)],
  ['prop-ming-chair', '明式靠背椅', ['ming-furniture'], line('<path d="M59 219V66q69-52 138 0v153M49 155h158v16H49ZM67 66v83m122-83v83M114 40v105h27V40M60 182h136M78 170l-6 53m105-53 6 53M60 205h136"/>','#8c6649',7)+line('<path d="M121 69h13m-13 28h13m-13 26h13"/>',gold,2)],
  ['prop-cloisonne-censer', '珐琅香炉', ['cloisonne'], path('M65 86h126v61q-7 62-63 62-56 0-63-62Z','#427781',gold,4)+path('M71 84q57-56 114 0M113 43h30M91 202l-8 24m82-24 8 24M65 108q-42-15-39 17 4 24 41 19m124-36q42-15 39 17-4 24-41 19','none',gold,4)+line('<path d="M81 160q24-38 47 0t47 0M90 124q14-19 26 0m23 0q12-19 26 0"/>',gold,2)],
  ['prop-pearl-cabinet', '螺钿小柜', ['mother-of-pearl-lacquer'], rect(40,40,176,166,ink,4,gold)+rect(48,48,160,72,'none',0,gold)+rect(48,128,160,68,'none',0,gold)+line('<path d="M128 48v148M53 206v22m150-22v22"/>',gold,3)+[ [85,84],[171,84],[85,162],[171,162] ].map(([x,y])=>path(`M${x} ${y-18}l7 12 13 6-13 7-7 12-7-12-13-7 13-6Z`,'#b9ced0','none')).join('')+circle(119,113,3,gold)+circle(138,113,3,gold)],
  ['prop-filigree-hairpin', '花丝簪', ['filigree-metal', 'tang-figure'], line('<path d="M102 95 64 233m51-130L84 236M106 103q-57-12-45-44 4-13 24-5-10-37 19-38 25 0 20 36 24-14 31 1 19 33-49 50Z"/>',gold,3)+line('<path d="M106 98V31m-1 45L76 60m31 17 37-17M96 89l-21-4m41 5 25-7"/>',gold,1.5)+circle(104,49,7,'#bc7366')],
];

const horizon = (body: string) => rect(0,0,480,300,paper)+body;
const pavilion = (x: number,y: number,s = 1,color = ink) => `<g transform="translate(${x} ${y}) scale(${s})">${path('M0 29 38 0l38 29Z',color,'none')}${line('<path d="M8 29v47m19-47v47m25-47v47m16-47v47M0 76h76"/>',color,3)}</g>`;
const roofHouse = (x: number,y: number,w: number,h: number) => rect(x,y,w,h,'#f1efe2')+path(`M${x-7} ${y}l${w/2+7} -24 ${w/2+7} 24Z`,ink,'none')+rect(x+w*.4,y+h*.45,w*.2,h*.55,'#61786a');
const sceneItems: Item[] = [
  ['scene-bluegreen-ridges', '青绿叠嶂', ['blue-green-landscape'], horizon(path('M0 213 72 84l59 95 82-143 65 125 73-79 129 131v87H0Z','#a0baa6','none')+path('M0 258 93 163l68 86 75-100 62 73 77-84 105 137v25H0Z','#4f8c7f','none')+path('M0 282q82-60 151-30t169-12 160 39v21H0Z','#315e59','none')+circle(363,53,21,'#ceae69')+path('M268 300q-15-41-46-64t-23-42','none','#e6d8ad',10))],
  ['scene-southern-river', '南宋江岸', ['southern-song'], horizon(circle(345,66,27,'#dfd3ac')+path('M0 212q27-89 85-118l61 81 62 8 31 39H0Z','#637b69','none')+path('M0 224h480v76H0Z','#d5dfd1','none')+line('<path d="M173 247h204m-113 19h149M42 270h116"/>','#a3b9ad',1)+path('M271 234h49l-9 9h-32Z',ink,'none')+line('<path d="M294 236v-22m-9 16 18-8"/>',ink,1.5))],
  ['scene-birdflower-courtyard', '花鸟庭院', ['song-bird-flower'], horizon(path('M0 249q142-28 252-4t228 1v54H0Z','#cbd3be','none')+line('<path d="M65 283q34-116 113-223M100 202l-59-68m88 16 92-10M144 120l-29-48"/>',ink,6)+[ [51,139],[120,72],[185,64],[212,141] ].map(([x,y])=>circle(x,y,9,'#c79077')+circle(x,y,3,gold)).join('')+path('M285 191q27-22 52-1l-8 21h-34Z',ink,'none')+path('M304 201q-5-40 14-49l21 8-19 8 8 31Z','#e5e5ce','none')+line('<path d="M307 211v44m15-44 5 44m-29 0h18m6 0h18"/>',ink,2))],
  ['scene-dunhuang-hall', '壁画色石窟', ['dunhuang'], horizon(rect(0,0,480,300,'#d4b484')+path('M59 282V122Q59 29 240 17q181 12 181 105v160Z','#b5714e','none')+path('M91 271V131q0-73 149-91 149 18 149 91v140Z','#5f7e75','none')+circle(240,118,55,'#d7b773')+path('M213 140q-14 39-48 91h150q-34-52-49-91Z','#ad5842','none')+circle(240,123,22,'#dec69a')+path('M118 273h244l-20 15H138Z',gold,'none')+line('<path d="M116 82q49-37 85-35m78 0q51 1 85 35M70 136v112m341-112v112"/>',gold,3))],
  ['scene-garden-moon', '月洞见庭', ['garden'], horizon(rect(0,0,480,300,'#e0dfcf')+'<circle cx="244" cy="158" r="118" fill="'+paper+'" stroke="'+ink+'" stroke-width="8"/>'+path('M129 222q49-41 98-15t133-16v80H129Z','#adbea7','none')+pavilion(223,132,.75)+path('M163 265q58-24 85-61','none','#e8dfc3',13)+line('<path d="M35 289h410M36 278h408"/>',ink,3))],
  ['scene-woodblock-town', '版画小镇', ['woodblock'], horizon(path('M0 217 62 166l43 31 80-69 64 40 77-61 154 112v81H0Z','#c2cbb4','none')+roofHouse(46,184,92,59)+roofHouse(187,149,100,82)+roofHouse(328,170,107,63)+line('<path d="M17 267h446M44 277h416M24 287h411M154 240v-56m13 48v-72m144 87v-73"/>',ink,2))],
  ['scene-literati-bank', '文人疏岸', ['yuan-literati'], horizon(path('M0 253q65-49 132-6t146-8 202 8v53H0Z','#b9c7b5','none')+line('<path d="M71 268q16-56 5-107M77 207l-30-38m32 14 35-41m-38 16-5-39M43 172l-15-14m22 19-8-24m69-9 10-11"/>',ink,5)+path('M335 253h38l-8 8h-22Z',ink,'none')+line('<path d="M247 241h61m67-9h59"/>','#97afa2',1))],
  ['scene-wu-school-study', '吴门书斋', ['ming-wu-school', 'ming-furniture'], horizon(rect(74,77,300,186,'#e3dec9')+path('M60 77 225 24l163 53Z','#536c5e','none')+rect(86,92,99,102,'#bdcbb5')+line('<path d="M86 126h99m-66-34v102m33-102v102"/>',ink,3)+rect(221,151,123,11,'#8e7152')+line('<path d="M234 162v73m96-73v73M216 234h132"/>','#8e7152',5)+rect(272,122,39,26,'#eadfbc')+path('M0 279q75-37 144-15t124-1 212 5v32H0Z','#b2c1a8','none'))],
  ['scene-ink-bamboo', '扬州竹雨', ['qing-eccentric-ink'], horizon(line('<path d="M118 300 167 33m-21 125-63-51m57 93 66-56M321 300l-41-211m27 142 53-57m-61 20-58-28"/>',ink,8)+path('M83 111q-62-9-60-45 51 6 60 45Zm78-67q34-42 67-32-16 40-67 32Zm38 103q65-44 90-23-22 39-90 23Zm160 30q61-8 70-38-53-2-70 38Zm-114-11q-52-12-54-43 44 4 54 43Z',jade,'none')+line('<path d="m22 183 22-57m190 123 13-49m149-3 18-60"/>','#b4c1b0',1))],
  ['scene-jiehua-palace', '界画台阁', ['jiehua-architecture'], horizon(path('M22 288h436v-32H22Z','#b9c4ae','none')+rect(101,142,278,115,'#d5c49c')+path('M77 141 240 72l163 69Z',jade,ink,2)+rect(137,69,206,45,'#c69d79')+path('M112 68 240 16l128 52Z',jade,ink,2)+line('<path d="M115 149v97m45-97v97m52-97v97m56-97v97m52-97v97m45-97v97M98 209h284M90 248h302M95 267h292M69 277h342M157 74v33m47-33v33m72-33v33m47-33v33"/>',ink,3))],
  ['scene-huizhou-lane', '徽州巷道', ['huizhou-dwellings'], horizon(path('M0 93h131v207H0ZM349 93h131v207H349Z','#dddccc','none')+path('M0 92V65h27V42h26V20h48v23h30v49M349 92V45h26V23h52v22h26v21h27v26','none',ink,5)+path('M131 300V171h62v-59h95v59h61v129Z','#f0ecde','none')+path('M172 111h136l-68-36Z',ink,'none')+path('M150 300h180l-70-86h-40Z','#c2c4b3','none')+line('<path d="M0 276h131m218 0h131M37 145h45v63H37Zm363 0h42v63h-42Z"/>',ink,3))],
  ['scene-dougong-workshop', '木构工坊', ['dougong-timber'], horizon(rect(35,65,410,28,'#9d7251')+rect(63,93,24,191,'#9d7251')+rect(393,93,24,191,'#9d7251')+line('<path d="M35 118h410M44 145h122v-26H97V93m217 0v26h-68v26h189M151 92v66m178-66v66"/>','#6e5642',13)+rect(110,214,260,14,'#bd9570')+line('<path d="M126 228v55m227-55v55"/>','#6e5642',8)+path('M172 188h28v26h-28Zm51-31h37v57h-37Zm71 31h26v26h-26Z','#dbc9a1',ink,2))],
  ['scene-newyear-market', '年画集市', ['new-year-prints'], horizon(path('M0 259q92-34 168-10t138-4 174 9v46H0Z','#ddc498','none')+rect(48,128,137,117,'#c79062')+path('M31 128 117 81l88 47Z',red,'none')+rect(296,102,137,143,'#c79062')+path('M278 102 365 53l87 49Z',blue,'none')+line('<path d="M185 105q51-58 112-28"/>',ink,2)+[ [211,89],[244,79],[279,83] ].map(([x,y])=>rect(x-8,y,16,24,red,5)+path(`M${x} ${y+24}v9`,'none',gold,2)).join('')+rect(72,170,89,8,ink)+rect(315,149,98,8,ink)+circle(230,222,15,'#c1916d')+path('M210 277v-37q18-27 40 0v37Z',jade,'none'))],
  ['scene-paper-cut-forest', '剪纸林野', ['paper-cut'], horizon(rect(0,0,480,300,'#f2e1be')+path('M34 274V122L13 90l31 10V39l18 9v73l35-19-28 51v121Zm141 0V91l-31-24 43 10V24l20 11v58l31-12-31 44v149Zm149 0V99l-34-24 44 6V22l20 11v97l43-26-33 59v111Z',red,'none')+path('M0 274q80-39 145-11t148-8 187 19v26H0Z',red,'none')+path('M411 48l10 21 23 3-17 17 4 23-20-11-20 11 4-23-17-17 23-3Z',red,'none'))],
  ['scene-shadow-stage', '皮影戏台', ['shadow-puppetry'], horizon(rect(0,0,480,300,'#dcc095')+rect(19,19,442,262,'#f3ddb4',0,red)+path('M0 0h480v50q-28 22-55 0-28 22-55 0-29 22-55 0-29 22-55 0-29 22-55 0-29 22-55 0-29 22-55 0-29 22-40 0Z',red,'none')+path('M127 270V178l33-31 29 10 16 43-19 18-13-32-17 5 8 79Zm-5-116q-18-28 9-40 22-9 29 14-2 21-38 26ZM280 269l9-89 33-19 25 28-12 12-15-18-14 9 13 77Z',ink,'none')+circle(310,137,20,ink)+line('<path d="M178 204 245 167M300 202l-35 42"/>',ink,4))],
  ['scene-tang-procession', '唐绘行旅', ['tang-figure'], horizon(rect(0,230,480,70,'#d9caac')+path('M0 225q64-31 117-12t128-4 235 12','none','#c7c4a7',12)+([ [76,142,red],[163,134,jade],[258,143,blue],[364,136,'#a8895f'] ] as [number, number, string][]).map(([x,y,c])=>circle(x,y,14,'#d3aa80')+path(`M${x-12} ${y+16}q-16 29-27 78h78q-9-49-27-78Z`,c,'none')+path(`M${x-17} ${y-3}q-1-25 17-24 19-1 18 24Z`,ink,'none')).join('')+line('<path d="M218 65h195m-158 11h133"/>','#b8b6a0',1))],
];

const tileableTextures = new Set(['texture-paper-fibers','texture-paper-flecks','texture-silk-warp','texture-brocade-weave','texture-indigo-grain','texture-russet-lacquer','texture-bronze-speckle','texture-inlay-dashes','texture-jade-mottling','texture-cong-stone','texture-bluewhite-speckles','texture-timber-grain','texture-stone-stipple','texture-tile-roof','texture-pearl-dark','texture-metal-wire']);
const appInterfaces = new Set(['interface-onboarding','interface-dashboard','interface-reading','interface-music','interface-portfolio','interface-calendar','interface-settings']);

export const materials: LibraryMaterial[] = [
  ...iconItems.map(item => material('icon',item,144,144,true)),
  ...patternItems.map(item => material('pattern',item,256,256,false,true)),
  ...frameItems.map(item => material('frame',item,512,384,true)),
  ...textureItems.map(item => material('texture',item,256,256,false,tileableTextures.has(item[0]))),
  ...interfaceItems.map(item => material('interface',item,480,320,false)),
  ...propItems.map(item => material('prop',item,256,256,true)),
  ...sceneItems.map(item => material('scene',item,480,300,false)),
];

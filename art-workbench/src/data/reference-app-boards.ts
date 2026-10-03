import type { ReferenceBoard } from './material-types';
import interfaces from '../assets/reference-app-interfaces.png';
import patterns from '../assets/reference-app-patterns.png';
import materials from '../assets/reference-app-materials.png';
import folkIcons from '../assets/reference-app-folk-icons.png';

/** Original modern study boards, downloadable as whole PNGs; not isolated production sprites. */
export const appReferenceBoards: ReferenceBoard[] = [
  {
    id: 'ref-app-interfaces',
    name: '宋瓷与版刻 · 六种 App 界面构图',
    category: 'interface',
    description: '阅读、仪表盘、日历、园林地图、器物目录、预约表单六种构图。观察细线分层、瓷色状态、克制的朱红动作和留白；整板为现代界面参考图，图中文字与印形是示意，控件不可直接编辑。',
    traditionIds: ['song-ceramics', 'woodblock', 'garden', 'longquan-celadon'],
    tags: ['App', '阅读', '仪表盘', '日历', '地图', '目录', '表单', '界面构图', '整板 PNG', '现代学习图'],
    image: interfaces,
    filename: 'guanwu-reference-app-interfaces.png',
  },
  {
    id: 'ref-app-patterns',
    name: '青铜至蓝印 · 九种纹样节奏',
    category: 'pattern',
    description: '青铜兽面转译、错金几何、瓦当云鸟、锦织花卉、缂丝花鸟、蓝印草叶、剪纸花蝶、现代水纹线刻实验、青花缠枝九种现代纹样研究。比较密度、轴线、穿插与负形；浅青灰水纹是新的制作实验，不用它证明古代木版的典型样式。整板各格不承诺无缝衔接。',
    traditionIds: ['bronze-taotie', 'bronze-inlay', 'han-eaves-tile', 'song-brocade', 'kesi-weaving', 'indigo-resist', 'paper-cut', 'woodblock', 'blue-white'],
    tags: ['游戏', 'App', '纹样', '织物', '青铜', '蓝印', '剪纸', '青花', '水纹', '九宫格', '整板 PNG', '现代学习图'],
    image: patterns,
    filename: 'guanwu-reference-app-patterns.png',
  },
  {
    id: 'ref-app-materials',
    name: '玉、漆、丝、纸 · 九种材质近景',
    category: 'prop',
    description: '玉石、青铜、织锦、纸与墨、黑红漆、青瓷、硬木、园林石、青花釉面九种物性研究。看透光、纤维、凹凸、反射和纹理尺度；整板为现代渲染参考，非 PBR 贴图包，也不证明某件古物的真实釉裂或工序。',
    traditionIds: ['warring-states-jade', 'bronze-inlay', 'song-brocade', 'calligraphy', 'han-lacquer', 'longquan-celadon', 'ming-furniture', 'garden', 'blue-white'],
    tags: ['游戏', 'App', '材质', '玉', '青铜', '丝', '纸', '漆', '瓷', '木', '石', '物性参考', '整板 PNG', '现代学习图'],
    image: materials,
    filename: 'guanwu-reference-app-materials.png',
  },
  {
    id: 'ref-app-folk-icons',
    name: '民艺与小图形 · 九组图标语言',
    category: 'interface',
    description: '年画鱼虎、剪纸花蝶、皮影构件、青铜几何功能符号、玉雕小形、青花花月、抽象朱印、版刻分隔、螺钿花章九组图形语言。研究同组线重、边缘与轮廓层级；整板为原创现代参考，朱印不表示经过校勘的汉字，非透明独立图标包。',
    traditionIds: ['new-year-prints', 'paper-cut', 'shadow-puppetry', 'bronze-inlay', 'warring-states-jade', 'blue-white', 'seal-carving', 'woodblock', 'mother-of-pearl-lacquer'],
    tags: ['游戏', 'App', '民艺', '小图形', '图标语言', '年画', '剪纸', '皮影', '印章', '分隔线', '螺钿', '整板 PNG', '现代学习图'],
    image: folkIcons,
    filename: 'guanwu-reference-app-folk-icons.png',
  },
];

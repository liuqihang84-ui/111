import type { ReferenceBoard } from './material-types';
import characters from '../assets/reference-game-characters.png';
import scenes from '../assets/reference-game-scenes.png';
import props from '../assets/reference-game-props.png';
import architecture from '../assets/reference-game-architecture.png';

// These are whole-board original contemporary visual studies. The cells are
// reference examples, not independent production sprites or historical records.
export const gameReferenceBoards: ReferenceBoard[] = [
  {
    id: 'reference-game-characters',
    name: '人物百业 · 8 种职业与轮廓研究',
    category: 'character',
    description: '药师、陶匠、礼乐师、书生、漆工、茶坊主人、渡水信使与琵琶乐师。比较年龄、姿态、衣料层次、佩具与人物轮廓；原创设定混合多种中国工艺视觉线索，不是朝代服饰复原图。下载为整张参考 PNG，未拆成透明角色或动画。',
    traditionIds: ['tang-figure', 'silk-embroidery', 'indigo-resist', 'song-brocade', 'han-lacquer', 'bronze-taotie'],
    tags: ['角色', '职业', '药师', '陶匠', '乐师', '书生', '漆工', '茶坊', '信使', '服装', '轮廓', '道具', '原创参考'],
    image: characters,
    filename: 'reference-game-characters.png',
  },
  {
    id: 'reference-game-scenes',
    name: '人间八景 · 城市、自然与室内',
    category: 'scene',
    description: '晨间水街、黄土驿道、书斋、灯会夜市、沿海盐沼、竹林石阶、陶窑工坊与雪中客栈。比较空间深度、天气、时段、材料及聚焦方式。原创环境视觉开发，整图可下载；不是可直接铺设的游戏地图或无缝地形贴图。',
    traditionIds: ['southern-song', 'blue-green-landscape', 'yuan-literati', 'ming-wu-school', 'huizhou-dwellings', 'garden', 'jiehua-architecture'],
    tags: ['场景', '城市', '水街', '山路', '书斋', '夜市', '盐沼', '竹林', '窑场', '冬景', '室内', '昼夜', '原创参考'],
    image: scenes,
    filename: 'reference-game-scenes.png',
  },
  {
    id: 'reference-game-props',
    name: '九材九器 · 材质与器物形制',
    category: 'prop',
    description: '青铜容器、玉璧与佩件、漆盒、木制文具匣、青花扁壶、青瓷碗、绣囊、珐琅盒及皮影。对照金属氧化、玉的透度、漆面高光、木纹、釉色、绣线与镂空结构。原创混合设计，整图供造型参考，不对应某件馆藏文物，也不是独立透明道具素材。',
    traditionIds: ['bronze-taotie', 'warring-states-jade', 'han-lacquer', 'ming-furniture', 'blue-white', 'longquan-celadon', 'silk-embroidery', 'cloisonne', 'shadow-puppetry'],
    tags: ['器物', '道具', '青铜', '玉器', '漆器', '木器', '青花', '青瓷', '刺绣', '珐琅', '皮影', '材料', '原创参考'],
    image: props,
    filename: 'reference-game-props.png',
  },
  {
    id: 'reference-game-architecture',
    name: '营造九式 · 建筑与空间模块',
    category: 'architecture',
    description: '民居庭院、徽式店铺、木构门楼、廊桥、月洞门小园、陶窑工坊、水榭、坡地茶屋与架空粮仓。俯视斜角对照入口、围合、台基、屋顶与通行层次。原创游戏空间研究，整图可下载，不是历史建筑测绘、施工图、3D 模型或已切分的地图块。',
    traditionIds: ['dougong-timber', 'huizhou-dwellings', 'garden', 'jiehua-architecture', 'architectural-polychrome'],
    tags: ['建筑', '空间', '庭院', '店铺', '门楼', '廊桥', '月洞门', '工坊', '水榭', '茶屋', '粮仓', '轴测', '地图构成', '原创参考'],
    image: architecture,
    filename: 'reference-game-architecture.png',
  },
];

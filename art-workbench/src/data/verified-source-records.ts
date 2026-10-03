import type { SourceReference } from '../types';

// Object-level official HTML records actually read in this session.
// Verified source records do not independently authenticate artworks or certify image licences.
export const verifiedSourceRecords: Record<string, Pick<SourceReference,
  'title' | 'institution' | 'url' | 'period' | 'medium' | 'note' | 'checkedAt'
>> = {
  "thousand-li": {
    "title": "王希孟千里江山图卷",
    "institution": "故宫博物院",
    "url": "https://www.dpm.org.cn/collection/paint/228354.html",
    "period": "北宋；蔡京跋记政和三年（1113）赐图，馆方将同年完成说为可能",
    "medium": "绢本设色手卷",
    "note": "已核馆方北宋王希孟归属、绢本设色及51.5×1191.5厘米；正文讨论分段山势由桥、水连接。1113来自蔡京赐图跋記，馆方称可能即完成年代；未独立鉴定、未测颜料或确认图片许可。",
    "checkedAt": "2026-10-04T00:00:36+08:00"
  },
  "river-pavilions": {
    "title": "传李思训《江帆楼阁图》轴（馆方登记：唐李思訓江帆樓閣 軸）",
    "institution": "国立故宫博物院，台北",
    "url": "https://digitalarchive.npm.gov.tw/Collection/Detail/14?dep=P",
    "period": "登记沿旧签归唐李思训；馆方正文亦载北宋徽宗画院仿作判断",
    "medium": "绢本设色挂轴",
    "note": "已核馆方登记和归属说明：此幅无作者款印，依旧签定名；另据服饰、建筑推为北宋仿作，故保留“传”。正文载勾廓、青绿渲染及不见皴笔；不将数据库作者栏当唐代真迹证明。来源文字：国立故宫博物院，台北，CC BY 4.0 @ www.npm.gov.tw。",
    "checkedAt": "2026-10-03T23:59:17+08:00"
  },
  "spring-path": {
    "title": "名繪集珍 冊 宋馬遠山徑春行",
    "institution": "国立故宫博物院，台北",
    "url": "https://digitalarchive.npm.gov.tw/Collection/Detail/14633?dep=P",
    "period": "南宋；作者为光宗、宁宗朝画院待诏马远",
    "medium": "绢本册页，《名绘集珍》册第十三幅",
    "note": "已核绢本、27.4×43.1厘米、马远款及宋宁宗题诗说明。正文分别分析偏置物象、斧劈皴与柔长柳条；只说明此幅，不能概括全部南宋。来源文字：国立故宫博物院，台北，CC BY 4.0 @ www.npm.gov.tw。",
    "checkedAt": "2026-10-03T23:59:17+08:00"
  },
  "ma-yuan-water": {
    "title": "马远水图卷",
    "institution": "故宫博物院",
    "url": "https://www.dpm.org.cn/collection/paint/229607.html",
    "period": "南宋；馆方归属为马远，未作独立作者鉴定",
    "medium": "绢本淡设色卷，共十二段",
    "note": "已核馆方正式品名为卷，正文“马远绘”、绢本淡设色、十二段；第一段残缺半幅无图名，其余十一段有各自水势名。只核馆方归属及说明，不独立断代；不能把十二段合成一张通用水纹。",
    "checkedAt": "2026-10-04T00:00:37+08:00"
  },
  "lotus-bloom": {
    "title": "出水芙蓉图页",
    "institution": "故宫博物院",
    "url": "https://www.dpm.org.cn/collection/paint/229940.html",
    "period": "宋代；本幅无款，旧题吴炳绘无据",
    "medium": "绢本设色纨扇页",
    "note": "已核宋、纨扇页、绢本设色及23.8×25厘米；馆方明确“本幅无款”“旧题吴炳绘，无据”。正文说莲瓣不见勾勒、类似后世没骨法；不为匿名画补作者，也不将工笔花鸟全部等同深墨描边。",
    "checkedAt": "2026-10-04T00:00:36+08:00"
  },
  "ding-ware": {
    "title": "定窑白釉孩儿枕",
    "institution": "故宫博物院",
    "url": "https://www.dpm.org.cn/collection/ceramic/226760.html",
    "period": "宋代（具体条目未细定北宋年份）",
    "medium": "白釉瓷，人物塑形、印花等装饰",
    "note": "已核馆方宋代定窑白釉孩儿枕：孩儿背作枕面，长衣印团花、榻面开光纹，牙白釉，底素胎无釉并有两气孔。此件说明宋瓷有复杂塑形与装饰，未核同来源原先包含的其他定窑刻花器。",
    "checkedAt": "2026-10-04T00:00:36+08:00"
  },
  "jian-bowl": {
    "title": "建阳窑黑釉兔毫盏",
    "institution": "故宫博物院",
    "url": "https://www.dpm.org.cn/collection/ceramic/227154.html",
    "period": "宋代；未从外观推断更细断代",
    "medium": "黑釉瓷、兔毫纹结晶釉",
    "note": "已核馆方宋代建阳窑黑釉兔毫盏：敛口、深弧腹、圈足，内满釉、外壁不到底、近底露胎，黑釉有放射状黄褐条纹。仅核此件及馆方材料解释，不能由图片推断古代烧成配方。",
    "checkedAt": "2026-10-04T00:00:37+08:00"
  },
  "ru-basin": {
    "title": "汝窯 青瓷無紋水仙盆",
    "institution": "国立故宫博物院，台北",
    "url": "https://digitalarchive.npm.gov.tw/Collection/Detail/34?dep=U",
    "period": "北宋，11世纪晚期至12世纪初（馆方时代栏）",
    "medium": "青瓷，无开片釉面",
    "note": "已核馆方时代、椭圆侈口深壁、四云头足、底六支钉痕；明确“沒有開片”。乾隆御题与木座是后期典藏层，器名不自动证明原始用途；照片色不作釉色测量。来源文字：国立故宫博物院，台北，CC BY 4.0 @ www.npm.gov.tw。",
    "checkedAt": "2026-10-03T23:59:18+08:00"
  },
  "yongle-cup": {
    "title": "青花压手杯（花心）",
    "institution": "故宫博物院",
    "url": "https://www.dpm.org.cn/collection/ceramic/226717.html",
    "period": "明永乐（馆方条目）",
    "medium": "青花瓷，釉下彩",
    "note": "已核明永乐、4.9厘米高、9.2厘米口径，口微撇、折腰、丰底、圈足；内葵花心年款，外口朵梅、腹缠枝莲，胎厚低重心与持握相关。另件缠枝莲压手杯仍为永乐，不能混到宣德样本；未下载馆藏图。",
    "checkedAt": "2026-10-04T00:00:35+08:00"
  },
  "mogao-254": {
    "title": "莫高窟第254窟（主室南壁等定位研究）",
    "institution": "敦煌研究院·数字敦煌",
    "url": "https://www.e-dunhuang.com/cave/10.0001/0001.0001.0254",
    "period": "始建北魏；甬道北壁另存隋代画",
    "medium": "洞窟壁画、彩塑与建筑空间",
    "note": "已核官方窟页北魏建窟、中心塔柱式及壁面定位：南壁前部有降魔变、西侧萨埵舍身饲虎本生；北壁另有难陀因缘、尸毗王本生。甬道存隋画，部分影塑残损熏黑；建窟年代不等于全部壁画和现状色的年代。",
    "checkedAt": "2026-10-04T00:00:38+08:00"
  },
  "mogao-172": {
    "title": "莫高窟第172窟（主室南、北壁观无量寿经变）",
    "institution": "敦煌研究院·数字敦煌",
    "url": "https://www.e-dunhuang.com/cave/10.0001/0001.0001.0172",
    "period": "盛唐建窟；研究主室南北壁经变，宋画与清重修另列",
    "medium": "壁画、洞窟空间；存在后世重绘及塑像重修",
    "note": "已核官方窟页盛唐建窟、覆斗顶、南北壁各一铺观无量寿经变及建筑空间说明。同页载西壁龛塑像清重修，东壁下部、甬道与前室多有宋画；只限定主室南或北壁主样本，不将整窟混称盛唐资源。",
    "checkedAt": "2026-10-04T00:00:39+08:00"
  }
};

/**
 * 勤廉典型示范厅：中国古今廉洁文化与勤廉事迹（人物内容见《勤廉示例.docx》）。
 * 画框类型 kind：scroll（卷轴左文右图）、mixed（上图下文）、side（图侧文侧，imageSide 切换左右）。
 * 每块展板均预留 image 字段：填图片路径后弹窗与画框显示图片，为 null 时显示占位图。
 * layout 为展厅墙面坐标：wall 所在墙，x/z 为画框中心，y 为离地高度，w/h 为画框尺寸（米）。
 * 各展板 w/h 按人物图片宽高比定制（竖像用竖框、横像用横框），保证画像完整不变形。
 */
import imgYangZhen from '@/assets/exhibition/lianjie/杨震.png'
import imgBaoZheng from '@/assets/exhibition/lianjie/包拯.webp'
import imgYuQian from '@/assets/exhibition/lianjie/于谦.png'
import imgHaiRui from '@/assets/exhibition/lianjie/海瑞.webp'
import imgLuJi from '@/assets/exhibition/lianjie/陆绩.jpg'
import imgJiaoYulu from '@/assets/exhibition/lianjie/焦裕禄.webp'
import imgZhangFuqing from '@/assets/exhibition/lianjie/张富清.jpg'

export const modelPanels = [
  {
    id: 'model-bao-zheng',
    kind: 'scroll',
    image: imgBaoZheng,
    title: '包拯 · 不持一砚归',
    shortTitle: '包 拯',
    years: '999 — 1062 · 北宋',
    category: '古代廉吏',
    summary: '端州任满不持一砚归，掷砚成洲传佳话',
    quote: { text: '后世子孙仕宦，有犯赃滥者，不得放归本家。', from: '包拯家训' },
    meta: [
      { label: '朝代', value: '北宋' },
      { label: '身份', value: '端州知州、开封府尹' },
      { label: '关键词', value: '铁面无私' },
    ],
    sections: [
      {
        heading: '不持一砚',
        body: '北宋包拯任端州知州。端州盛产端砚，前任知州借进贡之名超额征收数十倍，用以贿赂权贵。包拯到任后，按朝廷规定额度征收，既解民困，又绝不染指一方。',
      },
      {
        heading: '掷砚成洲',
        body: '任满离境时，随从暗中收下砚工赠送的一方名砚。船出羚羊峡，包拯得知后将砚掷入江中，江面顿时风平浪静，掷砚处后来形成砚洲岛。他立下三十七字家训，从此「包家子孙不得为赃官」。',
      },
    ],
    source: '据《宋史·包拯传》等公开史料整理',
    layout: { wall: 'back', x: -1.8, y: 2.25, w: 1.7, h: 1.9 },
  },
  {
    id: 'model-hai-rui',
    kind: 'scroll',
    image: imgHaiRui,
    title: '海瑞 · 备棺死谏',
    shortTitle: '海 瑞',
    years: '1514 — 1587 · 明',
    category: '古代廉吏',
    summary: '冒死上《治安疏》，清贫终身，人称「海青天」',
    quote: { text: '宁鸣而死，不默而生。', from: '范仲淹《灵乌赋》，海瑞以之自况' },
    meta: [
      { label: '朝代', value: '明' },
      { label: '身份', value: '南京右都御史、应天巡抚' },
    ],
    sections: [
      {
        heading: '布衣蔬食',
        body: '海瑞，字刚峰，海南琼山人，为官三十余载始终刚正不阿、清苦自守。淳安任上穿布袍、吃粗粮，让老仆在衙门空地种菜自给；为母祝寿破例买两斤肉，竟成官场奇闻。总督胡宗宪之子过境敲诈银两，被他当场没收、通报上司。',
      },
      {
        heading: '备棺死谏',
        body: '嘉靖四十四年，海瑞眼看朝政败坏、民不聊生，冒死上《治安疏》直斥皇帝。上疏前自备棺材、遣散家仆、与家人诀别，在朝堂静候治罪。嘉靖读罢大怒却又叹服：「此人可比比干。」',
      },
      {
        heading: '清风遗物',
        body: '巡抚应天时，海瑞颁布《督抚宪约》严限接待标准，铁腕追退豪强霸占的民田，贪官闻风解印。1587年病逝，遗物仅余俸银十余两、破葛帐一顶，丧事靠同僚凑钱办妥。百姓沿街白衣白帽，哭送百里。',
      },
    ],
    source: '据《明史·海瑞传》等公开史料整理',
    layout: { wall: 'back', x: 1.8, y: 2.25, w: 1.7, h: 1.9 },
  },
  {
    id: 'model-yang-zhen',
    kind: 'side',
    image: imgYangZhen,
    title: '杨震 · 四知拒金',
    category: '古代廉吏',
    summary: '暮夜却金，清白传家，人称「四知太守」',
    quote: { text: '天知，神知，我知，子知。何谓无知！', from: '杨震暮夜却金' },
    meta: [
      { label: '朝代', value: '东汉' },
      { label: '身份', value: '东莱太守' },
    ],
    sections: [
      {
        heading: '四知拒金',
        body: '东汉名臣杨震赴任东莱太守，途经昌邑。昔日被他举荐的县令王密感念知遇之恩，深夜怀金十斤登门相赠，并低声说：「暮夜无知者。」杨震正色道：「天知，神知，我知，子知，何谓无知！」王密羞愧而退。',
      },
      {
        heading: '清白传家',
        body: '杨震任内「性公廉，不受私谒」。子孙粗茶淡饭、安步当车，亲朋劝他为子孙置办产业，他说：「使后世称为清白吏子孙，以此遗之，不亦厚乎。」后人尊称他为「四知太守」。',
      },
    ],
    source: '据《后汉书·杨震传》等公开史料整理',
    layout: { wall: 'left', z: -2.95, y: 2.3, w: 2.2, h: 2.05 },
  },
  {
    id: 'model-lu-ji',
    kind: 'mixed',
    image: imgLuJi,
    title: '陆绩 · 廉石压舱',
    category: '古代廉吏',
    summary: '任满归乡两袖清风，唯以巨石压舱传世',
    meta: [
      { label: '朝代', value: '三国·吴' },
      { label: '身份', value: '郁林太守' },
    ],
    sections: [
      {
        heading: '廉石压舱',
        body: '陆绩任郁林太守期间清正廉洁，轻徭薄赋、兴修水利，深得百姓爱戴。辞官回乡时，历代太守离任都满载宝物，而陆绩行李只有几箱旧衣和书籍。船太轻遇风浪易翻，囊中羞涩的他便请人将岸边一块七八百斤重的大石头搬上船压舱。',
      },
      {
        heading: '廉石传世',
        body: '回到苏州后，陆绩将这块石头立在门前，取名「郁林石」。明代监察御史樊祉敬仰其廉洁，将石头移至察院场，刻上「廉石」二字。如今这块廉石仍陈列在苏州文庙明伦堂前，成为千年廉洁象征。',
      },
    ],
    source: '据《三国志·吴书·陆绩传》等公开史料整理',
    layout: { wall: 'left', z: -0.65, y: 2.3, w: 1.6, h: 2.05 },
  },
  {
    id: 'model-yu-qian',
    kind: 'mixed',
    image: imgYuQian,
    title: '于谦 · 两袖清风',
    category: '古代廉吏',
    summary: '进京不带一物，唯留两袖清风',
    quote: {
      text: '绢帕麻菇与线香，本资民用反为殃。清风两袖朝天去，免得闾阎话短长。',
      from: '于谦《入京》',
    },
    meta: [
      { label: '朝代', value: '明' },
      { label: '身份', value: '兵部尚书' },
    ],
    sections: [
      {
        heading: '两袖清风',
        body: '明代名臣于谦身处官场腐败之世，始终「上不贿要，下不纳赂」。彼时宦官王振专权，各地官员进京奏事都要带「土特产」孝敬权贵，于谦每次入京两手空空。同僚劝他带点土特产，他举起双袖一笑：「吾惟有清风而已。」遂作《入京》一诗明志。',
      },
      {
        heading: '名节重泰山',
        body: '于谦写下「名节重泰山，利欲轻鸿毛」，一生日用节俭，「所居仅蔽风雨」。夺门之变后含冤遇害，抄家时「家无余资，萧然仅书籍耳」。',
      },
    ],
    source: '据《明史·于谦传》等公开史料整理',
    layout: { wall: 'left', z: 1.3, y: 2.3, w: 1.5, h: 1.5 },
  },
  {
    id: 'model-jiao-yulu',
    kind: 'side',
    image: imgJiaoYulu,
    title: '焦裕禄 · 心中装着人民',
    category: '时代楷模',
    summary: '治沙治碱为人民，唯独没有他自己',
    quote: { text: '我是你们的儿子。', from: '焦裕禄访贫问苦时语' },
    meta: [
      { label: '身份', value: '河南兰考县委书记' },
      { label: '时间', value: '1962—1964年在兰考' },
    ],
    sections: [
      {
        heading: '临危受命',
        body: '1962年，焦裕禄临危受命赴河南兰考。兰考饱受风沙、内涝、盐碱「三害」之苦，十万人外出逃荒。在任475天，他骑着自行车跑遍全县120多个大队，风沙最大时往风里跑，大雨最急时往雨里钻。',
      },
      {
        heading: '清贫一生',
        body: '他一生清贫：一条被子有42个补丁，褥子36个补丁，藤椅被肝痛顶出一个大洞。他立下干部「十不准」，批评儿子「看白戏」，拒绝为女儿「走后门」。临终唯一要求是「把我运回兰考，埋在沙丘上，看着兰考人民把沙丘治好」。',
      },
    ],
    source: '据新华社、《人民日报》公开报道整理',
    layout: { wall: 'right', z: -1.03, y: 2.25, w: 2.5, h: 1.8 },
  },
  {
    id: 'model-zhang-fuqing',
    kind: 'side',
    imageSide: 'right',
    image: imgZhangFuqing,
    title: '张富清 · 深藏功名',
    category: '时代楷模',
    summary: '军功章锁进皮箱六十余载，一辈子清贫干净',
    quote: { text: '想起牺牲的战友，我有什么资格显摆自己。', from: '张富清接受采访时语' },
    meta: [
      { label: '身份', value: '原建行来凤支行干部' },
      { label: '荣誉', value: '共和国勋章获得者' },
    ],
    sections: [
      {
        heading: '赫赫战功',
        body: '张富清是战斗英雄。战争年代，他立下赫赫战功：一等功三次、特等功一次，两次荣获「战斗英雄」称号。',
      },
      {
        heading: '深藏功名',
        body: '1955年转业，他把军功章锁进旧皮箱，一锁就是六十多年。组织问想去哪里，他说「哪里最苦就去哪里」，一头扎进鄂西来凤县的深山。在来凤，他带头探岩洞、打炮眼，修出水渠、电站、公路；住的是旧房，用的是补丁被，一辈子没向组织提过任何要求。',
      },
      {
        heading: '沉默一生',
        body: '2018年退役军人信息采集，子女才第一次看见那箱军功章。面对镜头，他说：「和我一起冲锋的战友，好多都没回来。我活着，就是替他们看这太平日子。」一辈子清贫，一辈子沉默，一辈子干净。',
      },
    ],
    source: '据新华社、《人民日报》公开报道整理',
    layout: { wall: 'right', z: 1.83, y: 2.25, w: 2.5, h: 1.8 },
  },
]

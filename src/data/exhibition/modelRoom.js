/**
 * 勤廉典型示范厅：中国古今廉洁文化与勤廉事迹。
 * 画框类型 kind：text（纯文字/名言）、image（图片为主，预留 image 字段）、mixed（图文）。
 * layout 为展厅墙面坐标：wall 所在墙，x/z 为画框中心，y 为离地高度，w/h 为画框尺寸（米）。
 */
export const modelPanels = [
  {
    id: 'model-bao-zheng',
    kind: 'scroll',
    image: null,
    title: '包拯 · 明镜高悬',
    shortTitle: '包 拯',
    years: '999 — 1062 · 北宋',
    category: '古代廉吏',
    summary: '清心为治本，直道是身谋',
    meta: [
      { label: '朝代', value: '北宋' },
      { label: '身份', value: '开封府尹、监察御史' },
      { label: '关键词', value: '铁面无私' },
    ],
    sections: [
      {
        heading: '刚正不阿',
        body: '包拯（999—1062），北宋名臣，历任监察御史、开封府尹等职。一生刚正不阿、不避权贵，民间称「包青天」，成为后世清官廉吏的象征。',
      },
      {
        heading: '家训传世',
        body: '包拯立下家训：「后世子孙仕宦，有犯赃滥者，不得放归本家；亡殁之后，不得葬于大茔之中。」以铁的家风约束子孙清廉自守，世代传颂。',
      },
    ],
    source: '据《宋史·包拯传》等公开史料整理',
    layout: { wall: 'right', z: -1.78, y: 2.25, w: 1.85, h: 1.5 },
  },
  {
    id: 'model-hai-rui',
    kind: 'scroll',
    image: null,
    title: '海瑞 · 备棺上疏',
    shortTitle: '海 瑞',
    years: '1514 — 1587 · 明',
    category: '古代廉吏',
    summary: '冒死进谏，清贫终身，人称「海青天」',
    meta: [
      { label: '朝代', value: '明' },
      { label: '身份', value: '应天巡抚、南京吏部右侍郎' },
    ],
    sections: [
      {
        heading: '备棺上疏',
        body: '嘉靖四十五年（1566年），海瑞买好一口棺材、诀别妻子，上《治安疏》直斥朝政得失，冒死进谏，震动朝野。',
      },
      {
        heading: '清贫终身',
        body: '海瑞为官数十年始终清贫自守，去世时仅存俸银十余两、旧衣数件，连丧葬费用都靠同僚凑集。百姓闻之，罢市相送，白衣送葬者沿江百里不绝。',
      },
    ],
    source: '据《明史·海瑞传》等公开史料整理',
    layout: { wall: 'right', z: 1.43, y: 2.25, w: 1.85, h: 1.5 },
  },
  {
    id: 'model-yu-qian',
    kind: 'calligraphy',
    title: '于谦 · 两袖清风',
    category: '名言警句',
    summary: '进京不带一物，唯留两袖清风',
    quote: { text: '粉骨碎身浑不怕，要留清白在人间。', from: '于谦《石灰吟》' },
    meta: [
      { label: '朝代', value: '明' },
      { label: '身份', value: '兵部尚书' },
    ],
    sections: [
      {
        heading: '两袖清风',
        body: '于谦巡抚河南、山西十九年，进京议事从不携带任何土特产送礼，作诗明志：「绢帕蘑菇与线香，本资民用反为殃。清风两袖朝天去，免得闾阎话短长。」',
      },
      {
        heading: '清白传世',
        body: '夺门之变后于谦含冤遇害，抄家时「家无余资，萧然仅书籍耳」。《石灰吟》中「要留清白在人间」一句，成为后世廉洁自守的千古名句。',
      },
    ],
    source: '据《明史·于谦传》等公开史料整理',
    layout: { wall: 'left', z: -3.4, y: 2.3, w: 0.95, h: 2.3 },
  },
  {
    id: 'model-yu-chenglong',
    kind: 'text',
    title: '于成龙 · 天下廉吏第一',
    category: '古代廉吏',
    summary: '日食粗粝「于青菜」，病逝笥中惟一袍',
    meta: [
      { label: '朝代', value: '清' },
      { label: '身份', value: '两江总督' },
      { label: '评价', value: '康熙誉「天下廉吏第一」' },
    ],
    sections: [
      {
        heading: '苦行廉吏',
        body: '于成龙（1617—1684）初任广西罗城知县，与民同甘共苦；后官至两江总督，仍日食粗粝、终年不知肉味，百姓称之「于青菜」。',
      },
      {
        heading: '遗物萧然',
        body: '于成龙病逝于任上，遗物仅「绨袍一袭、床头盐豉数器」。士民闻讯罢市巷哭，康熙皇帝破例亲撰碑文，誉其为「天下廉吏第一」。',
      },
    ],
    source: '据《清史稿·于成龙传》等公开史料整理',
    layout: { wall: 'back', x: -1.75, y: 2.2, w: 1.7, h: 1.45 },
  },
  {
    id: 'model-jiao-yulu',
    kind: 'mixed',
    image: null,
    title: '焦裕禄 · 心中装着人民',
    category: '时代楷模',
    summary: '治沙治碱为人民，唯独没有他自己',
    meta: [
      { label: '身份', value: '河南兰考县委书记' },
      { label: '时间', value: '1962—1964年在兰考' },
    ],
    sections: [
      {
        heading: '兰考岁月',
        body: '焦裕禄（1922—1964）在兰考带领群众战风沙、治盐碱、斗内涝，肝病发作时以硬物顶住肝部坚持工作。「心中装着全体人民，唯独没有他自己。」',
      },
      {
        heading: '干部十不准',
        body: '焦裕禄亲自主持制定《干部十不准》，不准干部看白戏、搞特殊化，不准挥霍浪费集体资财。他以家风和制度双重约束，树立了共产党人清正廉洁的标杆。',
      },
    ],
    source: '据新华社、《人民日报》公开报道整理',
    layout: { wall: 'back', x: 1.7, y: 2.2, w: 1.7, h: 1.45 },
  },
  {
    id: 'model-kong-fansen',
    kind: 'mixed',
    image: null,
    title: '孔繁森 · 雪域高原铸忠诚',
    category: '时代楷模',
    summary: '两度援藏，遗物仅八元六角',
    meta: [
      { label: '身份', value: '西藏阿里地委书记' },
      { label: '经历', value: '1979、1988年两度援藏' },
    ],
    sections: [
      {
        heading: '爱的最高境界',
        body: '「一个共产党员爱的最高境界是爱人民。」孔繁森（1944—1994）两度进藏工作，把工资大半用于资助藏族群众，自己省吃俭用，收养两名藏族孤儿。',
      },
      {
        heading: '遗物清单',
        body: '1994年孔繁森因公殉职，遗物是8元6角钱和一份关于发展阿里经济的12条建议。他把生命与清廉一同留在了雪域高原。',
      },
    ],
    source: '据新华社、《人民日报》公开报道整理',
    layout: { wall: 'back', x: 3.45, y: 2.1, w: 1.3, h: 2.5 },
  },
  {
    id: 'model-gu-wenchang',
    kind: 'text',
    title: '谷文昌 · 不带私心搞革命',
    category: '时代楷模',
    summary: '十四载锁住风沙，荒岛变绿洲',
    meta: [
      { label: '身份', value: '福建东山县委书记' },
      { label: '时间', value: '1950年代起主政东山十四年' },
    ],
    sections: [
      {
        heading: '治沙丰碑',
        body: '谷文昌（1915—1981）带领东山人民苦战十四载，植树造林、锁住风沙，把「神仙都难治」的荒岛变成绿洲，百姓称颂「先祭谷公，后祭祖宗」。',
      },
      {
        heading: '清白家风',
        body: '「不带私心搞革命，一心一意为人民。」谷文昌从不为家人谋取私利，子女招工、爱人转正从不打招呼，把「清白持家、简朴本分」留作最好的家风。',
      },
    ],
    source: '据新华社、《人民日报》公开报道整理',
    layout: { wall: 'left', z: -1.9, y: 2.3, w: 1.8, h: 1.45 },
  },
  {
    id: 'model-zhang-boxing',
    kind: 'calligraphy',
    title: '张伯行 · 一丝一粒',
    category: '名言警句',
    summary: '《禁止馈送檄》，天下第一清官',
    quote: { text: '一丝一粒，我之名节；一厘一毫，民之脂膏。', from: '张伯行《禁止馈送檄》' },
    meta: [
      { label: '朝代', value: '清' },
      { label: '身份', value: '江苏巡抚、礼部尚书' },
    ],
    sections: [
      {
        heading: '禁止馈送檄',
        body: '康熙年间，张伯行出任江苏巡抚，发布《禁止馈送檄》明令杜绝官场馈赠：「宽一分，民受赐不止一分；取一文，我为人不值一文。」',
      },
      {
        heading: '第一清官',
        body: '张伯行一生操守清廉、实心任事，被康熙皇帝誉为「天下第一清官」。一篇檄文立界，一生名节无瑕。',
      },
    ],
    source: '据《清史稿·张伯行传》整理',
    layout: { wall: 'left', z: 0.2, y: 2.3, w: 0.95, h: 2.3 },
  },
  {
    id: 'model-yang-shanzhou',
    kind: 'mixed',
    image: null,
    title: '杨善洲 · 大亮山的绿色丰碑',
    category: '时代楷模',
    summary: '退休造林二十二年，林场无偿献国家',
    meta: [
      { label: '身份', value: '云南保山地委书记（退休）' },
      { label: '事迹', value: '义务植树22年，建成5.6万亩林场' },
    ],
    sections: [
      {
        heading: '绿了荒山',
        body: '杨善洲（1927—2010）退休后放弃进城安享晚年，扎根大亮山义务植树22年，建成面积5.6万亩、价值逾3亿元的林场，临终前无偿移交国家。',
      },
      {
        heading: '白了头发',
        body: '「只要生命不结束，服务人民不停止。」他住油毛毡棚、捡果核育苗，却从未向组织提过任何个人要求，用一生诠释共产党人的公仆本色。',
      },
    ],
    source: '据新华社、《人民日报》公开报道整理',
    layout: { wall: 'left', z: 1.3, y: 2.3, w: 1.6, h: 1.45 },
  },
]

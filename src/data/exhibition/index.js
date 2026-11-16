import { modelPanels } from './modelRoom'
import { warningPanels } from './warningRoom'

/**
 * 廉洁展馆展厅定义：纯前端静态数据，无后端依赖。
 * - id/name/seal/subtitle：展厅标识与牌匾
 * - accent：展厅主题色（门框高亮、贴图主色）
 * - theme：展板风格 parchment（米白宣纸）/ crimson（暗红警示）
 * - prefaceLayout：前言竖版落位（暗红落地竖版）
 * - decals：墙面廉洁元素贴画（竹子/莲花/梅花/徽章/贯穿线/反思弧）
 * - panels：墙面展板（含 layout 布局坐标，见各展厅文件注释）
 */
export const exhibitionRooms = [
  {
    id: 'model',
    name: '勤廉典型示范厅',
    seal: '廉',
    subtitle: '见贤思齐 · 清风润心',
    accent: '#3f5c4a',
    theme: 'parchment',
    preface:
      '修身齐家，廉为政本。本厅撷取古今勤廉典范七则：从杨震「四知拒金」、陆绩「廉石压舱」、包拯「不持一砚归」、于谦「两袖清风」、海瑞「备棺死谏」，到焦裕禄「心中装着人民」的公仆情怀、张富清「深藏功名」的赤子之心。愿观者见贤思齐，以清为美、以廉为荣，让清风正气浸润心田。',
    prefaceLayout: { wall: 'back', x: -3.6, y: 2.3, w: 1.4, h: 3.4 },
    doorLayout: { wall: 'left', z: 3.35 },
    decals: [
      { type: 'plum', wall: 'left', z: 3.35, y: 3.6, w: 0.95, h: 0.95 },
      {
        type: 'redband',
        wall: 'right',
        z: -3.3,
        y: 2.3,
        w: 1.3,
        h: 3.3,
        title: '古贤清风',
        subtitle: '传统廉洁人物故事',
        body: '以史为镜，可以知兴替；以人为镜，可以明得失。古往今来，无数仁人志士以清廉自守、以公正为民，留下了宝贵的精神财富。',
      },
      { type: 'relief', wall: 'back', x: 0, y: 2.3, w: 1.1, h: 1.1 },
      {
        type: 'timeline',
        wall: 'back',
        x: 3.6,
        y: 2.3,
        w: 1.1,
        h: 2.2,
        title: '廉政制度沿革',
        items: [
          { label: '唐', text: '《唐律疏议》严惩赃罪' },
          { label: '宋', text: '台谏制度监督百官' },
          { label: '元', text: '肃政廉访司巡行纠察' },
          { label: '明', text: '《大明律》重典治贪' },
          { label: '清', text: '密折制度纠察吏治' },
        ],
      },
      { type: 'bamboo', wall: 'right', z: 3.7, y: 2.2, w: 0.5, h: 1.8 },
    ],
    panels: modelPanels,
  },
  {
    id: 'warning',
    name: '违纪违法案例警示厅',
    seal: '警',
    subtitle: '以案为鉴 · 警钟长鸣',
    accent: '#9e2b25',
    theme: 'crimson',
    preface:
      '蠹众而木折，隙大而墙坏。本厅选取公开宣判、公开通报的违纪违法典型案件：薄熙来、赖小民等「大老虎」获重判，彰显反腐败无禁区、全覆盖、零容忍；冯疆、古学进、周彦倜等群众身边和国企金融领域的「蝇贪」「蛀虫」被查处，警示围猎风险、小微权力失管之害。愿观者以案为鉴、以案明纪，知敬畏、存戒惧、守底线。',
    prefaceLayout: { wall: 'left', z: 2.25, y: 2.3, w: 1.6, h: 3.2 },
    decals: [
      { type: 'emblem', wall: 'left', z: 3.7, y: 2.3, w: 1.0, h: 1.0 },
      { type: 'fallline', wall: 'left', z: -1.2, y: 3.13, w: 2.2, h: 0.9 },
      { type: 'mirror', wall: 'back', x: 0.4, y: 2.35, w: 1.5, h: 1.5 },
      { type: 'wallline', wall: 'back', x: 0, y: 1.9, w: 8.4, h: 2.63 },
      { type: 'wallline', wall: 'left', z: 0, y: 1.9, w: 8.4, h: 2.63, dashes: [415, 1048] },
      { type: 'wallline', wall: 'right', z: 0, y: 1.9, w: 8.4, h: 2.63, dashes: [868] },
      { type: 'crack', wall: 'right', z: -3.2, y: 3.65, w: 1.3, h: 1.3 },
      { type: 'doorstrip', wall: 'right', z: 1.9, y: 3.65, w: 2.2, h: 0.55 },
    ],
    panels: warningPanels,
  },
]

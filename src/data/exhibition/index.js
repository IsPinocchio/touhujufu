import { modelPanels } from './modelRoom'
import { warningPanels } from './warningRoom'

/**
 * 廉洁展馆展厅定义：纯前端静态数据，无后端依赖。
 * - id/name/seal/subtitle：展厅标识与牌匾
 * - accent：展厅主题色（门框高亮、贴图主色）
 * - theme：展板风格 parchment（米白宣纸）/ crimson（暗红警示）
 * - prefaceLayout：前言竖版落位（暗红落地竖版）
 * - centerpiece：中央装置（bell = 悬挂警钟）
 * - decals：墙面廉洁元素贴画（竹子/莲花/梅花/徽章/利剑）
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
      '修身齐家，廉为政本。本厅撷取古今勤廉典范九则：从于谦「两袖清风」的操守、包拯「清心直道」的家风，到焦裕禄「心中装着人民」的公仆情怀、杨善洲荒山植绿的赤子之心。愿观者见贤思齐，以清为美、以廉为荣，让清风正气浸润心田。',
    prefaceLayout: { wall: 'back', x: -3.6, y: 2.3, w: 1.4, h: 3.4 },
    doorLayout: { wall: 'left', z: 3.35 },
    decals: [
      { type: 'emblem', wall: 'back', x: 0, y: 2.3, w: 1.3, h: 1.3 },
      { type: 'plum', wall: 'left', z: 3.35, y: 3.6, w: 0.95, h: 0.95 },
      {
        type: 'redband',
        wall: 'right',
        z: -3.54,
        y: 2.3,
        w: 1.3,
        h: 3.3,
        title: '古贤清风',
        subtitle: '传统廉洁人物故事',
        body: '以史为镜，可以知兴替；以人为镜，可以明得失。古往今来，无数仁人志士以清廉自守、以公正为民，留下了宝贵的精神财富。',
      },
      { type: 'relief', wall: 'right', z: -0.18, y: 2.35, w: 0.84, h: 0.84 },
      {
        type: 'walltitle',
        wall: 'right',
        z: -0.45,
        y: 3.75,
        w: 2.6,
        h: 0.75,
        title: '古贤清风',
        subtitle: '清廉自守 · 公正为民',
      },
      {
        type: 'timeline',
        wall: 'right',
        z: 3.09,
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
      { type: 'bamboo', wall: 'right', z: 3.97, y: 2.2, w: 0.5, h: 1.8 },
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
    centerpiece: 'bell',
    preface:
      '蠹众而木折，隙大而墙坏。本厅选取近年来公开宣判的违纪违法典型案件：「打虎」无禁区，周永康、赖小民等纷纷落马；「拍蝇」零容忍，魏鹏远、马超群等「小官巨贪」难逃法网。愿观者以案为鉴、以案明纪，知敬畏、存戒惧、守底线。',
    prefaceLayout: { wall: 'left', z: 2.0, y: 2.3, w: 1.6, h: 3.2 },
    decals: [
      { type: 'emblem', wall: 'left', z: 3.65, y: 2.3, w: 1.1, h: 1.1 },
      { type: 'sword', wall: 'right', z: 1.9, y: 3.55, w: 0.9, h: 0.9 },
    ],
    panels: warningPanels,
  },
]

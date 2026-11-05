/**
 * 三个壶的配色主题（与壶类型解耦）
 * 每轮随机把主题分配给 corrupt/edge/clean，防止玩家记住「绿色=廉洁壶」等固定规律。
 * 仅含 SVG 壶体颜色；选项文字与蓄力条配色沿用各组件内的同名 CSS 类（--copper/--slate/--green）。
 */
export const POT_COLORS = {
  copper: {
    bodyFrom: '#c08a4a',
    bodyTo: '#6b3a1f',
    rim: '#3a2412',
    mouthFill: '#241205',
    accent: '#e6b860',
  },
  slate: {
    bodyFrom: '#7a8ba0',
    bodyTo: '#45566b',
    rim: '#232d38',
    mouthFill: '#10161d',
    accent: '#a8bcd0',
  },
  green: {
    bodyFrom: '#5f7f68',
    bodyTo: '#2f4638',
    rim: '#17241c',
    mouthFill: '#0c1410',
    accent: '#8fb39a',
  },
}

// 主题键名列表（洗牌用）
export const COLOR_KEYS = Object.keys(POT_COLORS)

import { partyKnowledge } from '../knowledge'
import { scenes } from '../touhu/scenes'

const culturePanelDefs = [
  {
    id: 'culture-gifts',
    knowledgeIndex: 0,
    summary: '心存戒惧，守住礼品礼金的第一道关口',
  },
  {
    id: 'culture-dining',
    knowledgeIndex: 1,
    summary: '饭局有界限，拒绝可能影响公正履职的宴请',
  },
  {
    id: 'culture-procurement',
    knowledgeIndex: 5,
    summary: '公开公平公正，让采购在阳光下运行',
  },
]

const culturePanels = culturePanelDefs.map((panel) => {
  const knowledge = partyKnowledge[panel.knowledgeIndex]
  return {
    id: panel.id,
    type: 'knowledge',
    category: '清风课堂',
    title: knowledge.title,
    summary: panel.summary,
    body: knowledge.body,
  }
})

const warningPanelDefs = [
  {
    sceneId: 'SC001',
    title: '一张购物卡',
    summary: '看似平常的心意，可能成为失守底线的开始',
  },
  {
    sceneId: 'SC002',
    title: '被定制的参数',
    summary: '技术参数不能成为特定供应商的“入场券”',
  },
  {
    sceneId: 'SC006',
    title: '亲属账户的返点',
    summary: '变换收款方式，掩盖不了利益输送的本质',
  },
]

const warningPanels = warningPanelDefs.map((panel) => {
  const scene = scenes.find((item) => item.id === panel.sceneId)
  return {
    id: `warning-${scene.id.toLowerCase()}`,
    type: 'case',
    category: scene.category,
    title: panel.title,
    summary: panel.summary,
    scene: scene.scene,
    correct: scene.options.find((option) => option.pot === 'clean').text,
    body: scene.hint,
    source: scene.id,
  }
})

export const exhibitionRooms = [
  {
    id: 'culture',
    name: '清风文化厅',
    seal: '清',
    subtitle: '明纪知止 · 清风润心',
    description: '从日常履职中的礼品、宴请与采购边界入手，学纪、知纪、明纪、守纪。',
    accent: '#3f5c4a',
    panels: culturePanels,
  },
  {
    id: 'warning',
    name: '警示教育厅',
    seal: '警',
    subtitle: '以案为鉴 · 警钟长鸣',
    description: '走进虚构教学情景，辨认廉洁风险，在抉择之前多想一步、守住底线。',
    accent: '#9e2b25',
    panels: warningPanels,
  },
]

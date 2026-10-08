/**
 * AI 对手配置
 * 四种性格：激进 / 保守 / 投机 / 随机
 * 每种性格对应不同的投壶权重、交代倾向，以及讲评环节的“30 秒感受”
 */

export const AI_CONFIG = [
  { id: 'ai0', name: '张科长', personality: 'aggressive' },
  { id: 'ai1', name: '李经理', personality: 'conservative' },
  { id: 'ai2', name: '王主管', personality: 'speculative' },
  { id: 'ai3', name: '赵工', personality: 'random' },
]

/**
 * 性格字典：
 * - weights：投壶权重（corrupt/edge/clean）
 * - confess：主动交代倾向（never / always / half / random）
 * - feeling：讲评环节的“30 秒感受”文案
 */
export const PERSONALITY = {
  human: {
    label: '你',
    weights: null,
    confess: null,
    feeling: '这是我自己的选择。每一次投壶，其实都是我心里那点侥幸在作祟。',
  },
  aggressive: {
    label: '激进型',
    weights: { corrupt: 0.7, edge: 0.2, clean: 0.1 },
    confess: 'never',
    feeling: '我总觉得手快一点、胆子大一点就没事……现在想想，每一次伸手都像在往自己脚下埋雷。',
  },
  conservative: {
    label: '保守型',
    weights: { corrupt: 0.2, edge: 0.3, clean: 0.5 },
    confess: 'always',
    feeling: '我一直以为少拿一点、慢一点就安全，可侥幸这东西，从来不认人。',
  },
  speculative: {
    label: '投机型',
    weights: { corrupt: 0.5, edge: 0.3, clean: 0.2 },
    confess: 'half',
    feeling: '我算过概率，总觉得轮不到我。可概率从来不替你兜底，账迟早要还。',
  },
  random: {
    label: '随机型',
    weights: { corrupt: 1 / 3, edge: 1 / 3, clean: 1 / 3 },
    confess: 'random',
    feeling: '我随波逐流，觉得大家都这样。结果事到临头，谁也不会替你扛。',
  },
}

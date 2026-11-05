/**
 * 概率判定、投掷解析与出手质量计算工具
 * 核心数值全部集中在 POTS 与 data/touhu/config.js，便于调试与调整平衡性
 * 壶命中率与线索概率对应《投壶拒腐活动策划方案》2.2 / 2.5
 */

import { CLUE_ODDS, CLUE_ODDS_MARKED } from '@/data/touhu/config'

// 三个壶的完整配置：难度模拟「腐败容易守廉难」——腐败壶口大易中、廉洁壶口小难中；
// 三壶命中得分统一为 20 分（书记审定口径：结局只由选择与线索决定，不由壶的贵贱决定）
export const POTS = {
  corrupt: {
    key: 'corrupt',
    name: '腐败壶',
    tagline: '口大 · 易中',
    hitRate: 0.8, // 基础命中率
    score: 20, // 命中得分（三壶统一）
    bestZoneWidth: 0.3, // 蓄力最佳区间宽度（约 30%，宽）
    traverseMs: 2000, // 指针单程耗时（毫秒，慢 -> 容易中）
  },
  edge: {
    key: 'edge',
    name: '擦边壶',
    tagline: '口适中',
    hitRate: 0.6,
    score: 20,
    bestZoneWidth: 0.25, // 约 20%，中
    traverseMs: 1800, // 中速
  },
  clean: {
    key: 'clean',
    name: '廉洁壶',
    tagline: '口小 · 难中',
    hitRate: 0.3,
    score: 20,
    bestZoneWidth: 0.2, // 约 12%，窄
    traverseMs: 1500, // 快 -> 难中，守廉难
  },
}

// 所有壶的键名列表
export const POT_KEYS = Object.keys(POTS)

/** 数值夹取到 [min, max] 区间 */
export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

/**
 * 按概率判定一次事件是否发生
 * @param {number} probability 0~1 之间的概率
 * @returns {boolean}
 */
export function roll(probability) {
  return Math.random() < probability
}

/**
 * Fisher–Yates 洗牌（不修改原数组）
 * @param {Array} arr
 * @returns {Array} 新数组
 */
export function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * 解析一次投掷结果
 * 命中腐败/擦边壶必抽一张卡，卡面按 clueOdds 概率为「留下线索」，其余为「平安无事」；
 * 廉洁壶不抽卡（方案 2.2）。
 * @param {'corrupt'|'edge'|'clean'} potType 所投的壶
 * @param {number|null} hitRateOverride 覆盖的基础命中率（蓄力出手质量后传入），缺省用壶默认值
 * @param {boolean} marked 玩家是否已被标记「组织注意到你了」（提升线索概率，方案 2.5）
 * @returns {{ hit: boolean, score: number, drawCard: boolean, cardType: 'safe'|'clue'|null, potType: string }}
 */
export function resolveThrow(potType, hitRateOverride = null, marked = false) {
  const pot = POTS[potType]
  const hitRate = hitRateOverride ?? pot.hitRate
  const hit = roll(hitRate)

  let drawCard = false
  let cardType = null

  if (hit && potType !== 'clean') {
    drawCard = true
    const odds = marked ? CLUE_ODDS_MARKED : CLUE_ODDS
    cardType = roll(odds[potType]) ? 'clue' : 'safe'
  }

  return { hit, score: hit ? pot.score : 0, drawCard, cardType, potType }
}

/**
 * 计算出手质量系数
 * 指针在最佳区间正中心 -> 1.0，边缘 -> 0.8，完全偏离 -> 0.5，其余线性插值
 * @param {number} pointer 松手后指针位置（0~1）
 * @param {number} zoneStart 最佳区间起点（0~1）
 * @param {number} zoneWidth 最佳区间宽度（0~1）
 * @returns {number} 质量系数（0.5 ~ 1.0）
 */
export function calculateQuality(pointer, zoneStart, zoneWidth) {
  const center = zoneStart + zoneWidth / 2
  const half = zoneWidth / 2
  const dist = Math.abs(pointer - center)

  if (dist <= half) {
    // 区间内：从中心 1.0 线性降到边缘 0.8
    return 1.0 - (dist / half) * 0.2
  }
  // 区间外：从边缘 0.8 继续线性下降，超出 0.3 后封底 0.5
  const overflow = dist - half
  return Math.max(0.5, 0.8 - (overflow / 0.3) * 0.3)
}

/**
 * 根据出手质量返回评价文案
 * @param {number} quality
 * @returns {string}
 */
export function evaluateQuality(quality) {
  if (quality >= 0.95) return '完美出手'
  if (quality >= 0.85) return '不错'
  if (quality >= 0.7) return '略有偏差'
  return '失手了'
}

/**
 * 计算「腐败壶」单次投掷实际留下线索的综合概率（用于讲评展示）
 * 命中率 × 卡面线索概率 = 80% × 50% = 40%（方案 2.2/2.3）
 */
export function corruptClueOdds() {
  return POTS.corrupt.hitRate * CLUE_ODDS.corrupt
}

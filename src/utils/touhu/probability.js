/*
 * @date: Do not edit
 * @lastEditors: liyankun
 * @lastEditTime: YYYY-mm-dd
 * @description: 
 */
/**
 * 投壶难度配置与出手质量计算工具
 * 核心数值全部集中在 POTS 与 data/touhu/config.js，便于调试与调整平衡性
 *
 * 机制口径（书记审定 2026-11）：三个壶为固定难度档位，答对选项后投中哪个壶得哪个分，
 * 未投中保底得 MISS_SCORE 分。壶的分值与难度正相关：易壶口大好中但分低，难壶口小分高。
 */

// 三个壶的完整配置（难度参数沿用旧版三壶的手感：易←宽区间慢指针，难←窄区间快指针）
export const POTS = {
  easy: {
    key: 'easy',
    name: '易',
    tagline: '口大 · 易中',
    score: 10, // 命中得分
    bestZoneWidth: 0.25, // 蓄力最佳区间宽度（约 30%，宽）
    traverseMs: 1800, // 指针单程耗时（毫秒，慢 -> 容易中）
  },
  mid: {
    key: 'mid',
    name: '中',
    tagline: '口适中',
    score: 15,
    bestZoneWidth: 0.2, // 约 25%，中
    traverseMs: 1400, // 中速
  },
  hard: {
    key: 'hard',
    name: '难',
    tagline: '口小 · 难中',
    score: 20,
    bestZoneWidth: 0.15, // 约 20%，窄
    traverseMs: 1000, // 快 -> 难中
  },
}

// 所有壶的键名列表
export const POT_KEYS = Object.keys(POTS)

/** 数值夹取到 [min, max] 区间 */
export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
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

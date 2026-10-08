/**
 * 游戏全局常量配置
 * 所有数值集中在此，便于策划调参与后端对齐
 * 对应《投壶拒腐活动策划方案》2.1~2.6 的规则定义
 */

// 版本号：控制台输出，用于排查“浏览器里跑的到底是不是最新代码”
export const APP_VERSION = '1.1.0'

// —— 轮次与流程 ——
export const TOTAL_ROUNDS = 9 // 活动共九轮
export const CONFESS_ROUND = 4 // 第 4 轮结束后开启主动交代窗口
export const INSPECTION_ROUND = 5 // 第 5 轮结束后中期巡察（强制翻卡 + 标记）
export const QUIZ_ROUNDS = [2, 4, 6, 8] // 这些轮次投壶后插入法规判断题
export const FINAL_ROUND = TOTAL_ROUNDS // 第 9 轮结束后最终清算

// —— 抽卡与查看（方案 2.2 / 2.3）——
// 命中腐败/擦边壶必抽一张卡，卡面为「平安无事」或「留下线索」
export const CLUE_ODDS = {
  corrupt: 0.5, // 腐败壶抽中线索概率 50%
  edge: 0.25, // 擦边壶抽中线索概率 25%
}
// 被标记「组织注意到你了」后提升（方案 2.5）
export const CLUE_ODDS_MARKED = {
  corrupt: 0.7,
  edge: 0.5,
}
// 付费查看费用（从当前总分扣除，不足不能查看）
export const VIEW_COST = { corrupt: 10, edge: 5 }

// —— 主动交代（方案 2.4）——
// 交代 = 扣除此前投腐败/擦边壶所得的全部分数 + 消除所有线索卡

// —— 清风令（方案 2.1）——
// 第 2/4/6/8 轮法规判断题，每答对一题获得一枚，最终清算时每枚 +10 分
export const TOKEN_BONUS = 10

// —— 最终清算（方案 2.6）——
export const BREEZE_AWARD = 30 // 0 线索且全程未投风险壶：清风奖
// 线索阶梯：0 条保留全部；1 条减半；>=2 条清零
// 注：方案原文「小于 2 减半、大于 2 清零」，恰好 2 条未定义，此处按 >=2 清零实现（与现有代码一致），上线前请与策划确认

// —— 惩罚（方案 2.6）——
export const COURSE_MIN_SCORE = 40 // 最终分数低于 40 需领学
export const COURSE_FOR_RISKY = true // 投过腐败/擦边壶者也需领学

// —— 课程次数 ——
export const COURSE_COUNT = { heavy: 2, light: 1 }

/**
 * 游戏全局常量配置
 * 所有数值集中在此，便于策划调参与后端 GameRules.java 对齐
 *
 * 机制口径（书记审定 2026-11）：
 * - 每轮情景题 ABC 三选项只有唯一正确项；选错该题 0 分（展示解析后进入下一题）；
 * - 选对后投壶定分：三个壶为固定难度档位 易=10 / 中=15 / 难=20，
 *   投中得壶分，未中保底得 MISS_SCORE 分；
 * - 第 2/4/6/8 轮插入法规判断题，答对得清风令，终局每枚 +10 分。
 */

// 版本号：控制台输出，用于排查“浏览器里跑的到底是不是最新代码”
export const APP_VERSION = '2.0.0'

// —— 轮次与流程 ——
export const TOTAL_ROUNDS = 9 // 活动共九轮
export const QUIZ_ROUNDS = [2, 4, 6, 8] // 这些轮次作答后插入法规判断题
export const FINAL_ROUND = TOTAL_ROUNDS // 第 9 轮结束后最终清算

// —— 投壶计分 ——
export const MISS_SCORE = 5 // 答对选项但投壶未中的保底分
export const POT_SCORES = { easy: 10, mid: 15, hard: 20 } // 命中各壶得分

// —— 清风令 ——
// 第 2/4/6/8 轮法规判断题，每答对一题获得一枚，最终清算时每枚 +10 分
export const TOKEN_BONUS = 10

// —— 课程领学 ——
export const COURSE_MIN_SCORE = 40 // 最终分数低于 40 需领学

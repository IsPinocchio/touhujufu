import { defineStore } from 'pinia'
import { scenes } from '@/data/scenes'
import { quizQuestions } from '@/data/quiz'
import {
  TOTAL_ROUNDS,
  CONFESS_ROUND,
  INSPECTION_ROUND,
  QUIZ_ROUNDS,
  FINAL_ROUND,
  VIEW_COST,
  TOKEN_BONUS,
  BREEZE_AWARD,
  APP_VERSION,
} from '@/data/config'
import { POTS, resolveThrow, shuffle, calculateQuality, evaluateQuality } from '@/utils/probability'
import { loadJSON, saveJSON } from '@/utils/storage'

const HISTORY_KEY = 'touhu_history'
const MAX_HISTORY = 20

// 讲评环节的 30 秒感受文案
const HUMAN_FEELING = '这是我自己的选择。每一次投壶，其实都是我心里那点侥幸在作祟。'

/**
 * 游戏核心 store
 * 状态机：phase 依次流转
 *  idle -> playing -> (quiz)* -> playing -> confess -> playing -> midInspection -> playing -> finalInspection -> finished
 * 投壶流程：选壶 -> 蓄力 -> 松手投掷（指针落入高亮区间必中）-> 抽卡 -> 可选付费查看 -> 法规判断题（第 2/4/6/8 轮）
 * 单人游戏：无 AI 对手；与真实玩家的排名由后端服务提供（接入中）。
 * 持久化到 localStorage，刷新后可继续上局。
 */
export const useGameStore = defineStore('game', {
  state: () => ({
    round: 1, // 当前轮次 1~9
    phase: 'idle', // idle | playing | quiz | confess | midInspection | finalInspection | finished
    player: null, // 玩家（单人）
    usedScenes: [], // 已用过的场景题 id
    usedQuizzes: [], // 已用过的判断题 id
    usedQuizRounds: [], // 已答过判断题的轮次（每轮最多一次）
    currentScene: null, // 当前轮场景（选项已打乱）
    currentQuiz: null, // 当前判断题
    currentRoundResults: [], // 本轮投掷结果
    cardSeq: 0, // 线索卡发号器，保证卡片 id 唯一
    finalReport: null, // 最终结算与讲评数据
    startTime: null, // 开局时间戳

    // —— 蓄力相关状态 ——
    selectedPot: null, // 当前选中的壶（corrupt | edge | clean | null）
    isCharging: false, // 是否处于蓄力阶段（选壶后、松手前）
    bestZoneStart: 0, // 最佳区间起点（0~1）
    bestZoneWidth: 0, // 最佳区间宽度（0~1）
  }),

  getters: {
    hasActiveGame: (state) => state.phase !== 'idle' && !!state.player,
    // 组织注意到你了（中期巡察后线索 >= 1 即被标记）
    humanMarked: (state) => !!state.player?.marked,
  },

  actions: {
    /** 初始化一局新游戏 */
    initGame() {
      console.info(`[投壶拒腐] v${APP_VERSION} · 新开局`)
      this.usedScenes = []
      this.usedQuizzes = []
      this.usedQuizRounds = []
      this.round = 1
      this.phase = 'playing'
      this.startTime = Date.now()
      this.finalReport = null
      this.currentRoundResults = []
      this.currentQuiz = null
      this.cardSeq = 0

      // 重置蓄力状态
      this.selectedPot = null
      this.isCharging = false
      this.bestZoneStart = 0
      this.bestZoneWidth = 0

      this.player = this.createPlayer({ id: 'human', name: '你' })

      this.currentScene = this.pickScene()
    },

    /** 玩家对象工厂：统一字段，便于与后端玩家模型对齐 */
    createPlayer({ id, name }) {
      return {
        id,
        name,
        score: 0, // 当前总分（付费查看会扣分）
        clueCards: [], // { id, type: 'safe'|'clue', revealed, pot }
        usedRiskyPot: false, // 是否投过腐败/擦边壶（用于清风奖与领学判定）
        riskyScore: 0, // 投腐败/擦边壶累计得分（主动交代时全额扣除）
        threwCount: 0, // 实际投掷次数
        breezeTokens: 0, // 清风令数量（判断题答对获得，清算时每枚 +10 分）
        correctQuizCount: 0, // 判断题答对次数
        marked: false, // 是否被标记「组织注意到你了」
        confessed: false, // 是否主动交代过
      }
    },

    /** 选取一个未用过的场景题，并打乱选项顺序 */
    pickScene() {
      const available = scenes.filter((s) => !this.usedScenes.includes(s.id))
      const pool = available.length ? available : scenes // 题库用完则复用
      const scene = pool[Math.floor(Math.random() * pool.length)]
      this.usedScenes.push(scene.id)
      return { ...scene, options: shuffle(scene.options) }
    },

    /** 选取一个未用过的判断题 */
    pickQuiz() {
      const available = quizQuestions.filter((q) => !this.usedQuizzes.includes(q.id))
      const pool = available.length ? available : quizQuestions
      const quiz = pool[Math.floor(Math.random() * pool.length)]
      this.usedQuizzes.push(quiz.id)
      return quiz
    },

    /** 选壶：生成随机最佳区间，进入蓄力阶段；松手前可切换壶，松手后锁定 */
    startCharge(potType) {
      if (this.selectedPot && !this.isCharging) return
      this.selectedPot = potType
      this.isCharging = true
      const width = POTS[potType].bestZoneWidth
      this.bestZoneWidth = width
      // 最佳区间位置每轮随机，防止记忆
      this.bestZoneStart = Math.random() * (1 - width)
    },

    /** 计算出手质量与最终命中判定（不落地，供 releaseCharge 使用） */
    calculateHit(releasePos) {
      // 确定性判定：指针落在最佳区间内必中，区间外不中
      // 命中率差异完全由区间宽度 + 指针速度体现，不再叠加随机概率
      const inZone =
        releasePos >= this.bestZoneStart && releasePos <= this.bestZoneStart + this.bestZoneWidth
      const quality = calculateQuality(releasePos, this.bestZoneStart, this.bestZoneWidth)
      const result = resolveThrow(this.selectedPot, inZone ? 1 : 0, this.player?.marked)
      return {
        ...result,
        quality,
        hitRate: inZone ? 1 : 0,
        finalPos: releasePos,
        evaluation: evaluateQuality(quality),
      }
    },

    /** 松手投掷：结算结果并落到玩家头上，返回完整结果供动画层播放 */
    releaseCharge(releasePos) {
      if (!this.isCharging || !this.selectedPot) return null
      this.isCharging = false

      const result = this.calculateHit(releasePos)
      this.applyThrowResult(this.player, result)

      const enriched = {
        playerId: this.player.id,
        name: this.player.name,
        ...result,
      }
      this.currentRoundResults = [enriched]
      return enriched
    },

    /** 将一次已解析的投掷结果应用到玩家（得分、抽卡落袋、记录风险壶） */
    applyThrowResult(player, result) {
      if (!player) return
      if (result.potType === 'corrupt' || result.potType === 'edge') {
        player.usedRiskyPot = true
      }
      player.threwCount += 1

      if (result.hit) {
        player.score += result.score
        if (result.potType === 'corrupt' || result.potType === 'edge') {
          player.riskyScore += result.score
        }
        if (result.drawCard) {
          player.clueCards.push({
            id: `card_${++this.cardSeq}`,
            type: result.cardType,
            revealed: false,
            pot: result.potType,
          })
        }
      }
    },

    /** 本轮动画播放完毕后调用：判断题轮次先进答题，否则按流程推进 */
    finishRound() {
      // 清理本轮投掷与蓄力状态
      this.currentRoundResults = []
      this.selectedPot = null
      this.isCharging = false

      if (QUIZ_ROUNDS.includes(this.round) && !this.usedQuizRounds.includes(this.round)) {
        this.currentQuiz = this.pickQuiz()
        this.phase = 'quiz'
        return
      }
      this.proceedRound()
    },

    /** 答完判断题后回调：答对获得一枚清风令，随后推进流程 */
    answerQuiz(correct) {
      if (this.phase !== 'quiz') return
      if (correct) {
        this.player.breezeTokens += 1
        this.player.correctQuizCount += 1
      }
      this.usedQuizRounds.push(this.round)
      this.currentQuiz = null
      this.proceedRound()
    },

    /** 流程推进：交代窗口 -> 中期巡察 -> 最终巡视 -> 下一轮 */
    proceedRound() {
      const r = this.round
      if (r === CONFESS_ROUND) {
        // 主动交代窗口开启（第 4 轮结束）
        this.phase = 'confess'
      } else if (r === INSPECTION_ROUND) {
        // 中期巡察：强制翻开所有线索卡，线索 >= 1 即被标记
        this.revealAllCards()
        this.player.marked = this.countClues(this.player) >= 1
        this.phase = 'midInspection'
      } else if (r === FINAL_ROUND) {
        // 最终巡视：先翻开全部线索卡供弹窗展示
        this.revealAllCards()
        this.phase = 'finalInspection'
      } else {
        this.advanceToNextRound()
      }
    },

    /** 进入下一轮 */
    advanceToNextRound() {
      this.round += 1
      this.currentScene = this.pickScene()
      this.phase = 'playing'
    },

    /** 中期巡察结束后继续 */
    dismissMidInspection() {
      this.advanceToNextRound()
    },

    /**
     * 付费查看一张未翻开的线索卡（方案 2.3）
     * 费用按抽卡来源壶计：腐败壶 10 分、擦边壶 5 分；总分不足不能查看
     * @returns {boolean} 是否查看成功
     */
    payToView(cardId) {
      const card = this.player?.clueCards.find((c) => c.id === cardId)
      if (!card || card.revealed) return false
      const cost = VIEW_COST[card.pot] ?? 0
      if (this.player.score < cost) return false
      this.player.score -= cost
      card.revealed = true
      return true
    },

    /**
     * 主动交代（方案 2.4）：扣除此前投腐败/擦边壶所得的全部分数，消除所有已抽线索卡
     */
    confess() {
      const player = this.player
      if (!player) return
      player.score -= player.riskyScore
      player.riskyScore = 0
      player.clueCards = []
      player.confessed = true
    },

    /** 主动交代环节结束：进入下一轮 */
    dismissConfess() {
      this.advanceToNextRound()
    },

    /** 最终巡视：翻开全部线索卡、清算、生成讲评报告（排名由后端服务提供，接入中） */
    finalInspection() {
      this.revealAllCards()
      this.settlePlayer(this.player)

      this.finalReport = this.buildReport(this.player)
      this.phase = 'finished'
      this.saveHistory()
    },

    /** 对单个玩家按线索数阶梯清算，并叠加清风令奖励 */
    settlePlayer(player) {
      const clues = this.countClues(player)
      player.finalClueCount = clues

      // 清风令在最终清算时每枚 +10 分，先并入总分再统一走阶梯：
      // 这样「2 条及以上线索 = 总分清零」会把令牌分一并清零，与策划口径一致
      if (player.breezeTokens > 0) {
        player.score += player.breezeTokens * TOKEN_BONUS
      }
      player.rawScore = player.score // 清算前分数（供滚动动画展示）

      if (clues === 0) {
        // 全程未投风险壶（且确实投过壶）：+30 清风奖
        if (!player.usedRiskyPot && player.threwCount > 0) {
          player.score += BREEZE_AWARD
          player.breezeAward = true
        }
        player.penalty = 'none'
      } else if (clues === 1) {
        // 轻处分：总分减半
        player.score = Math.floor(player.score / 2)
        player.penalty = 'light'
      } else {
        // 重处分：总分清零
        player.score = 0
        player.penalty = 'heavy'
      }
    },

    /** 构建讲评报告：是否侥幸逃脱、是否被清零、个人感受 */
    buildReport(player) {
      return {
        escaped: player.usedRiskyPot && player.finalClueCount === 0,
        zeroed: player.finalClueCount >= 2,
        feeling: HUMAN_FEELING,
      }
    },

    /** 统计某玩家的真实线索数 */
    countClues(player) {
      return player.clueCards.filter((c) => c.type === 'clue').length
    },

    /** 翻开玩家的全部线索卡 */
    revealAllCards() {
      this.player?.clueCards.forEach((c) => (c.revealed = true))
    },

    /** 将本局结果追加到历史记录（最多保留 20 条） */
    saveHistory() {
      const h = this.player
      const summary = {
        date: Date.now(),
        playerName: h.name,
        playerScore: h.score,
        clueCount: h.finalClueCount,
        penalty: h.penalty,
        breezeTokens: h.breezeTokens,
        confessed: h.confessed,
        rounds: this.round,
      }
      const list = loadJSON(HISTORY_KEY, [])
      list.unshift(summary)
      saveJSON(HISTORY_KEY, list.slice(0, MAX_HISTORY))
    },

    /** 退出/重置本局 */
    quitGame() {
      this.$reset()
    },
  },

  persist: {
    key: 'touhu_game_state_v3',
    storage: localStorage,
  },
})

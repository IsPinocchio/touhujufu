import { defineStore } from 'pinia'
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
} from '@/data/touhu/config'
import { POTS, resolveThrow, calculateQuality, evaluateQuality } from '@/utils/touhu/probability'
import { touhuApi } from '@/utils/touhu/api'

// 上报队列：串行发送，保证服务端按轮次顺序校验通过
// 单条失败自动重试 2 次；仍失败则置 store.reportError 提示用户，不再静默吞掉
let reportQueue = Promise.resolve()
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function sendWithRetry(fn, attempts = 3) {
  let lastErr
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn()
    } catch (e) {
      lastErr = e
      if (i < attempts - 1) await sleep(800 * (i + 1))
    }
  }
  throw lastErr
}

// 讲评环节的 30 秒感受文案
const HUMAN_FEELING = '这是我自己的选择。每一次投壶，其实都是我心里那点侥幸在作祟。'

/**
 * 游戏核心 store
 * 状态机：phase 依次流转
 *  idle -> playing -> (quiz)* -> playing -> confess -> playing -> midInspection -> playing -> finalInspection -> finished
 * 投壶流程：选壶 -> 蓄力 -> 松手投掷（指针落入高亮区间必中）-> 抽卡 -> 可选付费查看 -> 法规判断题（第 2/4/6/8 轮）
 * 单人游戏：无 AI 对手；题目、进度、成绩全部在后端，换设备可续玩。
 * 注意：进度不存 localStorage，刷新/换机后通过 resumeFromServer 从服务端重建。
 */
export const useGameStore = defineStore('game', {
  state: () => ({
    round: 1, // 当前轮次 1~9
    phase: 'idle', // idle | playing | quiz | confess | midInspection | finalInspection | finished
    player: null, // 玩家（单人）
    questionPlan: null, // 本局抽题结果（开局时后端下发）：{ scenes: [...9], quizzes: { 2: {...}, 4, 6, 8 } }
    usedQuizRounds: [], // 已答过判断题的轮次（每轮最多一次）
    currentScene: null, // 当前轮场景（选项已由服务端打乱）
    currentQuiz: null, // 当前判断题
    currentRoundResults: [], // 本轮投掷结果
    cardSeq: 0, // 线索卡发号器，保证卡片 id 唯一
    finalReport: null, // 最终结算与讲评数据
    startTime: null, // 开局时间戳
    sessionId: null, // 后端对局 id
    rules: null, // 服务端下发的规则快照（开局/续玩时携带），展示数值以此为准，缺省回退 data/touhu/config.js
    reportError: null, // 成绩上报失败提示（重试后仍失败时置位，界面常驻提醒）

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
    // 规则数值：优先用服务端快照，快照缺失（旧对局）回退本地常量
    tokenBonus: (state) => state.rules?.tokenBonus ?? TOKEN_BONUS,
    breezeAward: (state) => state.rules?.breezeAward ?? BREEZE_AWARD,
  },

  actions: {
    /** 成绩上报入队：串行 + 自动重试；重试仍失败置 reportError 提醒玩家（不阻断游戏） */
    _enqueueReport(fn) {
      reportQueue = reportQueue
        .then(() => sendWithRetry(fn))
        .catch((e) => {
          this.reportError = '网络不稳定，部分成绩未能同步，请检查网络'
          console.warn('[投壶拒腐] 数据上报失败（已自动重试）', e)
        })
    },

    /** 初始化一局新游戏：服务端抽题开局，失败则抛错（成绩必须入库，不支持离线玩） */
    async initGame() {
      console.info(`[投壶拒腐] v${APP_VERSION} · 新开局`)
      this.$reset()

      // 服务端同一时刻只允许一局 PLAYING，先放弃残留对局再开新局
      const current = await touhuApi.currentSession().catch(() => null)
      if (current?.sessionId) {
        await touhuApi.abandonSession(current.sessionId)
      }
      const session = await touhuApi.startSession()
      this.sessionId = session.sessionId
      this.questionPlan = session.questionPlan
      this.rules = session.rules ?? null

      this.phase = 'playing'
      this.startTime = Date.now()
      this.player = this.createPlayer({ id: 'human', name: '你' })
      this.currentScene = this.sceneForRound(1)
    },

    /**
     * 从服务端对局状态恢复（继续上局 / 换设备续玩）：
     * 按轮次重放投掷、答题、看卡、交代记录，重建玩家状态，并推断当前应处的阶段。
     */
    resumeFromServer(state) {
      this.$reset()
      this.sessionId = state.sessionId
      this.questionPlan = state.questionPlan
      this.rules = state.rules ?? null
      this.startTime = state.startedAt ? new Date(state.startedAt).getTime() : Date.now()
      this.player = this.createPlayer({ id: 'human', name: '你' })

      // 1. 重放投掷
      for (const t of state.throws) {
        this.round = t.roundNo // applyThrowResult 里抽卡要记录轮次
        this.applyThrowResult(this.player, {
          potType: t.potType.toLowerCase(),
          hit: t.hit,
          score: t.scoreGained,
          drawCard: t.cardType !== 'NONE',
          cardType: t.cardType === 'NONE' ? null : t.cardType.toLowerCase(),
        })
      }

      // 2. 重放付费查看（翻开对应轮次的卡并扣分）
      for (const v of state.cardViews) {
        const card = this.player.clueCards.find((c) => c.round === v.roundNo && !c.revealed)
        if (card) {
          card.revealed = true
          this.player.score -= v.cost
        }
      }

      // 3. 重放答题
      for (const q of state.quizzes) {
        if (q.correct) {
          this.player.breezeTokens += 1
          this.player.correctQuizCount += 1
        }
        this.usedQuizRounds.push(q.roundNo)
      }

      // 4. 重放主动交代：扣除风险壶得分、清空线索卡（先付过查看费再交代会扣成负数，展示清底为 0）
      if (state.confessed) {
        this.player.score = Math.max(0, this.player.score - this.player.riskyScore)
        this.player.riskyScore = 0
        this.player.clueCards = []
        this.player.confessed = true
      }

      // 5. 已过中期巡察则重算标记（交代者卡片已清空，自然为 false）
      const r = state.currentRound
      if (r > INSPECTION_ROUND) {
        this.player.marked =
          this.player.clueCards.filter((c) => c.round <= INSPECTION_ROUND && c.type === 'clue')
            .length >= 1
      }

      // 6. 推断应处的阶段（重放顺序：答题 -> 交代窗口 -> 中期巡察 -> 最终巡视 -> 正常轮次）
      const lastDone = r - 1
      if (QUIZ_ROUNDS.includes(lastDone) && !this.usedQuizRounds.includes(lastDone)) {
        // 投掷完成但判断题未答：回到该轮答题
        this.round = lastDone
        this.currentScene = this.sceneForRound(lastDone)
        this.currentQuiz = this.quizForRound(lastDone)
        this.phase = 'quiz'
      } else if (r === CONFESS_ROUND + 1 && !state.confessed) {
        // 第 4 轮刚结束：交代窗口
        this.round = CONFESS_ROUND
        this.phase = 'confess'
      } else if (r === INSPECTION_ROUND + 1) {
        // 第 5 轮刚结束：中期巡察
        this.round = INSPECTION_ROUND
        this.revealAllCards()
        this.phase = 'midInspection'
      } else if (r > TOTAL_ROUNDS) {
        // 9 轮全部完成但尚未清算
        this.round = TOTAL_ROUNDS
        this.revealAllCards()
        this.phase = 'finalInspection'
      } else {
        this.round = r
        this.currentScene = this.sceneForRound(r)
        this.phase = 'playing'
      }
    },

    /** 玩家对象工厂：统一字段，便于与后端玩家模型对齐 */
    createPlayer({ id, name }) {
      return {
        id,
        name,
        score: 0, // 当前总分（付费查看会扣分）
        clueCards: [], // { id, type: 'safe'|'clue', revealed, pot, round }
        usedRiskyPot: false, // 是否投过腐败/擦边壶（用于清风奖与领学判定）
        riskyAfterConfess: false, // 主动交代之后是否又投过腐败/擦边壶（交代窗口在第 4 轮后）
        riskyScore: 0, // 投腐败/擦边壶累计得分（主动交代时全额扣除）
        hitCount: 0, // 命中次数（清风奖要求至少命中一次，全程陪跑不获奖）
        breezeTokens: 0, // 清风令数量（判断题答对获得，清算时每枚 +10 分）
        correctQuizCount: 0, // 判断题答对次数
        marked: false, // 是否被标记「组织注意到你了」
        confessed: false, // 是否主动交代过
      }
    },

    /** 取本局第 round 轮的场景题（后端开局时已抽好并打乱选项） */
    sceneForRound(round) {
      return this.questionPlan?.scenes?.[round - 1] ?? null
    },

    /** 取本局第 round 轮的判断题（仅 2/4/6/8 轮有） */
    quizForRound(round) {
      return this.questionPlan?.quizzes?.[round] ?? null
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

      // 上报本轮投掷（入队串行发送，失败不阻断游戏）
      if (this.sessionId) {
        const sid = this.sessionId
        const payload = {
          roundNo: this.round,
          sceneId: this.currentScene?.id != null ? String(this.currentScene.id) : null,
          potType: result.potType.toUpperCase(),
          pointerPos: releasePos,
          inZone: result.hit, // 确定性判定：命中即指针落入区间
          cardType: result.cardType ? result.cardType.toUpperCase() : 'NONE',
        }
        this._enqueueReport(() => touhuApi.reportThrow(sid, payload))
      }

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
        if (this.round > CONFESS_ROUND) {
          player.riskyAfterConfess = true
        }
      }

      if (result.hit) {
        player.hitCount += 1
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
            round: this.round, // 抽卡所在轮次（付费查看上报要用）
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
        this.currentQuiz = this.quizForRound(this.round)
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
      if (this.sessionId) {
        const sid = this.sessionId
        const payload = {
          roundNo: this.round,
          quizId: this.currentQuiz?.id != null ? String(this.currentQuiz.id) : null,
          correct: !!correct,
        }
        this._enqueueReport(() => touhuApi.reportQuiz(sid, payload))
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
      this.currentScene = this.sceneForRound(this.round)
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
      // 费用优先取服务端规则快照（键为壶枚举大写名），快照缺失回退本地常量
      const cost = this.rules?.viewCosts?.[card.pot.toUpperCase()] ?? VIEW_COST[card.pot] ?? 0
      if (this.player.score < cost) return false
      this.player.score -= cost
      card.revealed = true
      if (this.sessionId) {
        const sid = this.sessionId
        const roundNo = card.round ?? this.round
        this._enqueueReport(() => touhuApi.reportCardView(sid, { roundNo }))
      }
      return true
    },

    /**
     * 主动交代（方案 2.4）：扣除此前投腐败/擦边壶所得的全部分数，消除所有已抽线索卡
     */
    confess() {
      const player = this.player
      if (!player) return
      // 先付过查看费再交代会扣成负数：展示分清底为 0（服务端清算最终也会清底，口径一致）
      player.score = Math.max(0, player.score - player.riskyScore)
      player.riskyScore = 0
      player.clueCards = []
      player.confessed = true
      if (this.sessionId) {
        const sid = this.sessionId
        this._enqueueReport(() => touhuApi.confess(sid))
      }
    },

    /** 主动交代环节结束：进入下一轮 */
    dismissConfess() {
      this.advanceToNextRound()
    },

    /** 最终巡视：翻开全部线索卡、清算、生成讲评报告（服务端重算为权威结果） */
    async finalInspection() {
      this.revealAllCards()
      this.settlePlayer(this.player)

      this.finalReport = this.buildReport(this.player)
      this.phase = 'finished'

      // 等此前的投掷/答题/交代全部上报完，再请求服务端清算
      if (this.sessionId) {
        const sid = this.sessionId
        try {
          await reportQueue
          const server = await touhuApi.finishSession(sid)
          this.finalReport = { ...this.finalReport, server }
          // 以服务端权威分数为准（本地计算与之理论上一致，仅作展示兜底）
          this.player.score = server.finalScore
          this.player.finalClueCount = server.clueCount
          this.player.penalty = server.penalty.toLowerCase()
        } catch (e) {
          console.warn('[投壶拒腐] 终局清算上报失败，展示本地结算结果', e)
          this.finalReport = { ...this.finalReport, serverFailed: true }
          this.reportError = '终局成绩未能同步到服务器，请截图本页并联系组织者'
        }
      }
    },

    /** 对单个玩家按线索数阶梯清算，并叠加清风令奖励 */
    settlePlayer(player) {
      const clues = this.countClues(player)
      player.finalClueCount = clues

      // 清风令在最终清算时每枚 +10 分，先并入总分再统一走阶梯：
      // 这样「2 条及以上线索 = 总分清零」会把令牌分一并清零，与策划口径一致
      if (player.breezeTokens > 0) {
        player.score += player.breezeTokens * this.tokenBonus
      }
      player.rawScore = player.score // 清算前分数（供滚动动画展示）

      if (clues === 0) {
        // 全程未投风险壶且至少命中过一次：+30 清风奖（全程陪跑不获奖）
        if (!player.usedRiskyPot && player.hitCount > 0) {
          player.score += this.breezeAward
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
      // 负分清底：付费查看可能把分数扣成负数，最终得分不为负
      player.score = Math.max(0, player.score)
    },

    /** 构建讲评报告：是否侥幸逃脱、是否被清零、交代后是否收手、个人感受 */
    buildReport(player) {
      // 交代后未再伸手：不算"侥幸逃脱"，是主动收手，讲评单独呈现
      const confessedClean = player.confessed && !player.riskyAfterConfess
      return {
        escaped: player.usedRiskyPot && player.finalClueCount === 0 && !confessedClean,
        zeroed: player.finalClueCount >= 2,
        confessedClean,
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

    /** 退出/重置本局（同时放弃服务器上的对局） */
    quitGame() {
      const sid = this.sessionId
      const active =
        this.phase === 'playing' ||
        this.phase === 'quiz' ||
        this.phase === 'confess' ||
        this.phase === 'midInspection'
      this.$reset()
      if (sid && active) {
        reportQueue = reportQueue
          .then(() => touhuApi.abandonSession(sid))
          .catch((e) => console.warn('[投壶拒腐] 放弃对局上报失败', e))
      }
    },
  },
})

import { defineStore } from 'pinia'
import {
  TOTAL_ROUNDS,
  QUIZ_ROUNDS,
  FINAL_ROUND,
  MISS_SCORE,
  POT_SCORES,
  TOKEN_BONUS,
  APP_VERSION,
} from '@/data/touhu/config'
import { POTS, POT_KEYS, shuffle, calculateQuality, evaluateQuality } from '@/utils/touhu/probability'
import { COLOR_KEYS } from '@/utils/touhu/colors'
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
const HUMAN_FEELING = '每一次选择，都是对纪律的一次作答；每一次投壶，都是向廉洁的一次靠近。'

/**
 * 游戏核心 store
 * 状态机：phase 依次流转
 *  idle -> playing（答题） -> answerFeedback（答错解析）| throwing（答对投壶） -> (quiz)* -> finishing -> finished
 * 每轮流程：看情景选 ABC -> 选错 0 分看解析；选对投壶定分（命中 10/15/20，未中保底 5）
 *  -> 法规判断题（第 2/4/6/8 轮）-> 下一轮
 * 单人游戏：无 AI 对手；题目、进度、成绩全部在后端，换设备可续玩。
 * 注意：进度不存 localStorage，刷新/换机后通过 resumeFromServer 从服务端重建。
 */
export const useGameStore = defineStore('game', {
  state: () => ({
    round: 1, // 当前轮次 1~9
    phase: 'idle', // idle | playing | answerFeedback | throwing | quiz | finishing | finished
    player: null, // 玩家（单人）
    questionPlan: null, // 本局抽题结果（开局时后端下发）：{ scenes: [...9], quizzes: { 2: {...}, 4, 6, 8 } }
    usedQuizRounds: [], // 已答过判断题的轮次（每轮最多一次）
    currentScene: null, // 当前轮场景（选项已由服务端打乱）
    lastAnswer: null, // 本轮作答结果 { chosenKey, correct, correctKey, hint }（用于答错解析展示）
    potOrder: ['easy', 'mid', 'hard'], // 本轮三个壶的展示顺序（每轮随机打乱）
    colorMap: { easy: 'copper', mid: 'slate', hard: 'green' }, // 本轮三个壶的配色主题（每轮随机分配）
    currentQuiz: null, // 当前判断题
    currentRoundResults: [], // 本轮投掷结果
    finalReport: null, // 最终结算与讲评数据
    startTime: null, // 开局时间戳
    sessionId: null, // 后端对局 id
    rules: null, // 服务端下发的规则快照（开局/续玩时携带），展示数值以此为准，缺省回退 data/touhu/config.js
    reportError: null, // 成绩上报失败提示（重试后仍失败时置位，界面常驻提醒）

    // —— 蓄力相关状态 ——
    selectedPot: null, // 当前选中的壶（easy | mid | hard | null）
    isCharging: false, // 是否处于蓄力阶段（选壶后、松手前）
    bestZoneStart: 0, // 最佳区间起点（0~1）
    bestZoneWidth: 0, // 最佳区间宽度（0~1）
  }),

  getters: {
    hasActiveGame: (state) => state.phase !== 'idle' && !!state.player,
    // 规则数值：优先用服务端快照，快照缺失回退本地常量
    tokenBonus: (state) => state.rules?.tokenBonus ?? TOKEN_BONUS,
    missScore: (state) => state.rules?.missScore ?? MISS_SCORE,
    // 各壶命中得分：快照键为枚举大写名（EASY/MID/HARD）
    potScores: (state) => state.rules?.potScores ?? Object.fromEntries(
      Object.entries(POT_SCORES).map(([k, v]) => [k.toUpperCase(), v])
    ),
  },

  actions: {
    /** 壶命中得分（键为小写壶名） */
    potScore(potType) {
      return this.potScores[potType.toUpperCase()] ?? POTS[potType]?.score ?? 0
    },

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
      this.setRoundScene(1)
    },

    /**
     * 从服务端对局状态恢复（继续上局 / 换设备续玩）：
     * 按轮次重放作答与答题记录，重建玩家状态，并推断当前应处的阶段。
     */
    resumeFromServer(state) {
      this.$reset()
      this.sessionId = state.sessionId
      this.questionPlan = state.questionPlan
      this.rules = state.rules ?? null
      this.startTime = state.startedAt ? new Date(state.startedAt).getTime() : Date.now()
      this.player = this.createPlayer({ id: 'human', name: '你' })

      // 1. 重放各轮作答（答错轮 scoreGained=0 且投壶字段为空，直接跳过投壶统计）
      for (const t of state.throws) {
        this.player.score += t.scoreGained
        if (t.optionCorrect) {
          this.player.correctAnswerCount += 1
          this.player.throwCount += 1
          if (t.hit) this.player.hitCount += 1
        }
      }

      // 2. 重放判断题
      for (const q of state.quizzes) {
        if (q.correct) {
          this.player.breezeTokens += 1
          this.player.correctQuizCount += 1
        }
        this.usedQuizRounds.push(q.roundNo)
      }

      // 3. 推断应处的阶段
      const r = state.currentRound
      const lastDone = r - 1
      if (QUIZ_ROUNDS.includes(lastDone) && !this.usedQuizRounds.includes(lastDone)) {
        // 本轮作答完成但判断题未答：回到该轮答题
        this.round = lastDone
        this.setRoundScene(lastDone)
        this.currentQuiz = this.quizForRound(lastDone)
        this.phase = 'quiz'
      } else if (r > TOTAL_ROUNDS) {
        // 9 轮全部完成但尚未清算：进入结算入口
        this.round = TOTAL_ROUNDS
        this.phase = 'finishing'
      } else {
        this.round = r
        this.setRoundScene(r)
        this.phase = 'playing'
      }
    },

    /** 玩家对象工厂：统一字段，便于与后端玩家模型对齐 */
    createPlayer({ id, name }) {
      return {
        id,
        name,
        score: 0, // 当前总分（各轮得分之和，清风令在清算时并入）
        correctAnswerCount: 0, // 情景题答对数
        throwCount: 0, // 投壶次数（= 答对数）
        hitCount: 0, // 投中次数
        breezeTokens: 0, // 清风令数量（判断题答对获得，清算时每枚 +10 分）
        correctQuizCount: 0, // 判断题答对次数
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

    /** 载入第 round 轮场景，并随机打乱三个壶的展示顺序与配色（防止固定位置/颜色暴露难度档位） */
    setRoundScene(round) {
      this.currentScene = this.sceneForRound(round)
      this.lastAnswer = null
      this.potOrder = shuffle(POT_KEYS)
      const themes = shuffle(COLOR_KEYS)
      this.colorMap = { easy: themes[0], mid: themes[1], hard: themes[2] }
    },

    /**
     * 作答：选择 ABC 选项。
     * 答错 -> 本题 0 分，记录作答并上报（不带投壶字段），进入 answerFeedback 展示解析；
     * 答对 -> 进入 throwing 阶段，投壶决定本题得分。
     */
    answerOption(optionKey) {
      if (this.phase !== 'playing' || this.lastAnswer || !this.currentScene) return
      const option = this.currentScene.options.find((o) => o.key === optionKey)
      if (!option) return
      const correctKey = this.currentScene.options.find((o) => o.correct)?.key ?? null
      const correct = !!option.correct

      this.lastAnswer = {
        chosenKey: optionKey,
        correct,
        correctKey,
        hint: this.currentScene.hint,
      }

      if (correct) {
        this.player.correctAnswerCount += 1
        this.phase = 'throwing'
      } else {
        // 答错：本题 0 分，立即上报（入队串行发送，失败不阻断游戏）
        if (this.sessionId) {
          const sid = this.sessionId
          const payload = {
            roundNo: this.round,
            sceneId: String(this.currentScene.id),
            optionKey,
          }
          this._enqueueReport(() => touhuApi.reportThrow(sid, payload))
        }
        this.phase = 'answerFeedback'
      }
    },

    /** 选壶：生成随机最佳区间，进入蓄力阶段；松手前可切换壶，松手后锁定 */
    startCharge(potType) {
      if (this.phase !== 'throwing') return
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
      return {
        potType: this.selectedPot,
        hit: inZone,
        score: inZone ? this.potScore(this.selectedPot) : this.missScore,
        quality,
        finalPos: releasePos,
        evaluation: evaluateQuality(quality),
      }
    },

    /** 松手投掷：结算结果并落到玩家头上，返回完整结果供动画层播放 */
    releaseCharge(releasePos) {
      if (this.phase !== 'throwing' || !this.isCharging || !this.selectedPot) return null
      this.isCharging = false

      const result = this.calculateHit(releasePos)
      this.player.score += result.score
      this.player.throwCount += 1
      if (result.hit) this.player.hitCount += 1

      // 上报本轮作答+投壶（入队串行发送，失败不阻断游戏）
      if (this.sessionId) {
        const sid = this.sessionId
        const payload = {
          roundNo: this.round,
          sceneId: this.currentScene?.id != null ? String(this.currentScene.id) : null,
          optionKey: this.lastAnswer.chosenKey,
          potType: result.potType.toUpperCase(),
          pointerPos: releasePos,
          inZone: result.hit, // 确定性判定：命中即指针落入区间
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

    /** 本轮动画/解析展示完毕后调用：判断题轮次先进答题，否则按流程推进 */
    finishRound() {
      // 清理本轮作答与蓄力状态
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

    /** 流程推进：最后一轮进结算入口，否则下一轮 */
    proceedRound() {
      if (this.round === FINAL_ROUND) {
        this.phase = 'finishing'
      } else {
        this.advanceToNextRound()
      }
    },

    /** 进入下一轮 */
    advanceToNextRound() {
      this.round += 1
      this.setRoundScene(this.round)
      this.phase = 'playing'
    },

    /** 终局：本地清算兜底 + 生成讲评报告，服务端重算为权威结果 */
    async finishGame() {
      this.settlePlayer(this.player)
      this.finalReport = this.buildReport(this.player)
      this.phase = 'finished'

      // 等此前的作答/答题全部上报完，再请求服务端清算
      if (this.sessionId) {
        const sid = this.sessionId
        try {
          await reportQueue
          const server = await touhuApi.finishSession(sid)
          this.finalReport = { ...this.finalReport, server }
          // 以服务端权威分数为准（本地计算与之理论上一致，仅作展示兜底）
          this.player.score = server.finalScore
        } catch (e) {
          console.warn('[投壶拒腐] 终局清算上报失败，展示本地结算结果', e)
          this.finalReport = { ...this.finalReport, serverFailed: true }
          this.reportError = '终局成绩未能同步到服务器，请截图本页并联系组织者'
        }
      }
    },

    /** 本地清算：清风令每枚 +10 并入总分（与后端 SettlementService 口径一致） */
    settlePlayer(player) {
      player.rawScore = player.score // 清算前分数（供滚动动画展示）
      if (player.breezeTokens > 0) {
        player.score += player.breezeTokens * this.tokenBonus
      }
    },

    /** 构建讲评报告：答题正确数、投壶命中率、个人感受 */
    buildReport(player) {
      return {
        correctAnswers: player.correctAnswerCount,
        totalRounds: TOTAL_ROUNDS,
        throwCount: player.throwCount,
        hitCount: player.hitCount,
        quizCorrect: player.correctQuizCount,
        feeling: HUMAN_FEELING,
      }
    },

    /** 退出/重置本局（同时放弃服务器上的对局） */
    quitGame() {
      const sid = this.sessionId
      const active = this.phase !== 'idle' && this.phase !== 'finished'
      this.$reset()
      if (sid && active) {
        reportQueue = reportQueue
          .then(() => touhuApi.abandonSession(sid))
          .catch((e) => console.warn('[投壶拒腐] 放弃对局上报失败', e))
      }
    },
  },
})

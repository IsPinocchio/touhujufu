<script setup>
/**
 * 游戏主界面：状态机驱动 + 动画编排
 * 每轮流程：显示场景 -> 选壶蓄力 -> 松手投壶 -> 箭飞出/命中/未中 -> 抽卡 -> 可选付费查看 -> 法规判断题（第 2/4/6/8 轮）
 * 关键动画（箭飞行、得分飘字、抽卡落桌）通过 Web Animations API 播放，仅用 transform/opacity
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '@/stores/game'
import { useSettingsStore } from '@/stores/settings'
import { playSound } from '@/utils/audio'
import { DEBUG } from '@/utils/debug'
import { POTS } from '@/utils/probability'
import { APP_VERSION } from '@/data/config'

import ScoreBoard from '@/components/game/ScoreBoard.vue'
import SceneCard from '@/components/game/SceneCard.vue'
import PotBoard from '@/components/game/PotBoard.vue'
import Arrow from '@/components/game/Arrow.vue'
import ClueCard from '@/components/game/ClueCard.vue'
import ClueCardTray from '@/components/game/ClueCardTray.vue'
import InspectionModal from '@/components/game/InspectionModal.vue'
import ConfessModal from '@/components/game/ConfessModal.vue'
import QuizModal from '@/components/game/QuizModal.vue'
import MarkedBadge from '@/components/game/MarkedBadge.vue'

const router = useRouter()
const store = useGameStore()
const settings = useSettingsStore()

// 动画开关：关闭时动画时长压缩到极小
const dur = (ms) => (settings.animationEnabled ? ms : 1)
const wait = (ms) => new Promise((r) => setTimeout(r, dur(ms)))

const potBoardRef = ref(null)
const trayRef = ref(null)
const fxArrowRef = ref(null)
const fxFloatRef = ref(null)
const fxCardRef = ref(null)

const playing = ref(false) // 动画播放中，禁用投掷
const hint = ref(null) // 教育点提示
const statusText = ref('') // 当前投掷状态
let hintTimer = null

// 调试：投掷历史与手卡真实类型（仅 ?debug=1 时展示）
const debugSeq = ref(0)
const debugThrows = ref([])
const debugCards = computed(() =>
  store.player?.clueCards.map((c) => `${c.revealed ? '' : '反扣:'}${c.type}`).join(' '),
)

// 底部状态提示文案（未选壶时引导；选壶后由蓄力条自带文案提示）
const tipText = computed(() => {
  if (playing.value) return statusText.value
  if (store.selectedPot) return ''
  return '先选择一个壶，对应你在场景中的选择'
})

const HALF_ARROW_W = 11
const CARD_HW = 36
const CARD_HH = 50

// —— 入场兜底：无存档回封面页，已结束去结算页 ——
onMounted(() => {
  if (!store.player) {
    router.replace('/game')
    return
  }
  if (store.phase === 'finished') router.replace('/result')
})

onUnmounted(() => {
  clearTimeout(hintTimer)
})

/** 玩家松手投掷入口：单结果流程 */
async function onThrow(result) {
  if (playing.value || store.phase !== 'playing') return
  playing.value = true
  hint.value = null
  playSound('throw')

  if (DEBUG) {
    debugThrows.value.push({ seq: ++debugSeq.value, round: store.round, ...result })
    if (debugThrows.value.length > 12) debugThrows.value.shift()
  }

  statusText.value = '你投掷中…'
  await playSingleResult(result, false)

  // 出手后短暂展示教育点
  if (store.currentScene?.hint) {
    showHint(store.currentScene.hint)
  }
  await wait(340)
  statusText.value = ''

  store.finishRound()
  playing.value = false
}

/** 播放单次投掷：箭飞行 + 命中/未中反馈 + 抽卡 */
async function playSingleResult(r, fast = false) {
  await flyArrow(r, fast)

  if (r.hit) {
    playSound('hit')
    potBoardRef.value?.shake(r.potType)
    floatAt(r, `+${r.score}`, 'fx-float--score')
    await wait(fast ? 260 : 480)

    if (r.drawCard) {
      const target = potBoardRef.value?.getPotMouthEl(r.potType)
      await playCardDraw(target)
    }
  } else {
    playSound('miss')
    floatAt(r, '未中', 'fx-float--miss')
    await wait(fast ? 260 : 480)
  }
}

/** 箭飞行：沿弧线从底部中央飞向目标壶 */
async function flyArrow(r, fast = false) {
  const el = fxArrowRef.value
  const target = potBoardRef.value?.getPotMouthEl(r.potType)
  if (!el || !target) return

  const tr = target.getBoundingClientRect()
  // 起点：蓄力按钮中心；按钮不在（兜底）时用屏幕底部中央
  const btn = potBoardRef.value?.getPowerBtnEl?.()
  let sx = window.innerWidth / 2
  let sy = window.innerHeight - 50
  if (btn) {
    const br = btn.getBoundingClientRect()
    sx = br.left + br.width / 2
    sy = br.top
  }
  let ex = tr.left + tr.width / 2
  let ey = tr.top + tr.height * 0.14
  let rot = Math.atan2(ey - sy, ex - sx) * (180 / Math.PI) + 90

  if (!r.hit) {
    // 未命中：擦壶而过，落在壶旁边
    ex += (Math.random() < 0.5 ? -1 : 1) * (26 + Math.random() * 20)
    ey += 18 + Math.random() * 14
    rot += (Math.random() < 0.5 ? -1 : 1) * (20 + Math.random() * 30)
  }

  const arc = -Math.min(150, Math.abs(ey - sy) * 0.6 + 70)
  const mx = (sx + ex) / 2
  const my = Math.min(sy, ey) + arc

  el.style.opacity = '1'
  const anim = el.animate(
    [
      { transform: `translate(${sx - HALF_ARROW_W}px, ${sy}px) rotate(${rot}deg)`, opacity: 1 },
      {
        transform: `translate(${mx - HALF_ARROW_W}px, ${my}px) rotate(${rot}deg)`,
        opacity: 1,
        offset: 0.5,
      },
      {
        transform: `translate(${ex - HALF_ARROW_W}px, ${ey}px) rotate(${rot}deg)`,
        opacity: r.hit ? 1 : 0.5,
      },
    ],
    { duration: dur(fast ? 420 : 700), easing: 'cubic-bezier(0.35, 0, 0.5, 1)' },
  )
  await anim.finished.catch(() => {}) // 动画被取消（如路由跳转）时不中断流程

  if (r.hit) {
    // 命中后箭尾轻微抖动
    el.animate(
      [
        { transform: `translate(${ex - HALF_ARROW_W}px, ${ey}px) rotate(${rot}deg)` },
        { transform: `translate(${ex - HALF_ARROW_W}px, ${ey}px) rotate(${rot + 6}deg)` },
        { transform: `translate(${ex - HALF_ARROW_W}px, ${ey}px) rotate(${rot - 5}deg)` },
        { transform: `translate(${ex - HALF_ARROW_W}px, ${ey}px) rotate(${rot}deg)` },
      ],
      { duration: dur(220) },
    )
    await wait(220)
  }
  el.style.opacity = '0'
}

/** 得分 / 未中 飘字 */
function floatAt(r, text, cls) {
  const el = fxFloatRef.value
  const target = potBoardRef.value?.getPotMouthEl(r.potType)
  if (!el || !target) return
  const tr = target.getBoundingClientRect()
  el.textContent = text
  el.className = `fx-float ${cls}`
  el.style.left = `${tr.left + tr.width / 2}px`
  el.style.top = `${tr.top}px`
  el.style.opacity = '1'
  el.style.animation = 'none'
  void el.offsetWidth // 重置动画
  el.style.animation = 'float-up 1s ease forwards'
}

/** 抽卡：卡片从壶口飞出，落向右侧托盘 */
async function playCardDraw(targetEl) {
  const el = fxCardRef.value
  if (!el || !targetEl) return
  const r = targetEl.getBoundingClientRect()
  const sx = r.left + r.width / 2
  const sy = r.top
  // 落点：右侧托盘中心；托盘未就绪时回退到底部中央
  const trayRect = trayRef.value?.rootEl()?.getBoundingClientRect()
  const ex = trayRect ? trayRect.left + trayRect.width / 2 : window.innerWidth / 2
  const ey = trayRect ? trayRect.top + trayRect.height / 2 : window.innerHeight - 70

  el.style.opacity = '1'
  const anim = el.animate(
    [
      { transform: `translate(${sx - CARD_HW}px, ${sy - CARD_HH}px) rotate(0deg) scale(0.6)`, opacity: 1 },
      {
        transform: `translate(${(sx + ex) / 2 - CARD_HW}px, ${Math.min(sy, ey) - 130 - CARD_HH}px) rotate(200deg) scale(1)`,
        opacity: 1,
        offset: 0.6,
      },
      { transform: `translate(${ex - CARD_HW}px, ${ey - CARD_HH}px) rotate(360deg) scale(1)`, opacity: 1 },
    ],
    { duration: dur(620), easing: 'cubic-bezier(0.3, 0, 0.4, 1)' },
  )
  playSound('card')
  await anim.finished.catch(() => {})
  el.style.opacity = '0'
}

/** 展示教育点提示（短暂显示后消失） */
function showHint(text) {
  hint.value = text
  clearTimeout(hintTimer)
  hintTimer = setTimeout(() => {
    hint.value = null
  }, dur(3200))
}

// —— 弹窗回调 ——
function onMidDismiss() {
  playSound('warning')
  store.dismissMidInspection()
}
function onConfess() {
  playSound('flip')
  store.confess()
  store.dismissConfess()
}
function onSkipConfess() {
  store.dismissConfess()
}
function onQuizAnswer(correct) {
  playSound(correct ? 'win' : 'warning')
  store.answerQuiz(correct)
}
function onFinalDismiss() {
  playSound('settle')
  store.finalInspection()
  router.push('/result')
}
</script>

<template>
  <div class="page game-page">
    <!-- 玩家信息栏 -->
    <ScoreBoard :player="store.player" :round="store.round" />

    <!-- 场景卡 -->
    <SceneCard
      v-if="store.currentScene && store.phase === 'playing'"
      :key="store.round"
      :round="store.round"
      :scene="store.currentScene.scene"
    />

    <!-- 教育点提示 -->
    <Transition name="fade">
      <div v-if="hint" class="hint-toast">{{ hint }}</div>
    </Transition>

    <!-- 成绩上报失败常驻提醒（重试后仍失败时出现） -->
    <Transition name="fade">
      <div v-if="store.reportError" class="report-error" role="alert">{{ store.reportError }}</div>
    </Transition>

    <!-- 投壶选择区 -->
    <div class="game-page__board">
      <PotBoard
        ref="potBoardRef"
        :options="store.currentScene?.options"
        :disabled="playing || store.phase !== 'playing'"
        @throw="onThrow"
      />
    </div>

    <!-- 线索卡托盘：投壶区下方的横栏，反扣罗列，点击付费查看 -->
    <ClueCardTray ref="trayRef" />

    <!-- 状态提示 -->
    <p class="game-page__tip" aria-live="polite">
      {{ tipText }}
    </p>

    <!-- 巡视 / 交代 / 答题弹窗 -->
    <InspectionModal
      v-if="store.phase === 'midInspection'"
      mode="mid"
      :player="store.player"
      @dismiss="onMidDismiss"
    />
    <ConfessModal
      v-if="store.phase === 'confess'"
      :player="store.player"
      @confess="onConfess"
      @skip="onSkipConfess"
    />
    <QuizModal
      v-if="store.phase === 'quiz' && store.currentQuiz"
      :quiz="store.currentQuiz"
      @answer="onQuizAnswer"
    />
    <InspectionModal
      v-if="store.phase === 'finalInspection'"
      mode="final"
      :player="store.player"
      @dismiss="onFinalDismiss"
    />

    <!-- 被标记提醒 -->
    <MarkedBadge v-if="store.humanMarked" />

    <!-- 调试面板 -->
    <div v-if="DEBUG" class="debug-panel">
      <div>v{{ APP_VERSION }} · 第 {{ store.round }} 轮 · phase={{ store.phase }}</div>
      <div v-for="r in debugThrows" :key="r.seq" class="debug-panel__row">
        [{{ r.round }}R] {{ POTS[r.potType].name }} 命中={{ r.hit }} 得分+{{ r.score }} 卡={{ r.cardType || '无' }}
      </div>
      <div class="debug-panel__row">
        手卡: {{ debugCards || '（空）' }}
      </div>
    </div>

    <!-- 特效层：箭 / 飘字 / 卡片 -->
    <div class="fx-layer" aria-hidden="true">
      <div ref="fxArrowRef" class="fx-arrow"><Arrow /></div>
      <div ref="fxFloatRef" class="fx-float"></div>
      <div ref="fxCardRef" class="fx-card"><ClueCard type="safe" :revealed="false" :size="72" /></div>
    </div>
  </div>
</template>

<style scoped>
.game-page {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--gap-md);
}
.game-page__board {
  display: flex;
  justify-content: center;
}
.game-page__tip {
  text-align: center;
  font-size: 13px;
  color: var(--color-ink-soft);
  min-height: 20px;
}

.hint-toast {
  padding: 10px 14px;
  background: rgba(63, 92, 74, 0.95);
  color: var(--color-cream);
  border-radius: var(--radius-sm);
  font-size: 13px;
  line-height: 1.6;
  box-shadow: var(--shadow-card);
}

.report-error {
  position: fixed;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 90;
  padding: 8px 14px;
  background: rgba(158, 43, 37, 0.95);
  color: var(--color-cream);
  border-radius: var(--radius-sm);
  font-size: 13px;
  box-shadow: var(--shadow-card);
}

/* —— 特效层 —— */
.fx-layer {
  position: fixed;
  inset: 0;
  z-index: 50;
  pointer-events: none;
}
.fx-arrow {
  position: absolute;
  left: 0;
  top: 0;
  opacity: 0;
  transform-origin: 50% 0%; /* 以箭头尖端为旋转轴心 */
}
.fx-float {
  position: absolute;
  opacity: 0;
  transform: translate(-50%, -50%);
  font-family: var(--font-serif);
  font-size: 24px;
  font-weight: 700;
  pointer-events: none;
}
.fx-float--score {
  color: var(--color-gold);
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}
.fx-float--miss {
  color: var(--color-ink-soft);
  font-size: 18px;
}
.fx-card {
  position: absolute;
  left: 0;
  top: 0;
  opacity: 0;
  transform-origin: 50% 50%;
}

/* —— 调试面板 —— */
.debug-panel {
  position: fixed;
  right: 8px;
  bottom: 8px;
  z-index: 80;
  padding: 10px;
  background: rgba(0, 0, 0, 0.8);
  color: #7fff7f;
  font-family: monospace;
  font-size: 11px;
  border-radius: 8px;
  max-width: 90vw;
}
.debug-panel__row {
  white-space: nowrap;
}
</style>

<script setup>
/**
 * 结算与讲评页
 * - 玩家最终成绩、廉洁文化课程
 * - 讲评（本局回顾、30 秒感受、收尾语）
 * - 战绩分享、重玩
 */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '@/stores/touhu'
import { partyKnowledge } from '@/data/knowledge'
import { COURSE_MIN_SCORE } from '@/data/touhu/config'
import GameOverSummary from '@/components/touhu/GameOverSummary.vue'
import SvgIcon from '@/components/common/SvgIcon.vue'

const router = useRouter()
const store = useGameStore()

const courseModalOpen = ref(false)
const copied = ref(false)

const human = computed(() => store.player)
const report = computed(() => store.finalReport)

/** 最终分数过低需领学廉洁文化课程 */
const requiredCourses = computed(() => {
  const h = human.value
  if (!h) return 0
  return h.score < COURSE_MIN_SCORE ? 1 : 0
})

// 展示的课程条目
const courseItems = computed(() => partyKnowledge.slice(0, Math.max(requiredCourses.value, 1)))

const shareText = computed(() => {
  const h = human.value
  if (!h) return ''
  return `我在「投壶拒腐」中答对 ${h.correctAnswerCount} 道情景题，投壶 ${h.throwCount} 投 ${h.hitCount} 中，最终得分 ${h.score}。守廉从每一次选择开始。`
})

onMounted(() => {
  // 无结算数据时兜底回首页
  if (!report.value || !human.value) {
    router.replace('/')
  }
})

async function copyShare() {
  try {
    await navigator.clipboard.writeText(shareText.value)
  } catch (e) {
    const ta = document.createElement('textarea')
    ta.value = shareText.value
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
  }
  copied.value = true
  setTimeout(() => (copied.value = false), 2000)
}

async function replay() {
  try {
    await store.initGame()
    router.push('/game/play')
  } catch (e) {
    console.warn('[投壶拒腐] 重新开局失败', e)
    router.push('/game')
  }
}

function goHome() {
  store.quitGame()
  router.push('/')
}
</script>

<template>
  <div class="page result">
    <!-- 个人成绩卡 -->
    <section v-if="human" class="result__hero card anim-slide-down">
      <div class="result__stats">
        <div class="result__stat">
          <span class="result__stat-val">{{ human.score }}</span>
          <span class="result__stat-key">最终得分</span>
        </div>
        <div class="result__stat">
          <span class="result__stat-val">{{ human.correctAnswerCount }}</span>
          <span class="result__stat-key">答对题数</span>
        </div>
        <div class="result__stat">
          <span class="result__stat-val">{{ human.hitCount }}/{{ human.throwCount }}</span>
          <span class="result__stat-key">投壶命中</span>
        </div>
        <div class="result__stat">
          <span class="result__stat-val">{{ human.breezeTokens }}</span>
          <span class="result__stat-key">清风令</span>
        </div>
      </div>

      <p v-if="human.breezeTokens > 0" class="result__breeze">
        清风令 ×{{ human.breezeTokens }}，清算 +{{ human.breezeTokens * store.tokenBonus }} 分。
      </p>

      <!-- 廉洁文化课程 -->
      <div v-if="requiredCourses > 0" class="result__course">
        <p class="result__course-text">
          最终分数低于 {{ COURSE_MIN_SCORE }} 分，需完成 <strong>{{ requiredCourses }}</strong> 次廉洁文化课程。
        </p>
        <button class="btn btn--green btn--block" type="button" @click="courseModalOpen = true">
          完成廉洁文化课程
        </button>
      </div>
    </section>

    <!-- 讲评 -->
    <GameOverSummary v-if="report" :report="report" />

    <!-- 分享与操作 -->
    <div class="result__actions">
      <button class="btn btn--ghost btn--block" type="button" @click="copyShare">
        <SvgIcon name="share" :size="18" /> {{ copied ? '已复制' : '复制分享战绩' }}
      </button>
      <button class="btn btn--primary btn--block" type="button" @click="replay">
        <SvgIcon name="refresh" :size="18" /> 再玩一局
      </button>
      <button class="btn btn--ghost btn--block" type="button" @click="goHome">返回首页</button>
    </div>

    <!-- 廉洁文化课程弹窗 -->
    <Transition name="fade">
      <div v-if="courseModalOpen" class="course-overlay" @click.self="courseModalOpen = false">
        <div class="course-modal anim-pop-in" role="dialog" aria-modal="true">
          <h3 class="course-modal__title">廉洁文化课程</h3>
          <div class="course-modal__list">
            <div v-for="(k, i) in courseItems" :key="i" class="course-modal__item">
              <h4 class="course-modal__item-title">{{ k.title }}</h4>
              <p class="course-modal__item-body">{{ k.body }}</p>
            </div>
          </div>
          <button class="btn btn--primary btn--block" type="button" @click="courseModalOpen = false">
            我知道了
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.result {
  gap: var(--gap-lg);
}
.result__hero {
  display: flex;
  flex-direction: column;
  gap: var(--gap-md);
  text-align: center;
}
.result__stats {
  display: flex;
  justify-content: space-around;
}
.result__stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.result__stat-val {
  font-family: var(--font-serif);
  font-size: 26px;
  font-weight: 700;
  color: var(--color-ink);
}
.result__stat-key {
  font-size: 12px;
  color: var(--color-ink-soft);
}
.result__breeze {
  font-size: 13px;
  color: var(--color-green);
  font-weight: 600;
}
.result__course {
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
  padding: var(--gap-md);
  background: rgba(158, 43, 37, 0.06);
  border-radius: var(--radius-md);
}
.result__course-text {
  font-size: 14px;
  line-height: 1.7;
}
.result__actions {
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
}

/* —— 课程弹窗 —— */
.course-overlay {
  position: fixed;
  inset: 0;
  z-index: 70;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--gap-md);
  background: rgba(43, 33, 24, 0.7);
}
.course-modal {
  width: 100%;
  max-width: 440px;
  max-height: 84vh;
  overflow-y: auto;
  background: var(--color-cream);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-float);
  padding: var(--gap-lg);
  display: flex;
  flex-direction: column;
  gap: var(--gap-md);
}
.course-modal__title {
  font-size: 20px;
  letter-spacing: 0.08em;
  text-align: center;
  color: var(--color-brown-dark);
}
.course-modal__list {
  display: flex;
  flex-direction: column;
  gap: var(--gap-md);
}
.course-modal__item {
  padding: var(--gap-md);
  background: rgba(244, 234, 216, 0.6);
  border-radius: var(--radius-sm);
  border-left: 3px solid var(--color-green);
}
.course-modal__item-title {
  font-size: 15px;
  color: var(--color-brown-dark);
  margin-bottom: 4px;
}
.course-modal__item-body {
  font-size: 13px;
  line-height: 1.7;
  color: var(--color-ink-soft);
}
</style>

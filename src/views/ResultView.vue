<script setup>
/**
 * 结算与讲评页
 * - 玩家最终成绩、奖惩、廉洁文化课程
 * - 讲评（排名、侥幸逃脱者、被清零者、30 秒感受、收尾语）
 * - 战绩分享、重玩
 */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '@/stores/game'
import { partyKnowledge } from '@/data/knowledge'
import { COURSE_MIN_SCORE, COURSE_FOR_RISKY, COURSE_COUNT, TOKEN_BONUS } from '@/data/config'
import GameOverSummary from '@/components/game/GameOverSummary.vue'
import SvgIcon from '@/components/common/SvgIcon.vue'

const router = useRouter()
const store = useGameStore()

const courseModalOpen = ref(false)
const copied = ref(false)

const human = computed(() => store.humanPlayer)
const report = computed(() => store.finalReport)

const penaltyLabel = {
  none: '平安着陆',
  light: '党纪轻处分',
  heavy: '重处分',
}

/** 需要完成的廉洁文化课程次数（方案 2.6：分数过低或投过风险壶者均需领学） */
const requiredCourses = computed(() => {
  const h = human.value
  if (!h) return 0
  let n = 0
  if (h.penalty === 'heavy') n = COURSE_COUNT.heavy
  else if (h.penalty === 'light') n = COURSE_COUNT.light
  if (h.score < COURSE_MIN_SCORE || (COURSE_FOR_RISKY && h.usedRiskyPot)) {
    n = Math.max(n, 1)
  }
  return n
})

const courseReason = computed(() => {
  const h = human.value
  if (!h) return ''
  const reasons = []
  if (h.penalty === 'heavy') reasons.push('受重处分（线索达 2 条及以上）')
  if (h.penalty === 'light') reasons.push('受轻处分（1 条线索）')
  if (h.score < COURSE_MIN_SCORE) reasons.push(`最终分数低于 ${COURSE_MIN_SCORE} 分`)
  if (COURSE_FOR_RISKY && h.usedRiskyPot) reasons.push('投过腐败 / 擦边壶')
  return reasons.join('，')
})

// 展示的课程条目
const courseItems = computed(() => partyKnowledge.slice(0, Math.max(requiredCourses.value, 1)))

const shareText = computed(() => {
  const h = human.value
  if (!h) return ''
  const rankCn = ['', '一', '二', '三', '四'][h.rank] || h.rank
  return `我在「投壶拒腐」中最终得分 ${h.score}，排名第 ${rankCn}（共 4 人），被巡视组发现 ${h.finalClueCount} 条线索（${penaltyLabel[h.penalty]}）。侥幸心理，害人不浅。`
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

function replay() {
  store.initGame()
  router.push('/game')
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
      <div class="result__rank">
        <span class="result__rank-num">#{{ human.rank }}</span>
        <span v-if="human.rank === 1" class="result__medal">
          <SvgIcon name="medal" :size="20" /> 清风标兵
        </span>
      </div>
      <div class="result__stats">
        <div class="result__stat">
          <span class="result__stat-val">{{ human.score }}</span>
          <span class="result__stat-key">最终得分</span>
        </div>
        <div class="result__stat">
          <span class="result__stat-val">{{ human.finalClueCount }}</span>
          <span class="result__stat-key">线索数</span>
        </div>
        <div class="result__stat">
          <span class="result__stat-val">{{ human.breezeTokens }}</span>
          <span class="result__stat-key">清风令</span>
        </div>
        <div class="result__stat">
          <span class="result__stat-val result__stat-val--small">{{ penaltyLabel[human.penalty] }}</span>
          <span class="result__stat-key">处理结果</span>
        </div>
      </div>

      <p v-if="human.breezeAward" class="result__breeze">清风奖 +30：全程未投腐败 / 擦边壶。</p>
      <p v-if="human.breezeTokens > 0" class="result__breeze">
        清风令 ×{{ human.breezeTokens }}，清算 +{{ human.breezeTokens * TOKEN_BONUS }} 分。
      </p>
      <p v-if="human.confessed" class="result__confessed">你曾主动交代：扣除了风险壶全部分数并消除了所有线索卡。</p>

      <!-- 廉洁文化课程 -->
      <div v-if="requiredCourses > 0" class="result__course">
        <p class="result__course-text">
          {{ courseReason }}，需完成 <strong>{{ requiredCourses }}</strong> 次廉洁文化课程。
        </p>
        <button class="btn btn--green btn--block" type="button" @click="courseModalOpen = true">
          完成廉洁文化课程
        </button>
      </div>
    </section>

    <!-- 讲评 -->
    <GameOverSummary v-if="report" :report="report" human-id="human" />

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
.result__rank {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--gap-md);
}
.result__rank-num {
  font-family: var(--font-serif);
  font-size: 44px;
  font-weight: 700;
  color: var(--color-brown-dark);
}
.result__medal {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(184, 134, 63, 0.18);
  color: var(--color-gold);
  font-weight: 700;
  font-size: 14px;
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
.result__stat-val--small {
  font-size: 17px;
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
.result__confessed {
  font-size: 13px;
  color: var(--color-ink-soft);
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

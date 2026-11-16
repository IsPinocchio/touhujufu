<script setup>
/**
 * 讲评：清算后的最终呈现
 * - 本局数据回顾（答对题数 / 投壶命中率 / 清风令）
 * - 真实玩家排行榜（后端数据）
 * - 一句 30 秒感受
 * - 主持人收尾语
 */
import { ref, onMounted } from 'vue'
import SvgIcon from '@/components/common/SvgIcon.vue'
import { touhuApi } from '@/utils/touhu/api'
import { useAuthStore } from '@/stores/auth'

const props = defineProps({
  report: { type: Object, required: true }, // { correctAnswers, totalRounds, throwCount, hitCount, quizCorrect, feeling, server? }
})

const auth = useAuthStore()
const leaderboard = ref(null) // null=加载中 []=空
const boardError = ref(false)

onMounted(async () => {
  try {
    leaderboard.value = await touhuApi.leaderboard(50)
  } catch {
    boardError.value = true
  }
})

const CLOSING = '守廉不难，难在每一次都选对——把每一次抉择，都当作组织在看着。'
</script>

<template>
  <div class="summary">
    <!-- 本局数据回顾 -->
    <section class="summary__section">
      <h3 class="summary__heading">本局回顾</h3>
      <ul class="summary__facts">
        <li>情景抉择：答对 <strong>{{ report.correctAnswers }}</strong> / {{ report.totalRounds }} 题</li>
        <li>
          投壶定分：{{ report.throwCount }} 投 {{ report.hitCount }} 中
          <template v-if="report.throwCount > 0">
            （命中率 {{ Math.round((report.hitCount / report.throwCount) * 100) }}%）
          </template>
        </li>
        <li>法规判断：答对 {{ report.quizCorrect }} 题，清风令清算加分已并入总分</li>
      </ul>
    </section>

    <!-- 真实玩家排行榜（自然周榜，每周一重置） -->
    <section class="summary__section">
      <h3 class="summary__heading">
        <SvgIcon name="rank" :size="18" /> 本周排行榜
        <span class="summary__heading-note">每周一重置</span>
      </h3>
      <p v-if="boardError" class="summary__desc">排行榜加载失败，请稍后刷新查看。</p>
      <p v-else-if="leaderboard === null" class="summary__desc">加载中…</p>
      <p v-else-if="leaderboard.length === 0" class="summary__desc">本周暂无排名，快来抢占榜首。</p>
      <ol v-else class="board">
        <li
          v-for="entry in leaderboard"
          :key="entry.userId"
          class="board__row"
          :class="{ 'board__row--me': entry.userId === auth.user?.id }"
        >
          <span class="board__rank" :class="{ 'board__rank--top': entry.rank <= 3 }">{{ entry.rank }}</span>
          <span class="board__name">{{ entry.displayName }}</span>
          <span class="board__dept">{{ entry.department }}</span>
          <span class="board__meta">{{ entry.gamesThisWeek }} 局</span>
          <span class="board__score">{{ entry.bestScore }}</span>
        </li>
      </ol>
    </section>

    <!-- 30 秒感受 -->
    <section class="summary__section">
      <h3 class="summary__heading">30 秒感受</h3>
      <div class="feeling-item">
        <span class="feeling-item__name">你</span>
        <p class="feeling-item__text">「{{ report.feeling }}」</p>
      </div>
    </section>

    <!-- 主持人收尾语 -->
    <section class="summary__section summary__closing">
      <p class="summary__closing-text">{{ CLOSING }}</p>
    </section>
  </div>
</template>

<style scoped>
.summary {
  display: flex;
  flex-direction: column;
  gap: var(--gap-lg);
}
.summary__section {
  background: var(--color-cream);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  padding: var(--gap-lg);
}
.summary__heading {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 17px;
  letter-spacing: 0.06em;
  margin-bottom: var(--gap-sm);
  color: var(--color-brown-dark);
}
.summary__heading-note {
  font-size: 11px;
  font-weight: 400;
  color: var(--color-ink-soft);
  letter-spacing: 0;
}
.summary__desc {
  font-size: 13px;
  color: var(--color-ink-soft);
}
.summary__facts {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 14px;
  line-height: 1.7;
  color: var(--color-ink);
}
.summary__facts li::before {
  content: '·';
  margin-right: 8px;
  color: var(--color-red);
  font-weight: 700;
}
.summary__facts strong {
  color: var(--color-green);
}

/* —— 排行榜 —— */
.board {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.board__row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  font-size: 14px;
}
.board__row--me {
  background: rgba(63, 92, 74, 0.12);
  font-weight: 700;
}
.board__rank {
  width: 24px;
  text-align: center;
  font-family: var(--font-serif);
  color: var(--color-ink-soft);
  font-variant-numeric: tabular-nums;
}
.board__rank--top {
  color: var(--color-gold);
  font-weight: 700;
}
.board__name {
  flex-shrink: 0;
  min-width: 3em;
}
.board__dept {
  flex: 1;
  font-size: 12px;
  color: var(--color-ink-soft);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.board__meta {
  font-size: 11px;
  color: var(--color-ink-soft);
  flex-shrink: 0;
  /* 数字位数不同会导致上下行错位：固定宽度 + 右对齐 + 等宽数字 */
  min-width: 40px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.board__score {
  font-family: var(--font-serif);
  font-weight: 700;
  color: var(--color-brown-dark);
  min-width: 36px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.feeling-item {
  padding: 10px 12px;
  border-left: 3px solid var(--color-green);
}
.feeling-item__name {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-ink-soft);
}
.feeling-item__text {
  font-size: 14px;
  line-height: 1.7;
  margin-top: 2px;
}

.summary__closing {
  background: var(--color-brown-dark);
  text-align: center;
  padding: var(--gap-xl) var(--gap-lg);
}
.summary__closing-text {
  font-family: var(--font-serif);
  font-size: 20px;
  line-height: 1.8;
  color: var(--color-cream);
  font-weight: 700;
  letter-spacing: 0.04em;
}
</style>

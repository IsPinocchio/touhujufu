<script setup>
/**
 * 讲评：清算后的最终呈现
 * - 真实玩家排行榜（后端数据，投过风险壶者已被记录在案，等待大清洗）
 * - 侥幸逃脱 / 被清零 提示
 * - 一句 30 秒感受
 * - 主持人收尾语
 */
import { ref, onMounted } from 'vue'
import SvgIcon from '@/components/common/SvgIcon.vue'
import { api } from '@/utils/api'
import { useAuthStore } from '@/stores/auth'

const props = defineProps({
  report: { type: Object, required: true }, // { escaped, zeroed, feeling, server? }
})

const auth = useAuthStore()
const leaderboard = ref(null) // null=加载中 []=空
const boardError = ref(false)

onMounted(async () => {
  try {
    leaderboard.value = await api.leaderboard(50)
  } catch {
    boardError.value = true
  }
})

const CLOSING =
  '现实里没有侥幸赔率表给你看——现实的概率是：只要你一直伸手，被抓只是时间问题。'
</script>

<template>
  <div class="summary">
    <!-- 真实玩家排行榜 -->
    <section class="summary__section">
      <h3 class="summary__heading">
        <SvgIcon name="rank" :size="18" /> 排行榜
      </h3>
      <p v-if="boardError" class="summary__desc">排行榜加载失败，请稍后刷新查看。</p>
      <p v-else-if="leaderboard === null" class="summary__desc">加载中…</p>
      <p v-else-if="leaderboard.length === 0" class="summary__desc">暂无排名，快来抢占榜首。</p>
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
          <span class="board__score">{{ entry.bestScore }}</span>
        </li>
      </ol>
      <p v-if="props.report.server?.usedRiskyPot" class="summary__purge-note">
        本局你投过腐败 / 擦边壶，已被记录在案——当前分数只是暂时保留，等待下一次「大清洗」。
      </p>
    </section>

    <!-- 侥幸逃脱 -->
    <section v-if="report.escaped" class="summary__section">
      <h3 class="summary__heading summary__heading--escape">侥幸逃脱</h3>
      <p class="summary__desc">
        你投过腐败 / 擦边壶，却没有留下线索——这只是运气好，不是真的干净。
      </p>
    </section>

    <!-- 被清零 -->
    <section v-if="report.zeroed" class="summary__section">
      <h3 class="summary__heading summary__heading--zero">被清零</h3>
      <p class="summary__desc">线索达 2 条及以上，总分清零，接受重处分。</p>
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
.summary__heading--escape {
  color: var(--color-gold);
}
.summary__heading--zero {
  color: var(--color-red);
}
.summary__desc {
  font-size: 13px;
  color: var(--color-ink-soft);
}
.summary__purge-note {
  margin-top: var(--gap-sm);
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  background: rgba(158, 43, 37, 0.08);
  font-size: 12px;
  line-height: 1.7;
  color: var(--color-red);
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
}
.board__rank--top {
  color: var(--color-gold);
  font-weight: 700;
}
.board__name {
  flex-shrink: 0;
}
.board__dept {
  flex: 1;
  font-size: 12px;
  color: var(--color-ink-soft);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.board__score {
  font-family: var(--font-serif);
  font-weight: 700;
  color: var(--color-brown-dark);
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


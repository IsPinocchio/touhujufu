<script setup>
/**
 * 本周排行榜（独立页）
 * - 自然周榜：本周已完结、未被清洗的对局，每人取最高分
 * - 数据来自后端 /api/leaderboard，与结算页内嵌榜单同源
 */
import { ref, onMounted } from 'vue'
import { touhuApi } from '@/utils/touhu/api'
import { useAuthStore } from '@/stores/auth'
import SvgIcon from '@/components/common/SvgIcon.vue'

const auth = useAuthStore()
const leaderboard = ref(null) // null=加载中 []=空
const loadError = ref(false)

const penaltyLabel = {
  NONE: '平安着陆',
  LIGHT: '轻处分',
  HEAVY: '重处分',
}

async function load() {
  loadError.value = false
  try {
    leaderboard.value = await touhuApi.leaderboard(50)
  } catch {
    loadError.value = true
  }
}

onMounted(load)
</script>

<template>
  <div class="page board-page">
    <section class="board-page__main card anim-slide-up">
      <h2 class="board-page__heading">
        <SvgIcon name="rank" :size="20" /> 本周排行榜
        <button class="board-page__refresh" type="button" aria-label="刷新" @click="load">
          <SvgIcon name="refresh" :size="16" />
        </button>
      </h2>
      <p class="board-page__note">
        每周一 00:00 重置；投过腐败 / 擦边壶且未主动交代者，成绩只是暂时保留，等待「大清洗」。
      </p>

      <p v-if="loadError" class="board-page__empty">排行榜加载失败，请稍后重试。</p>
      <p v-else-if="leaderboard === null" class="board-page__empty">加载中…</p>
      <p v-else-if="leaderboard.length === 0" class="board-page__empty">
        本周暂无排名，去<RouterLink to="/game" class="board-page__link">投壶拒腐</RouterLink>抢占榜首吧。
      </p>

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
          <span class="board__meta">
            {{ entry.gamesThisWeek }} 局 · 线索 {{ entry.clueCount }} · {{ penaltyLabel[entry.penalty] || entry.penalty }}
          </span>
          <span class="board__score">{{ entry.bestScore }}</span>
        </li>
      </ol>
    </section>

    <RouterLink to="/game" class="btn btn--ghost btn--block">返回投壶拒腐</RouterLink>
  </div>
</template>

<style scoped>
.board-page {
  gap: var(--gap-lg);
}
.board-page__main {
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
}
.board-page__heading {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  letter-spacing: 0.06em;
  color: var(--color-brown-dark);
}
.board-page__refresh {
  margin-left: auto;
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: rgba(244, 234, 216, 0.7);
  color: var(--color-ink-soft);
  cursor: pointer;
}
.board-page__refresh:active {
  background: var(--color-cream-dark);
}
.board-page__note {
  font-size: 12px;
  line-height: 1.7;
  color: var(--color-ink-soft);
}
.board-page__empty {
  font-size: 13px;
  color: var(--color-ink-soft);
  text-align: center;
  padding: var(--gap-md) 0;
}
.board-page__link {
  color: var(--color-green);
  font-weight: 600;
}

/* —— 榜单（与结算页内嵌榜单同款样式） —— */
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
  white-space: nowrap;
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
</style>

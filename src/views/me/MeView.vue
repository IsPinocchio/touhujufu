<script setup>
/**
 * 我的 · 战绩页
 * - 用户信息（姓名/部门）
 * - 汇总统计：本周场次、本周最高分、总场次
 * - 逐局明细：得分、清风令
 * 数据全部来自后端 /api/game/my/history
 */
import { ref, computed, onMounted } from 'vue'
import { touhuApi } from '@/utils/touhu/api'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const history = ref(null) // null=加载中
const loadError = ref(false)

onMounted(async () => {
  try {
    history.value = await touhuApi.myHistory()
  } catch {
    loadError.value = true
  }
})

// 本周起始（周一 00:00），与后端排行榜口径一致
function weekStart() {
  const d = new Date()
  const day = d.getDay() || 7 // 周日算 7
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - day + 1)
  return d.getTime()
}

const stats = computed(() => {
  const list = history.value || []
  const since = weekStart()
  const thisWeek = list.filter((h) => new Date(h.finishedAt).getTime() >= since)
  return {
    gamesThisWeek: thisWeek.length,
    bestThisWeek: thisWeek.length ? Math.max(...thisWeek.map((h) => h.finalScore)) : 0,
    total: list.length,
  }
})

function formatTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getMonth() + 1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
</script>

<template>
  <div class="page me-page">
    <!-- 用户信息 -->
    <header class="me-page__user card anim-slide-down">
      <span class="me-page__avatar">{{ (auth.user?.displayName || '…').slice(0, 1) }}</span>
      <div class="me-page__identity">
        <p class="me-page__name">{{ auth.user?.displayName }}</p>
        <p class="me-page__dept">{{ auth.user?.department || '未填写部门' }}</p>
      </div>
    </header>

    <!-- 汇总统计 -->
    <section class="me-page__stats card anim-slide-up">
      <div class="me-page__stat">
        <span class="me-page__stat-val">{{ stats.gamesThisWeek }}</span>
        <span class="me-page__stat-key">本周场次</span>
      </div>
      <div class="me-page__stat">
        <span class="me-page__stat-val">{{ stats.bestThisWeek }}</span>
        <span class="me-page__stat-key">本周最高</span>
      </div>
      <div class="me-page__stat">
        <span class="me-page__stat-val">{{ stats.total }}</span>
        <span class="me-page__stat-key">总场次</span>
      </div>
    </section>

    <!-- 逐局明细 -->
    <section class="me-page__history card anim-slide-up">
      <h2 class="me-page__heading">历史战绩</h2>
      <p v-if="loadError" class="me-page__empty">加载失败，请稍后重试。</p>
      <p v-else-if="history === null" class="me-page__empty">加载中…</p>
      <p v-else-if="history.length === 0" class="me-page__empty">
        还没有战绩，去<RouterLink to="/game" class="me-page__link">投壶拒腐</RouterLink>玩一局吧。
      </p>
      <ul v-else class="record-list">
        <li v-for="h in history" :key="h.sessionId" class="record">
          <div class="record__main">
            <span class="record__score">{{ h.finalScore }}</span>
            <span class="record__meta">
              {{ formatTime(h.finishedAt) }} · 清风令 {{ h.breezeTokens }}
            </span>
          </div>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.me-page {
  gap: var(--gap-lg);
}
.me-page__user {
  display: flex;
  align-items: center;
  gap: var(--gap-md);
}
.me-page__avatar {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: var(--color-green);
  color: var(--color-cream);
  font-family: var(--font-serif);
  font-size: 24px;
  font-weight: 700;
  flex-shrink: 0;
}
.me-page__name {
  font-family: var(--font-serif);
  font-size: 19px;
  font-weight: 700;
  color: var(--color-brown-dark);
}
.me-page__dept {
  font-size: 13px;
  color: var(--color-ink-soft);
  margin-top: 2px;
}
.me-page__stats {
  display: flex;
  justify-content: space-around;
}
.me-page__stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.me-page__stat-val {
  font-family: var(--font-serif);
  font-size: 24px;
  font-weight: 700;
  color: var(--color-ink);
}
.me-page__stat-key {
  font-size: 12px;
  color: var(--color-ink-soft);
}
.me-page__heading {
  font-size: 17px;
  margin-bottom: var(--gap-sm);
  color: var(--color-brown-dark);
  letter-spacing: 0.06em;
}
.me-page__empty {
  font-size: 13px;
  color: var(--color-ink-soft);
  text-align: center;
  padding: var(--gap-md) 0;
}
.me-page__link {
  color: var(--color-green);
  font-weight: 600;
}
.record-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.record {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--gap-sm);
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  background: rgba(244, 234, 216, 0.5);
}
.record__main {
  display: flex;
  align-items: baseline;
  gap: 10px;
  min-width: 0;
}
.record__score {
  font-family: var(--font-serif);
  font-size: 20px;
  font-weight: 700;
  color: var(--color-brown-dark);
  /* 固定宽度 + 右对齐 + 等宽数字：一位数与两位数/三位数上下对齐不错位 */
  min-width: 40px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.record__meta {
  font-size: 12px;
  color: var(--color-ink-soft);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>

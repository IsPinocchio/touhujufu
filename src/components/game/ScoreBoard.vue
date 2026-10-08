<script setup>
/**
 * 记分表：展示每位玩家的姓名、当前总分、清风令、已抽线索卡（小圆点）
 * 可折叠，移动端默认收起，展开显示完整表格
 * 未翻开的卡显示为深红未知圆点，翻开后区分「平安」（绿）/「线索」（红）
 */
import { ref, computed } from 'vue'
import { PERSONALITY } from '@/data/ai'
import { TOTAL_ROUNDS } from '@/data/config'

const props = defineProps({
  players: { type: Array, required: true },
  round: { type: Number, default: 1 },
})

const collapsed = ref(true)

const sorted = computed(() => [...props.players].sort((a, b) => b.score - a.score))

// 常显的实时数据（折叠时也在标题栏展示）
const me = computed(() => props.players.find((p) => !p.isAI))
const myScore = computed(() => me.value?.score ?? 0)
const myTokens = computed(() => me.value?.breezeTokens ?? 0)
const myCards = computed(() => me.value?.clueCards.length ?? 0)

// 圆点样式：未知 / 平安 / 线索
function dotClass(card) {
  if (!card.revealed) return 'score-dot--unknown'
  return card.type === 'clue' ? 'score-dot--clue' : 'score-dot--safe'
}

function dotLabel(card) {
  if (!card.revealed) return '未揭晓'
  return card.type === 'clue' ? '线索' : '平安'
}
</script>

<template>
  <div class="scoreboard" :class="{ 'scoreboard--open': !collapsed }">
    <button class="scoreboard__toggle" type="button" @click="collapsed = !collapsed">
      <span class="scoreboard__round">第 {{ round }} / {{ TOTAL_ROUNDS }} 轮</span>
      <span class="scoreboard__me">
        <span class="scoreboard__me-item">得分 <strong>{{ myScore }}</strong></span>
        <span class="scoreboard__me-item">令 ×{{ myTokens }}</span>
        <span class="scoreboard__me-item">卡 ×{{ myCards }}</span>
      </span>
      <span class="scoreboard__chevron" :class="{ 'scoreboard__chevron--up': !collapsed }">▾</span>
    </button>

    <Transition name="fade">
      <table v-if="!collapsed" class="scoreboard__table">
        <thead>
          <tr>
            <th>选手</th>
            <th>分数</th>
            <th>清风令</th>
            <th>线索卡</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in sorted" :key="p.id" :class="{ 'scoreboard__row--me': !p.isAI }">
            <td>
              <span class="scoreboard__name">{{ p.name }}</span>
              <span v-if="p.marked" class="scoreboard__marked">被关注</span>
              <span v-if="p.isAI" class="scoreboard__tag">{{ PERSONALITY[p.personality]?.label }}</span>
            </td>
            <td class="scoreboard__score">{{ p.score }}</td>
            <td>
              <span v-if="p.breezeTokens > 0" class="scoreboard__token" :title="`${p.breezeTokens} 枚清风令`">
                令 ×{{ p.breezeTokens }}
              </span>
              <span v-else class="scoreboard__empty">—</span>
            </td>
            <td>
              <span v-if="p.clueCards.length === 0" class="scoreboard__empty">—</span>
              <span
                v-for="(c, i) in p.clueCards"
                :key="i"
                class="score-dot"
                :class="dotClass(c)"
                :title="dotLabel(c)"
              ></span>
            </td>
          </tr>
        </tbody>
      </table>
    </Transition>
  </div>
</template>

<style scoped>
.scoreboard {
  background: rgba(244, 234, 216, 0.9);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  overflow: hidden;
}
.scoreboard__toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: 44px;
  padding: 0 var(--gap-md);
  color: var(--color-ink);
  font-size: 14px;
  font-weight: 600;
}
.scoreboard__round {
  font-family: var(--font-serif);
  letter-spacing: 0.04em;
  flex-shrink: 0;
}
.scoreboard__me {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 auto;
  font-size: 12px;
  color: var(--color-ink-soft);
  white-space: nowrap;
  overflow: hidden;
}
.scoreboard__me-item strong {
  font-family: var(--font-serif);
  font-size: 15px;
  color: var(--color-brown-dark);
}
.scoreboard__chevron {
  transition: transform var(--dur-base) ease;
}
.scoreboard__chevron--up {
  transform: rotate(180deg);
}
.scoreboard__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}
.scoreboard__table th {
  padding: 8px 12px;
  text-align: left;
  color: var(--color-ink-soft);
  font-weight: 600;
  border-top: 1px solid var(--color-cream-dark);
  font-size: 12px;
}
.scoreboard__table td {
  padding: 10px 12px;
  border-top: 1px solid var(--color-cream-dark);
}
.scoreboard__row--me {
  background: rgba(63, 92, 74, 0.1);
}
.scoreboard__name {
  font-weight: 600;
}
.scoreboard__tag {
  margin-left: 6px;
  font-size: 11px;
  color: var(--color-ink-soft);
}
.scoreboard__marked {
  margin-left: 6px;
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--color-red);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
}
.scoreboard__token {
  font-family: var(--font-serif);
  font-size: 13px;
  font-weight: 700;
  color: var(--color-gold);
}
.scoreboard__score {
  font-family: var(--font-serif);
  font-size: 16px;
  font-weight: 700;
}
.scoreboard__empty {
  color: var(--color-ink-soft);
}
.score-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 4px;
}
.score-dot--unknown {
  background: var(--color-red);
  opacity: 0.75;
}
.score-dot--safe {
  background: var(--color-green-light);
}
.score-dot--clue {
  background: var(--color-red);
  box-shadow: 0 0 4px rgba(158, 43, 37, 0.8);
}
</style>

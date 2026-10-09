<script setup>
/**
 * 玩家信息栏：当前轮次 + 得分 / 清风令 / 线索卡（小圆点）
 * 未翻开的卡显示为深红未知圆点，翻开后区分「平安」（绿）/「线索」（红）
 */
import { computed } from 'vue'
import { TOTAL_ROUNDS } from '@/data/config'

const props = defineProps({
  player: { type: Object, default: null },
  round: { type: Number, default: 1 },
})

const score = computed(() => props.player?.score ?? 0)
const tokens = computed(() => props.player?.breezeTokens ?? 0)
const cards = computed(() => props.player?.clueCards ?? [])

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
  <div class="scoreboard">
    <span class="scoreboard__round">第 {{ round }} / {{ TOTAL_ROUNDS }} 轮</span>
    <span class="scoreboard__me">
      <span class="scoreboard__me-item">得分 <strong>{{ score }}</strong></span>
      <span class="scoreboard__me-item">令 ×{{ tokens }}</span>
      <span class="scoreboard__me-item scoreboard__cards">
        卡 ×{{ cards.length }}
        <span
          v-for="(c, i) in cards"
          :key="i"
          class="score-dot"
          :class="dotClass(c)"
          :title="dotLabel(c)"
        ></span>
      </span>
    </span>
  </div>
</template>

<style scoped>
.scoreboard {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--gap-sm);
  min-height: 44px;
  padding: 0 var(--gap-md);
  background: rgba(244, 234, 216, 0.9);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  font-size: 14px;
  font-weight: 600;
  color: var(--color-ink);
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
.scoreboard__cards {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}
.score-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
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

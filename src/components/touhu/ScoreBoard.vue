<script setup>
/**
 * 玩家信息栏：当前轮次 + 得分 / 清风令
 */
import { computed } from 'vue'
import { TOTAL_ROUNDS } from '@/data/touhu/config'

const props = defineProps({
  player: { type: Object, default: null },
  round: { type: Number, default: 1 },
})

const score = computed(() => props.player?.score ?? 0)
const tokens = computed(() => props.player?.breezeTokens ?? 0)
</script>

<template>
  <div class="scoreboard">
    <span class="scoreboard__round">第 {{ round }} / {{ TOTAL_ROUNDS }} 轮</span>
    <span class="scoreboard__me">
      <span class="scoreboard__me-item">得分 <strong>{{ score }}</strong></span>
      <span class="scoreboard__me-item">令 ×{{ tokens }}</span>
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

/* 手机端：信息栏更紧凑 */
@media (max-width: 480px) {
  .scoreboard {
    min-height: 36px;
    padding: 0 10px;
    font-size: 13px;
  }
  .scoreboard__me {
    gap: 6px;
    font-size: 11px;
  }
  .scoreboard__me-item strong {
    font-size: 13px;
  }
}
</style>

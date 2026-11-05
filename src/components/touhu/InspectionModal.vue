<script setup>
/**
 * 巡察弹窗：中期巡察 / 最终巡察
 * - 中期：公开线索数量，警示但不结算
 * - 最终：翻开全部线索卡，等待清算
 */
import { computed } from 'vue'
import ClueCard from './ClueCard.vue'

const props = defineProps({
  mode: { type: String, required: true }, // mid | final
  player: { type: Object, required: true },
})

const emit = defineEmits(['dismiss'])

const isMid = computed(() => props.mode === 'mid')
const clueCount = computed(() => props.player.clueCards.filter((c) => c.type === 'clue').length)
</script>

<template>
  <div class="inspection-overlay">
    <div class="inspection anim-pop-in" role="dialog" aria-modal="true">
      <div class="inspection__banner" :class="{ 'inspection__banner--final': !isMid }">
        <span class="inspection__icon">{{ isMid ? '巡' : '终' }}</span>
        <h2 class="inspection__title">{{ isMid ? '中期巡察' : '最终巡察' }}</h2>
        <p class="inspection__sub">{{ isMid ? '巡察组进场' : '巡察组进驻 · 全面清查' }}</p>
      </div>

      <div class="inspection__body">
        <p v-if="isMid" class="inspection__warn">
          你已被发现 <strong class="inspection__count">{{ clueCount }}</strong> 条线索。
          <template v-if="clueCount >= 1">
            <br /><strong class="inspection__marked">组织注意到你了</strong
            >——从下一轮起，你投中腐败/擦边壶时留下线索的概率将大幅提升。
          </template>
          <template v-else>目前你很干净，继续守住。</template>
        </p>
        <p v-else class="inspection__warn inspection__warn--final">
          线索卡已全部翻开，将按线索数阶梯清算。
        </p>

        <!-- 已翻开的线索卡 -->
        <div class="inspection__player">
          <span class="inspection__name">{{ player.name }}</span>
          <div class="inspection__cards">
            <template v-if="player.clueCards.length === 0">
              <span class="inspection__none">无线索卡</span>
            </template>
            <ClueCard
              v-for="(c, i) in player.clueCards"
              :key="i"
              :type="c.type"
              :revealed="true"
              :size="44"
            />
          </div>
        </div>

        <button class="btn btn--primary btn--block" type="button" @click="emit('dismiss')">
          {{ isMid ? '继续游戏' : '开始清算' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.inspection-overlay {
  position: fixed;
  inset: 0;
  z-index: 70;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--gap-md);
  background: rgba(43, 33, 24, 0.7);
}
.inspection {
  width: 100%;
  max-width: 440px;
  max-height: 86vh;
  overflow-y: auto;
  background: var(--color-cream);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-float);
}
.inspection__banner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: var(--gap-lg);
  background: var(--color-brown-dark);
  color: var(--color-cream);
  text-align: center;
}
.inspection__banner--final {
  background: var(--color-red);
}
.inspection__icon {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid var(--color-gold);
  font-family: var(--font-serif);
  font-size: 20px;
}
.inspection__title {
  font-size: 22px;
  letter-spacing: 0.1em;
}
.inspection__sub {
  font-size: 12px;
  opacity: 0.85;
}
.inspection__body {
  padding: var(--gap-lg);
  display: flex;
  flex-direction: column;
  gap: var(--gap-md);
}
.inspection__warn {
  text-align: center;
  font-size: 15px;
  line-height: 1.7;
}
.inspection__warn--final {
  color: var(--color-red);
}
.inspection__count {
  color: var(--color-red);
  font-size: 22px;
  font-family: var(--font-serif);
}
.inspection__marked {
  color: var(--color-red);
  font-size: 17px;
  letter-spacing: 0.06em;
}
.inspection__player {
  display: flex;
  align-items: center;
  gap: var(--gap-sm);
  padding: 8px 12px;
  background: rgba(244, 234, 216, 0.6);
  border-radius: var(--radius-sm);
}
.inspection__name {
  flex-shrink: 0;
  width: 60px;
  font-weight: 600;
  font-size: 14px;
}
.inspection__cards {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.inspection__none {
  font-size: 12px;
  color: var(--color-ink-soft);
}
</style>

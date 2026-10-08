<script setup>
/**
 * 主动交代弹窗（方案 2.4）
 * 第 4 轮结束后开启一次：交代 = 扣除投腐败/擦边壶所得的全部分数 + 消除所有线索卡
 * 玩家只能看到自己抽了几张卡（付费查看过的除外），不知道还有没有线索
 */
import { computed } from 'vue'

const props = defineProps({
  player: { type: Object, required: true }, // 真人玩家
})

const emit = defineEmits(['confess', 'skip'])

const cardCount = computed(() => props.player.clueCards.length)
const knownClues = computed(() => props.player.clueCards.filter((c) => c.revealed && c.type === 'clue').length)
const riskyScore = computed(() => props.player.riskyScore)
</script>

<template>
  <div class="confess-overlay">
    <div class="confess anim-pop-in" role="dialog" aria-modal="true">
      <div class="confess__head">
        <h2 class="confess__title">主动交代</h2>
        <p class="confess__sub">第 4 轮后 · 唯一一次机会</p>
      </div>

      <div class="confess__body">
        <p class="confess__lead">
          现在还可以主动交代：<strong>扣除投腐败 / 擦边壶所得的全部分数（-{{ riskyScore }} 分），
          同时消除所有已抽线索卡。</strong>
        </p>
        <p class="confess__hint">
          你桌上扣着 {{ cardCount }} 张卡<template v-if="knownClues > 0">，其中已知 {{ knownClues }} 条线索</template
          >——里面还有没有雷，只有组织知道。
        </p>

        <div class="confess__actions">
          <button
            class="btn btn--danger btn--block"
            type="button"
            :disabled="riskyScore === 0 && cardCount === 0"
            @click="emit('confess')"
          >
            主动交代（-{{ riskyScore }} 分 · 消除全部线索卡）
          </button>
          <button class="btn btn--ghost btn--block" type="button" @click="emit('skip')">
            不交代，赌一把
          </button>
        </div>

        <p class="confess__note">现实中，主动交代可以从宽处理；但机会只有一次。</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.confess-overlay {
  position: fixed;
  inset: 0;
  z-index: 70;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--gap-md);
  background: rgba(43, 33, 24, 0.7);
}
.confess {
  width: 100%;
  max-width: 400px;
  background: var(--color-cream);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-float);
  overflow: hidden;
}
.confess__head {
  padding: var(--gap-lg);
  padding-bottom: var(--gap-md);
  text-align: center;
}
.confess__title {
  font-family: var(--font-serif);
  font-size: 24px;
  letter-spacing: 0.12em;
  color: var(--color-brown-dark);
}
.confess__sub {
  margin-top: 4px;
  font-size: 12px;
  color: var(--color-ink-soft);
}
.confess__body {
  padding: 0 var(--gap-lg) var(--gap-lg);
  display: flex;
  flex-direction: column;
  gap: var(--gap-md);
}
.confess__lead {
  font-size: 14px;
  line-height: 1.7;
}
.confess__hint {
  padding: var(--gap-sm) var(--gap-md);
  background: rgba(158, 43, 37, 0.08);
  border-radius: var(--radius-sm);
  font-size: 13px;
  line-height: 1.6;
  color: var(--color-red);
}
.confess__actions {
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
}
.confess__note {
  text-align: center;
  font-size: 12px;
  color: var(--color-ink-soft);
}
</style>

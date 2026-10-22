<script setup>
/**
 * 线索卡托盘（方案 2.3）
 * - 横向单行罗列玩家抽到的全部线索卡（超出可左右滑动），默认背面朝上（不泄露是线索还是平安）
 * - 点击反扣的卡弹出付费确认：腐败壶卡 10 分、擦边壶卡 5 分，不足不能查看
 * - 确认支付后卡片翻面，显示「平安无事」或「留下线索」
 * - 已查看与巡察后强制翻开的卡正面展示，不可再操作
 */
import { ref, computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { VIEW_COST } from '@/data/config'
import { playSound } from '@/utils/audio'
import ClueCard from './ClueCard.vue'

const store = useGameStore()

const cards = computed(() => store.player?.clueCards ?? [])
const score = computed(() => store.player?.score ?? 0)

const root = ref(null)
/** 供 GameView 的抽卡飞入动画定位落点 */
defineExpose({ rootEl: () => root.value })

// 待确认付费查看的卡
const pending = ref(null)
const pendingCost = computed(() => (pending.value ? VIEW_COST[pending.value.pot] ?? 0 : 0))
const pendingPotLabel = computed(() => (pending.value?.pot === 'corrupt' ? '腐败壶' : '擦边壶'))
const affordable = computed(() => score.value >= pendingCost.value)

function onCardClick(card) {
  if (card.revealed) return
  pending.value = card
}

function confirm() {
  if (!pending.value) return
  if (store.payToView(pending.value.id)) {
    playSound('flip')
  }
  pending.value = null
}

function cancel() {
  pending.value = null
}
</script>

<template>
  <div ref="root" class="tray">
    <span class="tray__label">线索卡<br />× {{ cards.length }}</span>
    <div class="tray__row">
      <button
        v-for="card in cards"
        :key="card.id"
        type="button"
        class="tray__slot"
        :class="{ 'tray__slot--hidden': !card.revealed }"
        :disabled="card.revealed"
        :title="card.revealed ? undefined : '点击付费查看'"
        @click="onCardClick(card)"
      >
        <ClueCard :type="card.type" :revealed="card.revealed" :size="40" />
      </button>
      <p v-if="cards.length === 0" class="tray__empty">命中腐败 / 擦边壶后，抽到的卡会扣在这里</p>
    </div>

    <!-- 付费查看确认 -->
    <Transition name="fade">
      <div v-if="pending" class="tray-pay" @click.self="cancel">
        <div class="tray-pay__modal anim-pop-in" role="dialog" aria-modal="true">
          <p class="tray-pay__title">查看这张卡？</p>
          <p class="tray-pay__sub">来自{{ pendingPotLabel }} · 查看后翻面</p>

          <div class="tray-pay__card">
            <ClueCard :type="pending.type" :revealed="false" :size="72" />
          </div>

          <button class="btn btn--primary btn--block" type="button" :disabled="!affordable" @click="confirm">
            付费查看（-{{ pendingCost }} 分）
          </button>
          <p v-if="!affordable" class="tray-pay__warn">总分不足 {{ pendingCost }} 分，无法查看</p>
          <button class="btn btn--ghost btn--block" type="button" @click="cancel">再想想</button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* 随页面流式布局：固定在投壶区下方的一条横栏，不遮挡任何元素 */
.tray {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 6px 10px;
  border-radius: var(--radius-md);
  background: rgba(244, 234, 216, 0.55);
  box-shadow: var(--shadow-card);
}
.tray__label {
  flex-shrink: 0;
  font-size: 11px;
  line-height: 1.4;
  color: var(--color-ink-soft);
  letter-spacing: 0.04em;
  text-align: center;
}
.tray__row {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  overflow-x: auto;
  scrollbar-width: none;
  min-height: 56px;
}
.tray__row::-webkit-scrollbar {
  display: none;
}
.tray__slot {
  line-height: 0;
  border-radius: 8px;
  transition: transform var(--dur-fast) ease;
  flex-shrink: 0;
}
.tray__slot--hidden:not(:disabled):hover {
  transform: translateY(-3px);
}
.tray__slot--hidden:not(:disabled):active {
  transform: scale(0.95);
}
.tray__empty {
  font-size: 12px;
  color: var(--color-ink-soft);
}

/* 手机端：托盘更紧凑 */
@media (max-width: 480px) {
  .tray {
    gap: 8px;
    padding: 4px 8px;
  }
  .tray__row {
    min-height: 48px;
  }
  .tray__empty {
    font-size: 11px;
  }
}

/* —— 付费确认弹窗 —— */
.tray-pay {
  position: fixed;
  inset: 0;
  z-index: 70;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--gap-md);
  background: rgba(43, 33, 24, 0.7);
}
.tray-pay__modal {
  width: 100%;
  max-width: 320px;
  padding: var(--gap-lg);
  background: var(--color-cream);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-float);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--gap-sm);
  text-align: center;
}
.tray-pay__title {
  font-family: var(--font-serif);
  font-size: 19px;
  letter-spacing: 0.06em;
  color: var(--color-brown-dark);
}
.tray-pay__sub {
  font-size: 12px;
  color: var(--color-ink-soft);
}
.tray-pay__card {
  margin: var(--gap-sm) 0;
}
.tray-pay__warn {
  font-size: 12px;
  color: var(--color-red);
}
</style>

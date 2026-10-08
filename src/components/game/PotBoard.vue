<script setup>
/**
 * 三个壶的展示与选择区
 * 近大远小排列形成纵深感：腐败壶最近最大、擦边居中、廉洁壶最远最小
 * 选壶 -> 蓄力（PowerBar）-> 松手投掷，松手后 emit('throw') 交回父组件播放动画
 * 壶下方展示当前场景映射来的选项文字（按 pot 字段匹配，半透明底色 + 配色）
 * 对外暴露 getPotMouthEl / shake，供 GameView 定位箭头与触发命中震动
 */
import { ref, reactive } from 'vue'
import Pot from './Pot.vue'
import PowerBar from './PowerBar.vue'
import { POTS, POT_KEYS } from '@/utils/probability'
import { useGameStore } from '@/stores/game'

const props = defineProps({
  options: { type: Array, default: () => [] }, // [{ text, pot }] 当前场景选项
  disabled: { type: Boolean, default: false }, // 投掷动画中禁用，防误触
})

const emit = defineEmits(['throw'])

const store = useGameStore()

// 三个壶的显示尺寸（近大远小）
const POT_SIZE = { corrupt: 120, edge: 96, clean: 72 }

// 各壶 DOM 引用，供箭头定位
const potEls = reactive({})

// 命中震动状态
const shaking = reactive({ corrupt: false, edge: false, clean: false })

// 松手后的出手评价（回传给 PowerBar 展示，非空即已投掷）
const evaluation = ref('')

function setPotEl(type) {
  return (el) => {
    if (el) potEls[type] = el
  }
}

/** 返回指定壶的口部定位元素（用于箭头落点计算） */
function getPotMouthEl(type) {
  return potEls[type] || null
}

/** 触发指定壶的命中震动 */
function shake(type) {
  shaking[type] = true
  setTimeout(() => {
    shaking[type] = false
  }, 420)
}

defineExpose({ getPotMouthEl, shake })

/** 当前场景选项文字按 pot 字段映射到壶上 */
function optionText(type) {
  return props.options.find((o) => o.pot === type)?.text || ''
}

const isSelected = (type) => store.selectedPot === type
const isCharging = (type) => store.isCharging && store.selectedPot === type
const isDimmed = (type) => !!store.selectedPot && store.selectedPot !== type

/** 选壶：进入蓄力阶段，松手前可切换壶 */
function onSelect(type) {
  if (props.disabled) return
  if (type === store.selectedPot && store.isCharging) return // 已是当前壶，避免重复随机
  evaluation.value = ''
  store.startCharge(type)
}

/** 松手投掷：结算并交回父组件播放动画 */
function onRelease(pos) {
  const result = store.releaseCharge(pos)
  if (!result) return
  evaluation.value = result.evaluation
  emit('throw', result)
}
</script>

<template>
  <div class="pot-board">
    <div
      v-for="type in POT_KEYS"
      :key="type"
      class="pot-slot"
      :class="`pot-slot--${type}`"
      :data-pot-type="type"
    >
      <button
        type="button"
        class="pot-btn"
        :disabled="disabled"
        :aria-label="`投掷到${POTS[type].name}`"
        @click="onSelect(type)"
      >
        <span class="pot-btn__pot" :ref="setPotEl(type)">
          <Pot
            :type="type"
            :size="POT_SIZE[type]"
            :shaking="shaking[type]"
            :selected="isSelected(type)"
            :charging="isCharging(type)"
            :dimmed="isDimmed(type)"
          />
        </span>
        <span class="pot-btn__text" :class="`pot-btn__text--${type}`" :data-selected="isSelected(type)">
          {{ optionText(type) }}
        </span>
      </button>
    </div>

    <!-- 蓄力条：选壶后出现在底部中央 -->
    <PowerBar
      v-if="store.selectedPot"
      :key="store.selectedPot"
      :pot-type="store.selectedPot"
      :zone-start="store.bestZoneStart"
      :zone-width="store.bestZoneWidth"
      :traverse-ms="POTS[store.selectedPot].traverseMs"
      :evaluation="evaluation"
      :disabled="!!evaluation"
      @release="onRelease"
    />
  </div>
</template>

<style scoped>
.pot-board {
  display: flex;
  align-items: stretch;
  justify-content: center;
  gap: var(--gap-sm);
  padding: var(--gap-md) 0;
  width: 100%;
}

/* 三列等宽，便于选项文字排布；壶本身近大远小 */
.pot-slot {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.pot-slot--corrupt {
  z-index: 3;
}
.pot-slot--edge {
  z-index: 2;
}
.pot-slot--clean {
  z-index: 1;
}

.pot-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--gap-sm);
  width: 100%;
  padding: 6px 4px;
  border-radius: var(--radius-md);
  transition: transform var(--dur-fast) ease;
}
.pot-btn:not(:disabled):active {
  transform: scale(0.96);
}
.pot-btn:not(:disabled):hover {
  transform: translateY(-3px);
}

/* 壶体容器：让箭头落点贴合 SVG 壶口 */
.pot-btn__pot {
  display: inline-block;
  line-height: 0;
}

/* 选项文字：半透明底色 + 配色，选中时加粗高亮 */
.pot-btn__text {
  display: block;
  width: 100%;
  padding: 8px 6px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  line-height: 1.55;
  color: var(--color-ink);
  text-align: center;
  border: 1.5px solid transparent;
  transition: background var(--dur-fast) ease, border-color var(--dur-fast) ease,
    font-weight var(--dur-fast) ease;
}
.pot-btn__text--corrupt {
  background: rgba(230, 184, 96, 0.16);
}
.pot-btn__text--edge {
  background: rgba(201, 185, 165, 0.16);
}
.pot-btn__text--clean {
  background: rgba(143, 179, 154, 0.16);
}

.pot-btn__text[data-selected='true'] {
  font-weight: 700;
}
.pot-btn__text--corrupt[data-selected='true'] {
  background: rgba(230, 184, 96, 0.32);
  border-color: rgba(184, 134, 63, 0.7);
}
.pot-btn__text--edge[data-selected='true'] {
  background: rgba(201, 185, 165, 0.32);
  border-color: rgba(138, 122, 104, 0.7);
}
.pot-btn__text--clean[data-selected='true'] {
  background: rgba(143, 179, 154, 0.32);
  border-color: rgba(63, 92, 74, 0.7);
}
</style>

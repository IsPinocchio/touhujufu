<script setup>
/**
 * 蓄力条组件：按住按钮 -> 指针匀速往返移动 -> 松手投掷
 * - 横向长条，深灰底，最佳区间高亮，指针为竖线
 * - 松手后指针停住，父组件计算出手质量并回传评价文案
 */
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  potType: { type: String, default: 'corrupt' }, // 用于按钮/区间配色
  zoneStart: { type: Number, default: 0 }, // 最佳区间起点（0~1）
  zoneWidth: { type: Number, default: 0.3 }, // 最佳区间宽度（0~1）
  traverseMs: { type: Number, default:1600 }, // 指针单程耗时（毫秒）
  evaluation: { type: String, default: '' }, // 出手评价（松手后显示）
  disabled: { type: Boolean, default: false }, // 松手后禁用，防止重复投掷
})

const emit = defineEmits(['release'])

const holding = ref(false)
const btnRef = ref(null)
const trackRef = ref(null)
const pointerRef = ref(null)

/** 供 GameView 定位箭飞行起点 */
defineExpose({ btnEl: () => btnRef.value })

const FRAME_INTERVAL = 1000 / 60
let rafId = 0
let lastLogicTs = 0
let lastRenderTs = 0
let phase = 0
let position = 0
let trackWidth = 0

function drawPointer() {
  if (pointerRef.value) {
    pointerRef.value.style.transform = `translateX(${position * trackWidth - 1.5}px)`
  }
}

function measureTrack() {
  trackWidth = trackRef.value?.clientWidth || 0
  drawPointer()
}

function advanceTo(ts) {
  const dt = Math.max(0, ts - lastLogicTs)
  lastLogicTs = ts
  phase = (phase + dt / props.traverseMs) % 2
  position = phase <= 1 ? phase : 2 - phase
}

/** 开始蓄力：指针从 0 匀速移动，到两端反弹（往返） */
function start() {
  holding.value = true
  phase = 0
  position = 0
  measureTrack()
  lastLogicTs = performance.now()
  lastRenderTs = 0
  cancelAnimationFrame(rafId)
  if (!document.hidden) rafId = requestAnimationFrame(tick)
}

function tick(ts) {
  if (!holding.value || document.hidden) {
    rafId = 0
    return
  }
  advanceTo(ts)
  if (ts - lastRenderTs >= FRAME_INTERVAL - 1) {
    lastRenderTs = ts
    drawPointer()
  }
  rafId = requestAnimationFrame(tick)
}

/** 松手：按实际松手时间补齐位置，停住指针并发出结果 */
function stop(event) {
  if (!holding.value) return
  const now = performance.now()
  let releaseTs = now
  if (!document.hidden && event) {
    const eventTs = event.timeStamp
    if (Number.isFinite(eventTs) && eventTs > 0) {
      if (eventTs < lastLogicTs) releaseTs = lastLogicTs
      else if (eventTs <= now) releaseTs = eventTs
    }
  }
  if (!document.hidden) advanceTo(releaseTs)
  holding.value = false
  cancelAnimationFrame(rafId)
  rafId = 0
  drawPointer()
  emit('release', position)
}

function onPointerDown(e) {
  if (props.disabled || holding.value) return
  e.preventDefault()
  // 捕获指针，保证移动/松手事件不丢失
  try {
    e.currentTarget.setPointerCapture(e.pointerId)
  } catch (err) {
    /* 忽略不支持的环境 */
  }
  start()
}

function onPointerUp(event) {
  stop(event)
}

function onVisibilityChange() {
  if (!holding.value) return
  if (document.hidden) {
    advanceTo(performance.now())
    drawPointer()
    cancelAnimationFrame(rafId)
    rafId = 0
  } else {
    lastLogicTs = performance.now()
    lastRenderTs = 0
    rafId = requestAnimationFrame(tick)
  }
}

onMounted(() => {
  measureTrack()
  window.addEventListener('resize', measureTrack)
  document.addEventListener('visibilitychange', onVisibilityChange)
})

onUnmounted(() => {
  cancelAnimationFrame(rafId)
  window.removeEventListener('resize', measureTrack)
  document.removeEventListener('visibilitychange', onVisibilityChange)
})
</script>

<template>
  <div class="power-bar">
    <div ref="trackRef" class="power-bar__track">
      <!-- 最佳区间高亮 -->
      <div
        class="power-bar__zone"
        :class="`power-bar__zone--${potType}`"
        :style="{ left: zoneStart * 100 + '%', width: zoneWidth * 100 + '%' }"
      ></div>
      <!-- 指针竖线 -->
      <div ref="pointerRef" class="power-bar__pointer"></div>
    </div>

    <div class="power-bar__label" :class="{ 'power-bar__label--result': evaluation }">
      {{ evaluation || (holding ? '松开投掷…' : '按住下方按钮蓄力') }}
    </div>

    <button
      ref="btnRef"
      class="power-bar__btn"
      :class="`power-bar__btn--${potType}`"
      type="button"
      :disabled="disabled"
      @pointerdown="onPointerDown"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
    >
      按住投掷
    </button>
  </div>
</template>

<style scoped>
/* 文档流内布局：位于壶区正下方，不遮挡线索卡托盘 */
.power-bar {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--gap-sm);
}

.power-bar__track {
  position: relative;
  width: 100%;
  height: 22px;
  background: #2f2a22; /* 深灰底 */
  border-radius: 11px;
  overflow: hidden;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.5);
}

/* 最佳区间高亮（按壶配色） */
.power-bar__zone {
  position: absolute;
  top: 0;
  height: 100%;
}
.power-bar__zone--corrupt {
  background: rgba(230, 184, 96, 0.65);
}
.power-bar__zone--edge {
  background: rgba(168, 188, 208, 0.65);
}
.power-bar__zone--clean {
  background: rgba(143, 179, 154, 0.65);
}

/* 指针竖线 */
.power-bar__pointer {
  position: absolute;
  left: 0;
  top: -4px;
  height: 30px;
  width: 3px;
  background: #f4ead8;
  border-radius: 2px;
  box-shadow: 0 0 6px rgba(0, 0, 0, 0.6);
  transform: translateX(-1.5px);
}

.power-bar__label {
  min-height: 22px;
  font-size: 15px;
  font-weight: 700;
  color: var(--color-ink);
  text-align: center;
}
.power-bar__label--result {
  font-family: var(--font-serif);
  font-size: 20px;
  color: var(--color-gold);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
}

/* 按住投掷大按钮（按壶配色） */
.power-bar__btn {
  width: 100%;
  min-height: 64px;
  border-radius: var(--radius-lg);
  color: var(--color-cream);
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.08em;
  box-shadow: var(--shadow-float);
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}
.power-bar__btn--corrupt {
  background: var(--color-copper);
}
.power-bar__btn--edge {
  background: var(--color-slate-blue);
}
.power-bar__btn--clean {
  background: var(--color-green);
}
.power-bar__btn:active {
  filter: brightness(1.15);
}
.power-bar__btn:disabled {
  opacity: 0.5;
  filter: none;
}

/* 手机端 / 矮屏：压缩蓄力区高度，避免整页超出屏幕 */
@media (max-width: 480px) {
  .power-bar__label {
    font-size: 13px;
  }
  .power-bar__label--result {
    font-size: 17px;
  }
  .power-bar__btn {
    min-height: 54px;
    font-size: 16px;
  }
}
@media (max-height: 640px) {
  .power-bar__track {
    height: 18px;
  }
  .power-bar__btn {
    min-height: 48px;
  }
}
</style>

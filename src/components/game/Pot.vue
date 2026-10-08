<script setup>
/**
 * 单个壶的 SVG 组件
 * 通过 type 区分三种壶：腐败（暗金/铜，口最宽）、擦边（灰褐）、廉洁（墨绿，口最窄）
 * 包含壶口椭圆、壶身曲线、壶耳、壶嘴等元素
 */
import { computed } from 'vue'
import { POTS } from '@/utils/probability'

const props = defineProps({
  type: { type: String, required: true }, // corrupt | edge | clean
  size: { type: Number, default: 120 }, // 显示宽度（px）
  shaking: { type: Boolean, default: false }, // 命中震动
  selected: { type: Boolean, default: false }, // 选中高亮
  charging: { type: Boolean, default: false }, // 蓄力发光（瞄准特效）
  dimmed: { type: Boolean, default: false }, // 未选中时暗淡
})

// 每种壶的专属样式
const STYLE = {
  corrupt: {
    mouthRx: 30,
    bodyFrom: '#c08a4a',
    bodyTo: '#6b3a1f',
    rim: '#3a2412',
    mouthFill: '#241205',
    accent: '#e6b860',
  },
  edge: {
    mouthRx: 24,
    bodyFrom: '#a2917c',
    bodyTo: '#5a4f40',
    rim: '#2f2a22',
    mouthFill: '#1b1812',
    accent: '#c9b9a5',
  },
  clean: {
    mouthRx: 17,
    bodyFrom: '#5f7f68',
    bodyTo: '#2f4638',
    rim: '#17241c',
    mouthFill: '#0c1410',
    accent: '#8fb39a',
  },
}

const style = computed(() => STYLE[props.type] || STYLE.clean)

// 渐变 id 需要唯一，这里用组件实例级随机后缀
const uid = Math.random().toString(36).slice(2, 8)
const gradId = `pot-grad-${uid}`

// 壶身曲线路径（随壶口宽度变化）
const bodyPath = computed(() => {
  const r = style.value.mouthRx
  return [
    `M ${50 - r} 24`,
    `C ${50 - r * 0.4} 34, 38 34, 38 52`,
    `C 38 76, 30 94, 32 120`,
    `C 34 140, 42 150, 46 154`,
    `L 54 154`,
    `C 58 150, 66 140, 68 120`,
    `C 70 94, 62 76, 62 52`,
    `C 62 34, ${50 + r * 0.4} 34, ${50 + r} 24`,
    'Z',
  ].join(' ')
})
</script>

<template>
  <div
    class="pot"
    :class="{
      'pot--shaking': shaking,
      'pot--selected': selected,
      'pot--charging': charging,
      'pot--dimmed': dimmed,
    }"
    :style="{ width: size + 'px' }"
  >
    <svg viewBox="0 0 100 160" class="pot__svg" role="img" :aria-label="POTS[type].name">
      <defs>
        <linearGradient :id="gradId" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" :stop-color="style.bodyFrom" />
          <stop offset="1" :stop-color="style.bodyTo" />
        </linearGradient>
      </defs>

      <!-- 壶嘴（左侧） -->
      <path
        :d="`M 37 52 Q 20 54 18 64 Q 25 68 34 61 Z`"
        :fill="style.accent"
        :opacity="0.9"
      />

      <!-- 壶耳（两侧把手） -->
      <path
        d="M 38 58 Q 26 58 28 74 Q 30 82 40 78"
        fill="none"
        :stroke="style.accent"
        stroke-width="4"
        stroke-linecap="round"
      />
      <path
        d="M 62 58 Q 74 58 72 74 Q 70 82 60 78"
        fill="none"
        :stroke="style.accent"
        stroke-width="4"
        stroke-linecap="round"
      />

      <!-- 壶身 -->
      <path :d="bodyPath" :fill="`url(#${gradId})`" stroke="rgba(0,0,0,0.2)" stroke-width="1" />

      <!-- 壶口外沿（椭圆） -->
      <ellipse :cx="50" :cy="24" :rx="style.mouthRx" :ry="style.mouthRx * 0.4" :fill="style.rim" />
      <!-- 壶口内孔（深色开口） -->
      <ellipse
        :cx="50"
        :cy="24"
        :rx="style.mouthRx * 0.78"
        :ry="style.mouthRx * 0.3"
        :fill="style.mouthFill"
      />

      <!-- 腐败壶的诱惑金环 -->
      <ellipse
        v-if="type === 'corrupt'"
        :cx="50"
        :cy="62"
        :rx="26"
        :ry="7"
        fill="none"
        :stroke="style.accent"
        stroke-width="2"
        opacity="0.55"
      />

      <!-- 壶足 -->
      <ellipse :cx="50" :cy="154" :rx="16" :ry="5" :fill="style.rim" />
    </svg>
  </div>
</template>

<style scoped>
.pot {
  display: inline-block;
  transition: transform var(--dur-fast) ease, opacity var(--dur-fast) ease;
}
.pot--shaking {
  animation: shake 0.4s ease;
}
.pot__svg {
  display: block;
  width: 100%;
  height: auto;
  filter: drop-shadow(0 6px 8px rgba(43, 33, 24, 0.3));
  transition: filter var(--dur-base) ease, transform var(--dur-base) ease;
}

/* 未选中时暗淡 */
.pot--dimmed {
  opacity: 0.4;
}

/* 选中：高亮光环 + 轻微放大 */
.pot--selected .pot__svg {
  transform: scale(1.05);
  filter: drop-shadow(0 0 10px rgba(230, 184, 96, 0.85))
    drop-shadow(0 6px 8px rgba(43, 33, 24, 0.3));
}

/* 蓄力：发光呼吸（瞄准特效） */
.pot--charging .pot__svg {
  animation: pot-pulse 0.9s ease-in-out infinite;
}
@keyframes pot-pulse {
  0%,
  100% {
    filter: drop-shadow(0 0 6px rgba(230, 184, 96, 0.6))
      drop-shadow(0 6px 8px rgba(43, 33, 24, 0.3));
  }
  50% {
    filter: drop-shadow(0 0 20px rgba(230, 184, 96, 1))
      drop-shadow(0 6px 8px rgba(43, 33, 24, 0.3));
  }
}
</style>

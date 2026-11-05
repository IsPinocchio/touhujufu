<script setup>
/**
 * 单个壶的 SVG 组件
 * 三壶轮廓统一，颜色按 theme（copper/slate/green）随机分配，防止外观暴露壶类型
 * 包含壶口椭圆、壶身曲线、壶耳、壶嘴等元素
 */
import { computed } from 'vue'
import { POTS } from '@/utils/touhu/probability'
import { POT_COLORS } from '@/utils/touhu/colors'

const props = defineProps({
  type: { type: String, required: true }, // corrupt | edge | clean
  theme: { type: String, default: 'copper' }, // 配色主题 copper | slate | green（每轮随机）
  size: { type: Number, default: 120 }, // 显示宽度（px）
  shaking: { type: Boolean, default: false }, // 命中震动
  selected: { type: Boolean, default: false }, // 选中高亮
  charging: { type: Boolean, default: false }, // 蓄力发光（瞄准特效）
  dimmed: { type: Boolean, default: false }, // 未选中时暗淡
})

// 三壶轮廓统一（壶口宽度一致），仅颜色随主题变化
const MOUTH_RX = 24

const style = computed(() => POT_COLORS[props.theme] || POT_COLORS.copper)

// 渐变 id 需要唯一，这里用组件实例级随机后缀
const uid = Math.random().toString(36).slice(2, 8)
const gradId = `pot-grad-${uid}`

// 壶身曲线路径（三壶一致）
const bodyPath = computed(() => {
  const r = MOUTH_RX
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
    <span class="pot__glow" aria-hidden="true"></span>
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
      <ellipse :cx="50" :cy="24" :rx="MOUTH_RX" :ry="MOUTH_RX * 0.4" :fill="style.rim" />
      <!-- 壶口内孔（深色开口） -->
      <ellipse
        :cx="50"
        :cy="24"
        :rx="MOUTH_RX * 0.78"
        :ry="MOUTH_RX * 0.3"
        :fill="style.mouthFill"
      />

      <!-- 壶足 -->
      <ellipse :cx="50" :cy="154" :rx="16" :ry="5" :fill="style.rim" />
    </svg>
  </div>
</template>

<style scoped>
.pot {
  position: relative;
  display: inline-block;
  transition: transform var(--dur-fast) ease, opacity var(--dur-fast) ease;
}
.pot--shaking {
  animation: shake 0.4s ease;
}
.pot__glow {
  position: absolute;
  inset: 6% -6% 0;
  border-radius: 50%;
  background: radial-gradient(
    ellipse,
    rgba(230, 184, 96, 0.5) 0%,
    rgba(230, 184, 96, 0.2) 45%,
    rgba(230, 184, 96, 0) 72%
  );
  opacity: 0;
  transform: scale(0.94);
  pointer-events: none;
}
.pot__svg {
  position: relative;
  display: block;
  width: 100%;
  height: auto;
  filter: drop-shadow(0 6px 8px rgba(43, 33, 24, 0.3));
  transition: transform var(--dur-base) ease;
}

/* 未选中时暗淡 */
.pot--dimmed {
  opacity: 0.4;
}

/* 选中：高亮光环 + 轻微放大 */
.pot--selected .pot__svg {
  transform: scale(1.05);
}
.pot--selected .pot__glow {
  opacity: 0.45;
}

/* 蓄力：只让光晕呼吸，避免持续重算 SVG 滤镜 */
.pot--charging .pot__glow {
  animation: pot-pulse 0.9s ease-in-out infinite;
}
@keyframes pot-pulse {
  0%,
  100% {
    opacity: 0.35;
    transform: scale(0.94);
  }
  50% {
    opacity: 0.9;
    transform: scale(1.08);
  }
}
</style>

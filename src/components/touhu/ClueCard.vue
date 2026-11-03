<script setup>
/**
 * 线索卡：米白卡面、暗红边框、右下角印章
 * 背面为暗纹，正面为「平安无事」或「留下线索」
 * 通过 CSS 3D flip 实现翻牌动画
 */
import { computed } from 'vue'

const props = defineProps({
  type: { type: String, default: 'safe' }, // safe | clue
  revealed: { type: Boolean, default: false }, // 是否翻到正面
  size: { type: Number, default: 72 }, // 卡片宽度（px）
})

const height = computed(() => Math.round(props.size * 1.4))
</script>

<template>
  <div
    class="clue-card"
    :class="{ 'clue-card--revealed': revealed, 'clue-card--clue': revealed && type === 'clue' }"
    :style="{ width: size + 'px', height: height + 'px' }"
  >
    <div class="clue-card__inner">
      <!-- 背面：暗纹 + 印章 -->
      <div class="clue-card__face clue-card__back">
        <svg viewBox="0 0 100 140" class="clue-card__svg">
          <rect x="2" y="2" width="96" height="136" rx="8" fill="#f2e6cf" stroke="#8a2a24" stroke-width="3" />
          <!-- 背面菱形暗纹 -->
          <g fill="none" stroke="#c9b28a" stroke-width="1.5" opacity="0.7">
            <path d="M50 20 L70 45 L50 70 L30 45 Z" />
            <path d="M50 40 L80 60 L50 80 L20 60 Z" />
            <path d="M50 70 L70 95 L50 120 L30 95 Z" />
          </g>
          <!-- 中央印章 -->
          <rect x="38" y="56" width="24" height="24" rx="3" fill="#9e2b25" />
          <text x="50" y="73" text-anchor="middle" fill="#f2e6cf" font-size="15" font-family="serif">廉</text>
        </svg>
      </div>

      <!-- 正面：结果 -->
      <div class="clue-card__face clue-card__front">
        <svg viewBox="0 0 100 140" class="clue-card__svg">
          <rect x="2" y="2" width="96" height="136" rx="8" fill="#fbf4e4" stroke="#8a2a24" stroke-width="3" />
          <text
            x="50"
            y="62"
            text-anchor="middle"
            :fill="type === 'clue' ? '#9e2b25' : '#3f5c4a'"
            font-size="16"
            font-family="serif"
            font-weight="bold"
          >
            {{ type === 'clue' ? '留下线索' : '平安无事' }}
          </text>
          <!-- 右下角印章 -->
          <rect x="72" y="108" width="20" height="20" rx="2" :fill="type === 'clue' ? '#9e2b25' : '#3f5c4a'" />
          <text
            x="82"
            y="122"
            text-anchor="middle"
            :fill="'#fbf4e4'"
            font-size="11"
            font-family="serif"
          >
            {{ type === 'clue' ? '险' : '安' }}
          </text>
        </svg>
      </div>
    </div>
  </div>
</template>

<style scoped>
.clue-card {
  perspective: 600px;
}
.clue-card__inner {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  transition: transform 0.6s cubic-bezier(0.4, 0.2, 0.2, 1);
}
.clue-card--revealed .clue-card__inner {
  transform: rotateY(180deg);
}
.clue-card__face {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 10px rgba(43, 33, 24, 0.25);
}
.clue-card__front {
  transform: rotateY(180deg);
}
.clue-card__svg {
  display: block;
  width: 100%;
  height: 100%;
}
/* 翻出「留下线索」时边缘泛红光 */
.clue-card--clue .clue-card__face {
  box-shadow: 0 0 12px rgba(158, 43, 37, 0.7);
}
</style>

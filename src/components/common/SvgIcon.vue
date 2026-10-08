<script setup>
/**
 * 通用内联 SVG 图标组件
 * 通过 name 指定图标，图标路径集中维护，避免重复
 */
import { computed } from 'vue'

const props = defineProps({
  name: { type: String, required: true },
  size: { type: [Number, String], default: 24 },
})

// 图标库：24x24 viewBox 的 path 集合
const icons = {
  sound: 'M3 9v6h4l5 5V4L7 9H3zM16.5 12a4.5 4.5 0 0 0-2.5-4.03v8.05A4.5 4.5 0 0 0 16.5 12zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z',
  mute: 'M3 9v6h4l5 5V4L7 9H3zM16 8l5 8M21 8l-5 8',
  menu: 'M3 6h18M3 12h18M3 18h18',
  close: 'M6 6l12 12M18 6L6 18',
  back: 'M15 18l-6-6 6-6',
  share: 'M18 16a3 3 0 0 1-2.24-1l-7.18 3.59A3 3 0 1 1 8 13.18l7.18-3.59A3 3 0 1 1 18 16z',
  medal: 'M12 15a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM8 13.5L6 21l4-2 2 1.5L12 18l2 2.5 4-2-2-7.5',
  course: 'M4 6h16v12H4zM8 6V4M12 6V4M16 6V4M7 11h10M7 14h6',
  flag: 'M5 21V4M5 4h11l-2 3 2 3H5',
  rank: 'M8 21h8M12 17v4M7 4h10l-3 5 3 5H7z',
  refresh: 'M20 11A8 8 0 1 0 18.34 5M20 3v5h-5',
  check: 'M5 13l4 4L19 7',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 3',
}

const path = computed(() => icons[props.name] || '')
</script>

<template>
  <svg
    class="svg-icon"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path :d="path" />
  </svg>
</template>

<style scoped>
.svg-icon {
  display: inline-block;
  vertical-align: middle;
  flex-shrink: 0;
}
</style>

<script setup>
/**
 * 箭的 SVG 组件：箭头（三角）、细长箭杆、三道箭羽
 * 默认箭头朝上（尖端在上），飞行时由父容器负责 translate / rotate
 */
</script>

<template>
  <svg class="arrow" viewBox="0 0 24 120" aria-hidden="true">
    <!-- 箭头（三角） -->
    <path d="M12 0 L21 16 L15 14 L15 22 L9 22 L9 14 L3 16 Z" fill="#5a4a3a" stroke="#3a2f24" stroke-width="1" />
    <!-- 箭杆（细长） -->
    <rect x="10.4" y="20" width="3.2" height="76" fill="#8a6a4a" />
    <!-- 箭羽（三道，自上而下） -->
    <path d="M12 96 L22 106 L12 101 L2 106 Z" fill="#9e2b25" />
    <path d="M12 84 L20 92 L12 89 L4 92 Z" fill="#9e2b25" />
    <path d="M12 72 L20 80 L12 77 L4 80 Z" fill="#9e2b25" />
  </svg>
</template>

<style scoped>
.arrow {
  display: block;
  width: 22px;
  height: 110px;
  filter: drop-shadow(0 3px 4px rgba(43, 33, 24, 0.35));
  transform-origin: 50% 50%;
}
</style>

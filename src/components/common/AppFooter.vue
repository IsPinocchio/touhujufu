<script setup>
/**
 * 底部栏：免责/说明信息
 */
</script>

<template>
  <footer class="app-footer">
    <p>廉洁从业 · 警钟长鸣 —— 本游戏为廉洁教育互动演示，投壶结果均为概率模拟。</p>
  </footer>
</template>

<style scoped>
.app-footer {
  position: relative;
  z-index: 1;
  max-width: 560px;
  margin: 0 auto;
  padding: var(--gap-md) var(--gap-md) calc(var(--gap-md) + var(--safe-bottom));
  text-align: center;
  font-size: 12px;
  color: var(--color-ink-soft);
  opacity: 0.8;
}
</style>

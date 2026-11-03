<script setup>
/**
 * 「组织注意到你了」标记（方案 2.5）
 * 中期巡察后被标记者屏幕右上角出现爆红提示，直至终局
 */
</script>

<template>
  <div class="marked-badge" role="alert">
    <span class="marked-badge__dot"></span>
    组织注意到你了
  </div>
</template>

<style scoped>
.marked-badge {
  position: fixed;
  top: 12px;
  right: 12px;
  z-index: 60;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 999px;
  background: rgba(158, 43, 37, 0.95);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.05em;
  box-shadow: 0 0 14px rgba(158, 43, 37, 0.7);
  animation: marked-pulse 1.6s ease-in-out infinite;
}
.marked-badge__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ffd9d6;
  animation: marked-blink 0.8s ease-in-out infinite alternate;
}
@keyframes marked-pulse {
  0%,
  100% {
    box-shadow: 0 0 10px rgba(158, 43, 37, 0.6);
  }
  50% {
    box-shadow: 0 0 20px rgba(158, 43, 37, 0.95);
  }
}
@keyframes marked-blink {
  from {
    opacity: 0.4;
  }
  to {
    opacity: 1;
  }
}
</style>

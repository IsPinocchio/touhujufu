<script setup>
/**
 * 全局轻提示组件：固定顶部居中，自动消失，点击可立即关闭。
 * 数据来自 stores/toast.js，由 App.vue 挂载一次。
 */
import { useToastStore } from '@/stores/toast'

const toast = useToastStore()
</script>

<template>
  <div class="toast-layer" aria-live="polite">
    <TransitionGroup name="toast">
      <button
        v-for="t in toast.items"
        :key="t.id"
        type="button"
        class="toast"
        :class="`toast--${t.type}`"
        @click="toast.dismiss(t.id)"
      >
        {{ t.message }}
      </button>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-layer {
  position: fixed;
  top: 14px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 120;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: min(92vw, 420px);
  pointer-events: none;
}
.toast {
  pointer-events: auto;
  padding: 10px 16px;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 13px;
  line-height: 1.6;
  text-align: center;
  cursor: pointer;
  box-shadow: var(--shadow-float);
  background: rgba(158, 43, 37, 0.95);
  color: var(--color-cream);
}
.toast--info {
  background: rgba(63, 92, 74, 0.95);
}
.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>

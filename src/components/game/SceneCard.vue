<script setup>
/**
 * 场景题卡片：米白底、暗红标题栏、正文居中
 * 入场动画：从上方滑入 + 轻微纸张展开
 */
defineProps({
  round: { type: Number, required: true },
  scene: { type: String, required: true },
})
</script>

<template>
  <div class="scene-card anim-slide-down">
    <div class="scene-card__title">
      <span class="scene-card__round">第 {{ round }} 轮 · 情景抉择</span>
    </div>
    <p class="scene-card__body">{{ scene }}</p>
  </div>
</template>

<style scoped>
.scene-card {
  position: relative;
  background: var(--color-cream);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  overflow: hidden;
  transform-origin: top center;
}
/* 纸张展开的轻微缩放感，叠加在滑入之上 */
.scene-card {
  animation:
    slide-down var(--dur-slow) ease both,
    paper-unfold 0.5s 0.15s ease both;
}
@keyframes paper-unfold {
  from {
    transform: scaleY(0.85);
  }
  to {
    transform: scaleY(1);
  }
}

.scene-card__title {
  background: var(--color-brown-dark);
  color: var(--color-cream);
  padding: 10px 16px;
  border-bottom: 2px solid var(--color-red);
}
.scene-card__round {
  font-family: var(--font-serif);
  font-size: 15px;
  letter-spacing: 0.08em;
}
.scene-card__body {
  padding: var(--gap-lg) var(--gap-md);
  font-size: 16px;
  line-height: 1.75;
  text-align: center;
  color: var(--color-ink);
}

/* 手机端：字号与内边距收紧 */
@media (max-width: 480px) {
  .scene-card__title {
    padding: 8px 12px;
  }
  .scene-card__round {
    font-size: 13px;
  }
  .scene-card__body {
    padding: var(--gap-md) 12px;
    font-size: 14px;
    line-height: 1.7;
  }
}

/* 矮屏：进一步压缩正文留白 */
@media (max-height: 640px) {
  .scene-card__body {
    padding: 12px;
  }
}
</style>

<script setup>
/**
 * 场景题卡片：米白底、暗红标题栏、正文 + ABC 选项
 * - 作答阶段：选项可点，点击后 emit('answer')
 * - 答错反馈阶段：高亮正确项、标出错选项，展示教育点解析，点「下一题」emit('next')
 * 入场动画：从上方滑入 + 轻微纸张展开
 */
const props = defineProps({
  round: { type: Number, required: true },
  scene: { type: String, required: true },
  options: { type: Array, default: () => [] }, // [{ key, text, correct }]
  lastAnswer: { type: Object, default: null }, // { chosenKey, correct, correctKey, hint }，非空即已作答
  feedback: { type: Boolean, default: false }, // 答错后的解析展示模式
})

const emit = defineEmits(['answer', 'next'])

const OPTION_LABELS = { a: 'A', b: 'B', c: 'C' }

function onPick(opt) {
  if (props.lastAnswer) return
  emit('answer', opt.key)
}

function optionClass(opt) {
  if (!props.lastAnswer) return ''
  if (opt.key === props.lastAnswer.correctKey && props.feedback) return 'option--right'
  if (opt.key === props.lastAnswer.chosenKey) {
    return props.lastAnswer.correct ? 'option--chosen' : 'option--wrong'
  }
  return 'option--rest'
}
</script>

<template>
  <div class="scene-card anim-slide-down">
    <div class="scene-card__title">
      <span class="scene-card__round">第 {{ round }} 轮 · 情景抉择</span>
    </div>
    <p class="scene-card__body">{{ scene }}</p>

    <!-- ABC 选项：每行一个，共三行 -->
    <div class="scene-card__options">
      <button
        v-for="opt in options"
        :key="opt.key"
        type="button"
        class="option"
        :class="optionClass(opt)"
        :disabled="!!lastAnswer"
        @click="onPick(opt)"
      >
        <span class="option__key">{{ OPTION_LABELS[opt.key] || opt.key.toUpperCase() }}</span>
        <span class="option__text">{{ opt.text }}</span>
      </button>
    </div>

    <!-- 答错解析：正确选项 + 教育点 + 下一题 -->
    <div v-if="feedback" class="scene-card__feedback">
      <p class="scene-card__verdict">本题 0 分 · 正确做法是上方标绿选项</p>
      <p v-if="lastAnswer?.hint" class="scene-card__hint">{{ lastAnswer.hint }}</p>
      <button class="btn btn--primary btn--block" type="button" @click="emit('next')">下一题</button>
    </div>
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
  padding: var(--gap-lg) var(--gap-md) var(--gap-md);
  font-size: 16px;
  line-height: 1.75;
  text-align: center;
  color: var(--color-ink);
}

/* —— ABC 选项 —— */
.scene-card__options {
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
  padding: 0 var(--gap-md) var(--gap-md);
}
.option {
  width: 100%;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px;
  border-radius: var(--radius-sm);
  border: 1.5px solid rgba(107, 58, 31, 0.25);
  background: rgba(244, 234, 216, 0.6);
  text-align: left;
  transition: transform var(--dur-fast) ease, border-color var(--dur-fast) ease,
    background var(--dur-fast) ease;
}
.option:not(:disabled):hover {
  transform: translateY(-2px);
  border-color: var(--color-brown);
}
.option__key {
  font-family: var(--font-serif);
  font-size: 15px;
  font-weight: 700;
  color: var(--color-red);
}
.option__text {
  font-size: 14px;
  line-height: 1.6;
  color: var(--color-ink);
}
/* 答对选中态（进入投壶前的短暂反馈） */
.option--chosen {
  border-color: var(--color-green);
  background: rgba(143, 179, 154, 0.25);
}
/* 答错反馈：正确项标绿、错选项标红、其余淡化 */
.option--right {
  border-color: var(--color-green);
  background: rgba(143, 179, 154, 0.3);
}
.option--wrong {
  border-color: var(--color-red);
  background: rgba(158, 43, 37, 0.12);
}
.option--rest {
  opacity: 0.55;
}

/* —— 答错解析区 —— */
.scene-card__feedback {
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
  padding: 0 var(--gap-md) var(--gap-md);
}
.scene-card__verdict {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-red);
}
.scene-card__hint {
  font-size: 13px;
  line-height: 1.7;
  color: var(--color-ink-soft);
  padding: 10px 12px;
  border-left: 3px solid var(--color-green);
  background: rgba(63, 92, 74, 0.08);
  border-radius: var(--radius-sm);
}

/* 手机端：选项改纵向排列，避免文字挤压 */
@media (max-width: 480px) {
  .scene-card__title {
    padding: 8px 12px;
  }
  .scene-card__round {
    font-size: 13px;
  }
  .scene-card__body {
    padding: var(--gap-md) 12px var(--gap-sm);
    font-size: 14px;
    line-height: 1.7;
  }
  .scene-card__options {
    padding: 0 12px var(--gap-sm);
  }
  .scene-card__feedback {
    padding: 0 12px var(--gap-md);
  }
}

/* 矮屏：进一步压缩正文留白 */
@media (max-height: 640px) {
  .scene-card__body {
    padding: 12px 12px 8px;
  }
}
</style>

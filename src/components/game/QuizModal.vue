<script setup>
/**
 * 法规判断题弹窗（方案 2.1）
 * 第 2/4/6/8 轮投壶后插入：判断情景是否合规
 * 答对获得一枚清风令（最终清算每枚 +10 分），答错展示解析
 */
import { ref, computed } from 'vue'

const props = defineProps({
  quiz: { type: Object, required: true }, // { id, scene, compliant, answerNote, explain, basis }
})

const emit = defineEmits(['answer'])

const answered = ref(false)
const wasCorrect = ref(false)

const title = computed(() => (answered.value ? (wasCorrect.value ? '回答正确' : '判断失误') : '法规判断 · 红线三秒'))

function choose(compliant) {
  if (answered.value) return
  wasCorrect.value = compliant === props.quiz.compliant
  answered.value = true
}

function confirm() {
  emit('answer', wasCorrect.value)
}
</script>

<template>
  <div class="quiz-overlay">
    <div class="quiz anim-pop-in" role="dialog" aria-modal="true">
      <div class="quiz__head">
        <span class="quiz__icon">令</span>
        <h2 class="quiz__title">{{ title }}</h2>
        <p class="quiz__sub">答对获得一枚清风令 · 最终清算时每枚 +10 分</p>
      </div>

      <div class="quiz__body">
        <p class="quiz__scene">{{ quiz.scene }}</p>
        <p class="quiz__question">这个做法，合规吗？</p>

        <div v-if="!answered" class="quiz__actions">
          <button class="btn btn--green btn--block" type="button" @click="choose(true)">
            合规 · 能收（做）
          </button>
          <button class="btn btn--danger btn--block" type="button" @click="choose(false)">
            违规 · 不能收（做）
          </button>
        </div>

        <template v-else>
          <p class="quiz__verdict" :class="wasCorrect ? 'quiz__verdict--ok' : 'quiz__verdict--no'">
            {{ quiz.answerNote }}
          </p>
          <div class="quiz__explain">
            <p>{{ quiz.explain }}</p>
            <p class="quiz__basis">依据：{{ quiz.basis }}</p>
          </div>
          <button class="btn btn--primary btn--block" type="button" @click="confirm">
            {{ wasCorrect ? '收下清风令' : '继续游戏' }}
          </button>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.quiz-overlay {
  position: fixed;
  inset: 0;
  z-index: 70;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--gap-md);
  background: rgba(43, 33, 24, 0.7);
}
.quiz {
  width: 100%;
  max-width: 440px;
  max-height: 86vh;
  overflow-y: auto;
  background: var(--color-cream);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-float);
}
.quiz__head {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: var(--gap-lg);
  background: var(--color-brown-dark);
  color: var(--color-cream);
  text-align: center;
}
.quiz__icon {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid var(--color-gold);
  font-family: var(--font-serif);
  font-size: 20px;
}
.quiz__title {
  font-size: 22px;
  letter-spacing: 0.1em;
}
.quiz__sub {
  font-size: 12px;
  opacity: 0.85;
}
.quiz__body {
  padding: var(--gap-lg);
  display: flex;
  flex-direction: column;
  gap: var(--gap-md);
}
.quiz__scene {
  padding: var(--gap-md);
  background: rgba(244, 234, 216, 0.6);
  border-radius: var(--radius-sm);
  border-left: 3px solid var(--color-brown-dark);
  font-size: 15px;
  line-height: 1.75;
}
.quiz__question {
  text-align: center;
  font-weight: 700;
  color: var(--color-brown-dark);
}
.quiz__actions {
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
}
.quiz__verdict {
  text-align: center;
  font-family: var(--font-serif);
  font-size: 20px;
  font-weight: 700;
}
.quiz__verdict--ok {
  color: var(--color-green);
}
.quiz__verdict--no {
  color: var(--color-red);
}
.quiz__explain {
  padding: var(--gap-md);
  background: rgba(244, 234, 216, 0.6);
  border-radius: var(--radius-sm);
  font-size: 13px;
  line-height: 1.7;
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
}
.quiz__basis {
  color: var(--color-ink-soft);
  font-size: 12px;
}
</style>

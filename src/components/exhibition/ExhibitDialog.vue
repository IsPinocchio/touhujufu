<script setup>
import { nextTick, onUnmounted, ref, watch } from 'vue'
import SvgIcon from '@/components/common/SvgIcon.vue'

const props = defineProps({
  panel: { type: Object, default: null },
  roomName: { type: String, default: '' },
})
const emit = defineEmits(['close'])

const dialogRef = ref(null)
const closeButtonRef = ref(null)
let previousActiveElement = null
let previousBodyOverflow = ''

function close() {
  emit('close')
}

function onKeydown(event) {
  if (!props.panel) return
  if (event.key === 'Escape') {
    event.preventDefault()
    close()
    return
  }
  if (event.key !== 'Tab' || !dialogRef.value) return
  const focusable = Array.from(
    dialogRef.value.querySelectorAll('button:not(:disabled), [href], [tabindex]:not([tabindex="-1"])')
  )
  if (!focusable.length) return
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

function unlockDialog() {
  document.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = previousBodyOverflow
  if (previousActiveElement?.isConnected) previousActiveElement.focus()
}

watch(
  () => props.panel,
  async (panel, previousPanel) => {
    if (panel) {
      if (!previousPanel) {
        previousActiveElement = document.activeElement
        previousBodyOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        document.addEventListener('keydown', onKeydown)
      }
      await nextTick()
      closeButtonRef.value?.focus()
    } else if (previousPanel) {
      unlockDialog()
    }
  }
)

onUnmounted(() => {
  if (props.panel) unlockDialog()
})
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="panel" class="exhibit-overlay" @click.self="close">
        <article
          ref="dialogRef"
          class="exhibit-dialog anim-pop-in"
          :style="{ '--panel-accent': panel.type === 'case' ? 'var(--color-red)' : 'var(--color-green)' }"
          role="dialog"
          aria-modal="true"
          aria-labelledby="exhibit-dialog-title"
          aria-describedby="exhibit-dialog-content"
        >
          <header class="exhibit-dialog__header">
            <div>
              <p class="exhibit-dialog__eyebrow">{{ roomName }} · {{ panel.category }}</p>
              <h2 id="exhibit-dialog-title" class="exhibit-dialog__title">{{ panel.title }}</h2>
            </div>
            <button
              ref="closeButtonRef"
              type="button"
              class="exhibit-dialog__close"
              aria-label="关闭展板详情"
              @click="close"
            >
              <SvgIcon name="close" :size="22" />
            </button>
          </header>

          <div id="exhibit-dialog-content" class="exhibit-dialog__content">
            <p class="exhibit-dialog__summary">{{ panel.summary }}</p>
            <p v-if="panel.type === 'case'" class="exhibit-dialog__notice">
              本展板为虚构教学情景，非真实案件。
            </p>
            <section v-if="panel.type === 'case'" class="exhibit-dialog__section">
              <h3>教学情景</h3>
              <p>{{ panel.scene }}</p>
            </section>
            <section v-if="panel.type === 'case'" class="exhibit-dialog__section exhibit-dialog__section--answer">
              <h3>正确做法</h3>
              <p>{{ panel.correct }}</p>
            </section>
            <section class="exhibit-dialog__section">
              <h3>{{ panel.type === 'case' ? '警示要点' : '廉洁提醒' }}</h3>
              <p>{{ panel.body }}</p>
            </section>
            <p v-if="panel.source" class="exhibit-dialog__source">内容来源：内部教学情景 {{ panel.source }}</p>
          </div>

          <footer class="exhibit-dialog__footer">
            <button type="button" class="btn btn--primary btn--block" @click="close">铭记于心</button>
          </footer>
        </article>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.exhibit-overlay {
  position: fixed;
  inset: 0;
  z-index: 70;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--gap-md);
  background: rgba(43, 33, 24, 0.72);
}

.exhibit-dialog {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 460px;
  max-height: 84vh;
  max-height: 84dvh;
  overflow: hidden;
  border: 1px solid rgba(184, 134, 63, 0.45);
  border-radius: var(--radius-lg);
  background: var(--color-cream);
  box-shadow: var(--shadow-float);
}

.exhibit-dialog__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--gap-md);
  padding: var(--gap-lg) var(--gap-lg) var(--gap-md);
  border-bottom: 1px solid rgba(122, 74, 43, 0.14);
}

.exhibit-dialog__eyebrow {
  margin-bottom: var(--gap-xs);
  color: var(--panel-accent);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
}

.exhibit-dialog__title {
  color: var(--color-brown-dark);
  font-size: 23px;
  letter-spacing: 0.06em;
  line-height: 1.4;
}

.exhibit-dialog__close {
  display: grid;
  flex: 0 0 44px;
  place-items: center;
  width: 44px;
  height: 44px;
  margin: -8px -10px 0 0;
  border-radius: 50%;
  color: var(--color-brown);
}

.exhibit-dialog__close:hover {
  background: var(--color-cream-dark);
}

.exhibit-dialog__content {
  display: flex;
  flex-direction: column;
  gap: var(--gap-md);
  padding: var(--gap-md) var(--gap-lg);
  overflow-y: auto;
  overscroll-behavior: contain;
}

.exhibit-dialog__summary {
  color: var(--color-ink-soft);
  font-family: var(--font-serif);
  font-size: 15px;
  line-height: 1.8;
}

.exhibit-dialog__notice {
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  background: rgba(158, 43, 37, 0.08);
  color: var(--color-red);
  font-size: 12px;
}

.exhibit-dialog__section {
  padding: var(--gap-md);
  border-left: 3px solid var(--panel-accent);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  background: rgba(230, 213, 184, 0.42);
}

.exhibit-dialog__section--answer {
  border-left-color: var(--color-green);
  background: rgba(63, 92, 74, 0.07);
}

.exhibit-dialog__section h3 {
  margin-bottom: var(--gap-xs);
  color: var(--color-brown-dark);
  font-size: 15px;
  letter-spacing: 0.05em;
}

.exhibit-dialog__section p {
  color: var(--color-ink-soft);
  font-size: 14px;
  line-height: 1.85;
}

.exhibit-dialog__source {
  color: var(--color-ink-soft);
  font-size: 11px;
  text-align: right;
}

.exhibit-dialog__footer {
  padding: var(--gap-md) var(--gap-lg) var(--gap-lg);
}

@media (max-width: 480px) {
  .exhibit-dialog__header {
    padding: var(--gap-md) var(--gap-md) 12px;
  }

  .exhibit-dialog__title {
    font-size: 20px;
  }

  .exhibit-dialog__content {
    padding: var(--gap-md);
  }

  .exhibit-dialog__footer {
    padding: 12px var(--gap-md) var(--gap-md);
  }
}
</style>

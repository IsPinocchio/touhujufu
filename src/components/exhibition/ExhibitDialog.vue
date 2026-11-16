<script setup>
/**
 * 展板详情弹框：标题 + 元信息 + 名言 + 图片位 + 分段正文 + 资料来源。
 * 支持 Esc 关闭与焦点圈定（Tab 循环）。
 */
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import SvgIcon from '@/components/common/SvgIcon.vue'

const props = defineProps({
  panel: { type: Object, default: null },
  roomName: { type: String, default: '' },
  accent: { type: String, default: 'var(--color-green)' },
  theme: { type: String, default: 'parchment' },
})
const emit = defineEmits(['close'])

const dialogRef = ref(null)
const closeButtonRef = ref(null)
const hasProfile = computed(() => props.panel && 'image' in props.panel && props.panel.meta?.length)
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
          :class="{ 'exhibit-dialog--dark': theme === 'crimson' }"
          :style="{ '--panel-accent': accent }"
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

            <blockquote v-if="panel.quote" class="exhibit-dialog__quote">
              <p>{{ panel.quote.text }}</p>
              <cite>—— {{ panel.quote.from }}</cite>
            </blockquote>

            <div v-if="hasProfile" class="exhibit-dialog__profile">
              <dl class="exhibit-dialog__meta">
                <div v-for="item in panel.meta" :key="item.label" class="exhibit-dialog__meta-item">
                  <dt>{{ item.label }}</dt>
                  <dd>{{ item.value }}</dd>
                </div>
              </dl>
              <figure class="exhibit-dialog__figure">
                <img v-if="panel.image" :src="panel.image" :alt="panel.title" />
                <div v-else class="exhibit-dialog__figure-placeholder" aria-hidden="true">
                  <span>{{ roomName.slice(0, 1) }}</span>
                  <small>影像资料 · 待补充</small>
                </div>
              </figure>
            </div>
            <template v-else>
              <figure v-if="'image' in panel" class="exhibit-dialog__figure">
                <img v-if="panel.image" :src="panel.image" :alt="panel.title" />
                <div v-else class="exhibit-dialog__figure-placeholder" aria-hidden="true">
                  <span>{{ roomName.slice(0, 1) }}</span>
                  <small>影像资料 · 待补充</small>
                </div>
              </figure>

              <dl v-if="panel.meta?.length" class="exhibit-dialog__meta">
                <div v-for="item in panel.meta" :key="item.label" class="exhibit-dialog__meta-item">
                  <dt>{{ item.label }}</dt>
                  <dd>{{ item.value }}</dd>
                </div>
              </dl>
            </template>

            <section
              v-for="section in panel.sections"
              :key="section.heading"
              class="exhibit-dialog__section"
            >
              <h3>{{ section.heading }}</h3>
              <p>{{ section.body }}</p>
            </section>

            <p v-if="panel.source" class="exhibit-dialog__source">{{ panel.source }}</p>
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
  max-width: 560px;
  max-height: 86vh;
  max-height: 86dvh;
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
  font-size: 24px;
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

/* 防止 flex 收缩把图片区块压塌：内容超高应滚动而非压缩 */
.exhibit-dialog__content > * {
  flex-shrink: 0;
}

.exhibit-dialog__summary {
  color: var(--color-ink-soft);
  font-family: var(--font-serif);
  font-size: 15px;
  line-height: 1.8;
}

.exhibit-dialog__quote {
  padding: var(--gap-md) var(--gap-lg);
  border-top: 1px solid rgba(184, 134, 63, 0.4);
  border-bottom: 1px solid rgba(184, 134, 63, 0.4);
  background: rgba(184, 134, 63, 0.1);
  text-align: center;
}

.exhibit-dialog__quote p {
  color: var(--color-brown-dark);
  font-family: var(--font-serif);
  font-size: 19px;
  letter-spacing: 0.06em;
  line-height: 1.8;
}

.exhibit-dialog__quote cite {
  display: block;
  margin-top: var(--gap-xs);
  color: var(--color-ink-soft);
  font-size: 12px;
  font-style: normal;
}

.exhibit-dialog__figure {
  overflow: hidden;
  border: 1px solid rgba(184, 134, 63, 0.4);
  border-radius: var(--radius-sm);
  background: #efe6d2;
}

.exhibit-dialog__figure img {
  display: block;
  width: 100%;
  height: auto;
  max-height: 52vh;
  object-fit: contain;
}

.exhibit-dialog__figure:has(.exhibit-dialog__figure-placeholder) {
  aspect-ratio: 16 / 9;
}

.exhibit-dialog__figure-placeholder {
  display: grid;
  place-content: center;
  justify-items: center;
  gap: var(--gap-sm);
  width: 100%;
  height: 100%;
  background:
    linear-gradient(135deg, rgba(93, 61, 41, 0.08), rgba(93, 61, 41, 0.02)),
    linear-gradient(180deg, #e6d8ba, #d3c19e);
}

.exhibit-dialog__figure-placeholder span {
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  border-radius: 10px;
  background: var(--panel-accent);
  color: var(--color-cream);
  font-family: var(--font-serif);
  font-size: 30px;
}

.exhibit-dialog__figure-placeholder small {
  color: rgba(74, 44, 31, 0.66);
  font-size: 12px;
  letter-spacing: 0.1em;
}

.exhibit-dialog__meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--gap-sm);
}

/* 人物档案行：左元信息、右照片，行高只由信息列决定 */
.exhibit-dialog__profile {
  display: flex;
  align-items: stretch;
  gap: var(--gap-md);
}

.exhibit-dialog__profile .exhibit-dialog__meta {
  flex: 1 1 0;
  grid-template-columns: 1fr;
  min-width: 0;
}

.exhibit-dialog__profile .exhibit-dialog__figure,
.exhibit-dialog__profile .exhibit-dialog__figure:has(.exhibit-dialog__figure-placeholder) {
  position: relative;
  flex: 0 0 38%;
  aspect-ratio: auto;
}

/* 绝对定位填充：照片不参与行高计算，行高只由左栏文字决定 */
.exhibit-dialog__profile .exhibit-dialog__figure img,
.exhibit-dialog__profile .exhibit-dialog__figure-placeholder {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  max-height: none;
  object-fit: cover;
  object-position: top center;
}

.exhibit-dialog__meta-item {
  padding: 10px 12px;
  border: 1px solid rgba(122, 74, 43, 0.16);
  border-radius: var(--radius-sm);
  background: rgba(230, 213, 184, 0.3);
}

.exhibit-dialog__meta-item dt {
  color: var(--panel-accent);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
}

.exhibit-dialog__meta-item dd {
  margin-top: 3px;
  color: var(--color-brown-dark);
  font-size: 14px;
  line-height: 1.6;
}

.exhibit-dialog__section {
  padding: var(--gap-md);
  border-left: 3px solid var(--panel-accent);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  background: rgba(230, 213, 184, 0.42);
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

/* —— 警示厅深色档案风（crimson）：深炭灰底 + 冷青蓝信息 + 暗红警示 —— */
.exhibit-dialog--dark {
  --panel-accent: #d4574a;
  border-color: rgba(148, 170, 192, 0.32);
  background: linear-gradient(180deg, #24282e, #1b1e23);
  box-shadow: 0 18px 60px rgba(0, 0, 0, 0.55);
}

.exhibit-dialog--dark .exhibit-dialog__header {
  border-bottom-color: rgba(148, 170, 192, 0.18);
}

.exhibit-dialog--dark .exhibit-dialog__eyebrow {
  color: #d4574a;
  font-family: 'JetBrains Mono', 'Consolas', monospace;
  letter-spacing: 0.12em;
}

.exhibit-dialog--dark .exhibit-dialog__title {
  color: #e8ecf1;
}

.exhibit-dialog--dark .exhibit-dialog__close {
  color: #a9b8c6;
}

.exhibit-dialog--dark .exhibit-dialog__close:hover {
  background: rgba(255, 255, 255, 0.08);
}

.exhibit-dialog--dark .exhibit-dialog__summary {
  color: #a9b8c6;
}

.exhibit-dialog--dark .exhibit-dialog__quote {
  border-top-color: rgba(212, 87, 74, 0.4);
  border-bottom-color: rgba(212, 87, 74, 0.4);
  background: rgba(139, 46, 46, 0.16);
}

.exhibit-dialog--dark .exhibit-dialog__quote p {
  color: #f0e2d0;
}

.exhibit-dialog--dark .exhibit-dialog__quote cite {
  color: #8a96a3;
}

.exhibit-dialog--dark .exhibit-dialog__figure {
  border-color: rgba(74, 158, 255, 0.28);
  background: #101316;
}

.exhibit-dialog--dark .exhibit-dialog__figure-placeholder {
  background: linear-gradient(180deg, #1d2126, #14171b);
}

.exhibit-dialog--dark .exhibit-dialog__figure-placeholder span {
  border-radius: 4px;
  background: #8b2e2e;
  color: #f0e2d0;
}

.exhibit-dialog--dark .exhibit-dialog__figure-placeholder small {
  color: rgba(159, 178, 200, 0.6);
}

.exhibit-dialog--dark .exhibit-dialog__meta-item {
  border-color: rgba(148, 170, 192, 0.2);
  background: rgba(255, 255, 255, 0.04);
}

.exhibit-dialog--dark .exhibit-dialog__meta-item dt {
  color: #d4574a;
  font-family: 'JetBrains Mono', 'Consolas', monospace;
}

.exhibit-dialog--dark .exhibit-dialog__meta-item dd {
  color: #dfe6ec;
}

.exhibit-dialog--dark .exhibit-dialog__section {
  border-left-color: #8b2e2e;
  background: rgba(255, 255, 255, 0.045);
}

.exhibit-dialog--dark .exhibit-dialog__section h3 {
  color: #8fb4dd;
}

.exhibit-dialog--dark .exhibit-dialog__section p {
  color: #a9b8c6;
}

.exhibit-dialog--dark .exhibit-dialog__source {
  color: #6b7683;
  font-family: 'JetBrains Mono', 'Consolas', monospace;
}

.exhibit-dialog--dark .exhibit-dialog__footer .btn--primary {
  border-color: #8b2e2e;
  background: #8b2e2e;
  box-shadow: 0 6px 18px rgba(139, 46, 46, 0.35);
}

.exhibit-dialog--dark .exhibit-dialog__footer .btn--primary:hover {
  background: #a03a3a;
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

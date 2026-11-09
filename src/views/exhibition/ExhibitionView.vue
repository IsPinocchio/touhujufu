<script setup>
/**
 * 廉洁展馆（全屏沉浸式）
 * 所有展览内容都在 3D 展厅内呈现，页面本身只承载：
 * - 全屏 3D 场景
 * - 悬浮的展厅标识 / 切换 / 返回入口
 * - WebGL 不可用时的展板列表兜底
 */
import { computed, ref } from 'vue'
import ExhibitionScene from '@/components/exhibition/ExhibitionScene.vue'
import ExhibitDialog from '@/components/exhibition/ExhibitDialog.vue'
import SvgIcon from '@/components/common/SvgIcon.vue'
import { exhibitionRooms } from '@/data/exhibition'

const activeRoomId = ref(exhibitionRooms[0].id)
const selectedPanel = ref(null)
const sceneFailed = ref(false)
const switching = ref(false)
let switchTimer = 0

const currentRoom = computed(
  () => exhibitionRooms.find((room) => room.id === activeRoomId.value) || exhibitionRooms[0]
)
const nextRoom = computed(
  () => exhibitionRooms.find((room) => room.id !== activeRoomId.value) || exhibitionRooms[0]
)

function enterRoom(roomId) {
  if (roomId === activeRoomId.value) return
  // 过门转场：淡入淡出遮罩下切换展厅
  switching.value = true
  clearTimeout(switchTimer)
  switchTimer = setTimeout(() => {
    activeRoomId.value = roomId
    selectedPanel.value = null
    switchTimer = setTimeout(() => {
      switching.value = false
    }, 220)
  }, 260)
}

function openPanel(panel) {
  selectedPanel.value = panel
}
</script>

<template>
  <div class="exhibition-page">
    <!-- 全屏 3D 展厅 -->
    <ExhibitionScene
      v-if="!sceneFailed"
      :rooms="exhibitionRooms"
      :active-room-id="activeRoomId"
      @select-panel="openPanel"
      @enter-room="enterRoom"
      @webgl-fail="sceneFailed = true"
    />

    <!-- WebGL 兜底：展板列表 -->
    <div v-else class="exhibition-fallback">
      <h2 class="exhibition-fallback__title">{{ currentRoom.name }}</h2>
      <p class="exhibition-fallback__note">当前设备未能加载 3D 展厅，可点击下方展板阅读全部内容。</p>
      <div class="exhibition-fallback__list">
        <button
          v-for="(panel, index) in currentRoom.panels"
          :key="panel.id"
          type="button"
          class="exhibition-fallback__item"
          @click="openPanel(panel)"
        >
          <span class="exhibition-fallback__number">{{ String(index + 1).padStart(2, '0') }}</span>
          <span>
            <strong>{{ panel.title }}</strong>
            <small>{{ panel.summary }}</small>
          </span>
        </button>
      </div>
    </div>

    <!-- 顶部悬浮：返回 + 展厅标识 -->
    <header class="exhibition-hud exhibition-hud--top">
      <RouterLink to="/" class="exhibition-hud__back">
        <SvgIcon name="back" :size="18" />
        返回星球
      </RouterLink>
      <Transition name="fade" mode="out-in">
        <div :key="currentRoom.id" class="exhibition-hud__room">
          <span class="exhibition-hud__seal" :style="{ background: currentRoom.accent }">
            {{ currentRoom.seal }}
          </span>
          <div>
            <h1>{{ currentRoom.name }}</h1>
            <p>{{ currentRoom.subtitle }}</p>
          </div>
        </div>
      </Transition>
    </header>

    <!-- 底部悬浮：操作提示 + 展厅切换 -->
    <footer class="exhibition-hud exhibition-hud--bottom">
      <p class="exhibition-hud__hint">拖动环视展厅 · 点击画框阅读详情 · 点击侧门前往「{{ nextRoom.name }}」</p>
      <div class="exhibition-hud__tabs" role="group" aria-label="切换展厅">
        <button
          v-for="room in exhibitionRooms"
          :key="room.id"
          type="button"
          class="room-tab"
          :class="{ 'room-tab--active': room.id === activeRoomId }"
          :style="{ '--room-accent': room.accent }"
          :aria-pressed="room.id === activeRoomId"
          @click="enterRoom(room.id)"
        >
          <span class="room-tab__seal">{{ room.seal }}</span>
          {{ room.name }}
        </button>
      </div>
    </footer>

    <!-- 换厅转场遮罩 -->
    <Transition name="fade">
      <div v-if="switching" class="exhibition-veil" aria-hidden="true" />
    </Transition>

    <ExhibitDialog
      :panel="selectedPanel"
      :room-name="currentRoom.name"
      :accent="currentRoom.accent"
      @close="selectedPanel = null"
    />
  </div>
</template>

<style scoped>
.exhibition-page {
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: #ded0b6;
}

/* —— 悬浮层 —— */
.exhibition-hud {
  position: absolute;
  left: 0;
  right: 0;
  z-index: 5;
  display: flex;
  align-items: center;
  gap: var(--gap-md);
  padding: var(--gap-md) var(--gap-lg);
  pointer-events: none;
}

.exhibition-hud > * {
  pointer-events: auto;
}

.exhibition-hud--top {
  top: 0;
  justify-content: space-between;
}

.exhibition-hud--bottom {
  bottom: 0;
  flex-direction: column;
  align-items: center;
  padding-bottom: calc(var(--gap-lg) + var(--safe-bottom));
}

.exhibition-hud__back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 16px;
  border: 1px solid rgba(244, 234, 216, 0.4);
  border-radius: 999px;
  background: rgba(43, 33, 24, 0.6);
  color: var(--color-cream);
  font-size: 13px;
  backdrop-filter: blur(4px);
}

.exhibition-hud__room {
  display: flex;
  align-items: center;
  gap: var(--gap-sm);
  padding: 8px 18px 8px 8px;
  border: 1px solid rgba(244, 234, 216, 0.35);
  border-radius: 999px;
  background: rgba(43, 33, 24, 0.6);
  backdrop-filter: blur(4px);
}

.exhibition-hud__seal {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  color: var(--color-cream);
  font-family: var(--font-serif);
  font-size: 22px;
  font-weight: 700;
}

.exhibition-hud__room h1 {
  color: var(--color-cream);
  font-family: var(--font-serif);
  font-size: 17px;
  letter-spacing: 0.12em;
}

.exhibition-hud__room p {
  color: rgba(244, 234, 216, 0.72);
  font-size: 11px;
  letter-spacing: 0.1em;
}

.exhibition-hud__hint {
  padding: 6px 16px;
  border-radius: 999px;
  background: rgba(43, 33, 24, 0.55);
  color: rgba(244, 234, 216, 0.85);
  font-size: 11px;
  letter-spacing: 0.06em;
  backdrop-filter: blur(4px);
}

.exhibition-hud__tabs {
  display: flex;
  gap: var(--gap-sm);
}

.room-tab {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 46px;
  padding: 6px 18px;
  border: 1px solid rgba(244, 234, 216, 0.4);
  border-radius: 999px;
  background: rgba(43, 33, 24, 0.6);
  color: var(--color-cream);
  font-family: var(--font-serif);
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.06em;
  backdrop-filter: blur(4px);
  transition: background var(--dur-fast) ease, border-color var(--dur-fast) ease;
}

.room-tab--active {
  border-color: var(--room-accent);
  background: var(--room-accent);
}

.room-tab__seal {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border: 1px solid currentColor;
  border-radius: 6px;
  font-size: 14px;
}

/* —— 换厅转场遮罩 —— */
.exhibition-veil {
  position: absolute;
  inset: 0;
  z-index: 8;
  background: #2b2118;
  pointer-events: none;
}

/* —— WebGL 兜底列表 —— */
.exhibition-fallback {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  gap: var(--gap-md);
  padding: 96px var(--gap-lg) 150px;
  overflow-y: auto;
  background: linear-gradient(180deg, #efe4cb, #e0d0b0);
}

.exhibition-fallback__title {
  color: var(--color-brown-dark);
  font-family: var(--font-serif);
  font-size: 24px;
  letter-spacing: 0.1em;
  text-align: center;
}

.exhibition-fallback__note {
  color: var(--color-ink-soft);
  font-size: 12px;
  text-align: center;
}

.exhibition-fallback__list {
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
  width: 100%;
  max-width: 640px;
  margin: 0 auto;
}

.exhibition-fallback__item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border: 1px solid rgba(122, 74, 43, 0.16);
  border-radius: var(--radius-md);
  background: rgba(250, 244, 230, 0.8);
  text-align: left;
}

.exhibition-fallback__number {
  flex: 0 0 auto;
  color: var(--color-red);
  font-family: var(--font-serif);
  font-size: 16px;
}

.exhibition-fallback__item strong {
  display: block;
  color: var(--color-brown-dark);
  font-family: var(--font-serif);
  font-size: 15px;
}

.exhibition-fallback__item small {
  display: block;
  margin-top: 2px;
  color: var(--color-ink-soft);
  font-size: 12px;
}

@media (max-width: 480px) {
  .exhibition-hud {
    padding: var(--gap-sm) var(--gap-md);
  }

  .exhibition-hud__room h1 {
    font-size: 15px;
  }

  .room-tab {
    padding: 6px 12px;
    font-size: 12px;
  }
}
</style>

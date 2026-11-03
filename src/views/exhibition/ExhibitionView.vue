<script setup>
import { computed, ref } from 'vue'
import ExhibitionScene from '@/components/exhibition/ExhibitionScene.vue'
import ExhibitDialog from '@/components/exhibition/ExhibitDialog.vue'
import { exhibitionRooms } from '@/data/exhibition'

const activeRoomId = ref(exhibitionRooms[0].id)
const selectedPanel = ref(null)
const currentRoom = computed(
  () => exhibitionRooms.find((room) => room.id === activeRoomId.value) || exhibitionRooms[0]
)
const nextRoom = computed(
  () => exhibitionRooms.find((room) => room.id !== activeRoomId.value) || exhibitionRooms[0]
)

function enterRoom(roomId) {
  activeRoomId.value = roomId
  selectedPanel.value = null
}

function openPanel(panel) {
  selectedPanel.value = panel
}
</script>

<template>
  <div class="page exhibition-page">
    <header class="exhibition-hero anim-slide-down">
      <div class="exhibition-hero__seal">馆</div>
      <h1 class="exhibition-hero__title">廉洁展馆</h1>
      <p class="exhibition-hero__subtitle">沉浸式廉政教育 · 观展知纪 · 以案为鉴</p>
    </header>

    <section class="exhibition-hall card anim-slide-up">
      <div class="exhibition-hall__heading">
        <div>
          <p class="exhibition-hall__eyebrow">当前展厅</p>
          <h2>{{ currentRoom.name }}</h2>
        </div>
        <span class="exhibition-hall__seal" :style="{ background: currentRoom.accent }">
          {{ currentRoom.seal }}
        </span>
      </div>
      <p class="exhibition-hall__description">{{ currentRoom.description }}</p>

      <div class="exhibition-hall__scene">
        <ExhibitionScene
          :rooms="exhibitionRooms"
          :active-room-id="activeRoomId"
          @select-panel="openPanel"
          @enter-room="enterRoom"
        />
        <span class="exhibition-hall__badge">3D 展厅</span>
      </div>
      <p class="exhibition-hall__hint">拖动环视 · 点击展板阅读 · 点击侧门前往{{ nextRoom.name }}</p>

      <div class="exhibition-hall__tabs" role="group" aria-label="切换展厅">
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
          <span>{{ room.name }}</span>
        </button>
      </div>
    </section>

    <section class="exhibition-directory card anim-slide-up">
      <div class="exhibition-directory__heading">
        <div>
          <p class="exhibition-directory__eyebrow">展板导览</p>
          <h2>{{ currentRoom.name }}</h2>
        </div>
        <span>{{ currentRoom.panels.length }} 块展板</span>
      </div>
      <Transition name="fade" mode="out-in">
        <div :key="currentRoom.id" class="exhibition-directory__list">
          <button
            v-for="(panel, index) in currentRoom.panels"
            :key="panel.id"
            type="button"
            class="exhibit-link"
            :style="{ '--room-accent': currentRoom.accent }"
            @click="openPanel(panel)"
          >
            <span class="exhibit-link__number">0{{ index + 1 }}</span>
            <span class="exhibit-link__text">
              <strong>{{ panel.title }}</strong>
              <small>{{ panel.summary }}</small>
            </span>
            <span class="exhibit-link__arrow" aria-hidden="true">→</span>
          </button>
        </div>
      </Transition>
    </section>

    <p class="exhibition-page__motto">以清为美 · 以廉为荣 · 以慎为尺</p>

    <ExhibitDialog
      :panel="selectedPanel"
      :room-name="currentRoom.name"
      @close="selectedPanel = null"
    />
  </div>
</template>

<style scoped>
.exhibition-page {
  gap: var(--gap-lg);
}

.exhibition-hero {
  padding: var(--gap-xl) 0 var(--gap-md);
  text-align: center;
}

.exhibition-hero__seal {
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  margin: 0 auto var(--gap-sm);
  border-radius: 12px;
  background: var(--color-red);
  box-shadow: var(--shadow-card);
  color: var(--color-cream);
  font-family: var(--font-serif);
  font-size: 34px;
  font-weight: 700;
}

.exhibition-hero__title {
  color: var(--color-brown-dark);
  font-size: 34px;
  letter-spacing: 0.18em;
}

.exhibition-hero__subtitle {
  margin-top: var(--gap-xs);
  color: var(--color-ink-soft);
  font-size: 13px;
}

.exhibition-hall {
  padding: 14px;
}

.exhibition-hall__heading,
.exhibition-directory__heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--gap-md);
  padding: 4px 4px 0;
}

.exhibition-hall__heading h2,
.exhibition-directory__heading h2 {
  color: var(--color-brown-dark);
  font-size: 20px;
  letter-spacing: 0.06em;
}

.exhibition-hall__eyebrow,
.exhibition-directory__eyebrow {
  color: var(--color-ink-soft);
  font-size: 11px;
  letter-spacing: 0.12em;
}

.exhibition-hall__seal {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 10px;
  color: var(--color-cream);
  font-family: var(--font-serif);
  font-size: 23px;
  box-shadow: var(--shadow-card);
}

.exhibition-hall__description {
  padding: var(--gap-sm) 4px var(--gap-md);
  color: var(--color-ink-soft);
  font-size: 13px;
  line-height: 1.75;
}

.exhibition-hall__scene {
  position: relative;
}

.exhibition-hall__badge {
  position: absolute;
  top: 12px;
  left: 12px;
  padding: 4px 9px;
  border: 1px solid rgba(244, 234, 216, 0.45);
  border-radius: 999px;
  background: rgba(43, 33, 24, 0.66);
  color: var(--color-cream);
  font-size: 10px;
  letter-spacing: 0.08em;
  pointer-events: none;
}

.exhibition-hall__hint {
  padding: 10px 4px;
  color: var(--color-ink-soft);
  font-size: 11px;
  text-align: center;
}

.exhibition-hall__tabs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--gap-sm);
}

.room-tab {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--gap-sm);
  min-height: 48px;
  padding: 6px 10px;
  border: 1px solid rgba(122, 74, 43, 0.22);
  border-radius: var(--radius-md);
  color: var(--color-brown-dark);
  font-family: var(--font-serif);
  font-size: 14px;
  font-weight: 700;
  transition: background var(--dur-fast) ease, color var(--dur-fast) ease;
}

.room-tab--active {
  border-color: var(--room-accent);
  background: var(--room-accent);
  color: var(--color-cream);
}

.room-tab__seal {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border: 1px solid currentColor;
  border-radius: 6px;
  font-size: 15px;
}

.exhibition-directory__heading {
  padding: 0 0 var(--gap-md);
}

.exhibition-directory__heading > span {
  color: var(--color-ink-soft);
  font-size: 12px;
}

.exhibition-directory__list {
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
}

.exhibit-link {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 72px;
  padding: 12px;
  border: 1px solid rgba(122, 74, 43, 0.14);
  border-radius: var(--radius-md);
  background: rgba(230, 213, 184, 0.3);
  text-align: left;
  transition: border-color var(--dur-fast) ease, background var(--dur-fast) ease,
    transform var(--dur-fast) ease;
}

.exhibit-link:hover {
  border-color: var(--room-accent);
  background: rgba(230, 213, 184, 0.58);
  transform: translateY(-1px);
}

.exhibit-link__number {
  display: grid;
  flex: 0 0 40px;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--room-accent);
  color: var(--color-cream);
  font-family: var(--font-serif);
  font-size: 15px;
}

.exhibit-link__text {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.exhibit-link__text strong {
  color: var(--color-brown-dark);
  font-family: var(--font-serif);
  font-size: 15px;
  letter-spacing: 0.04em;
}

.exhibit-link__text small {
  margin-top: 2px;
  color: var(--color-ink-soft);
  font-size: 11px;
  line-height: 1.55;
}

.exhibit-link__arrow {
  color: var(--room-accent);
  font-size: 20px;
}

.exhibition-page__motto {
  color: var(--color-ink-soft);
  font-family: var(--font-serif);
  font-size: 13px;
  letter-spacing: 0.16em;
  text-align: center;
}

@media (max-width: 480px) {
  .exhibition-hero {
    padding-top: var(--gap-lg);
  }

  .exhibition-hero__title {
    font-size: 30px;
  }

  .exhibition-hall {
    padding: 10px;
  }

  .room-tab {
    gap: 6px;
    padding: 6px;
    font-size: 13px;
  }

  .exhibit-link {
    gap: 10px;
    padding: 10px;
  }
}
</style>

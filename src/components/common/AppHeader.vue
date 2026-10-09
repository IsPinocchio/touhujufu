<script setup>
/**
 * 顶部栏：标题 + 当前用户按钮 + 可折叠菜单按钮 + 音效开关
 */
import { useSettingsStore } from '@/stores/settings'
import { useAuthStore } from '@/stores/auth'
import { setAudioEnabled } from '@/utils/audio'
import SvgIcon from './SvgIcon.vue'

defineProps({
  open: { type: Boolean, default: false },
})
const emit = defineEmits(['update:open'])

const settings = useSettingsStore()
const auth = useAuthStore()

function toggleSound() {
  settings.toggleSound()
  setAudioEnabled(settings.soundEnabled)
}
</script>

<template>
  <header class="app-header">
    <RouterLink to="/" class="app-header__brand">
      <span class="app-header__logo">廉</span>
      <span class="app-header__title">廉动星球</span>
    </RouterLink>

    <div class="app-header__actions">
      <!-- 当前登录用户：点击展开菜单（退出登录在菜单里） -->
      <button
        v-if="auth.isLoggedIn"
        class="app-header__user"
        type="button"
        :title="`当前登录：${auth.user?.displayName || ''}`"
        @click="emit('update:open', !open)"
      >
        <span class="app-header__avatar">{{ (auth.user?.displayName || '…').slice(0, 1) }}</span>
        <span class="app-header__username">{{ auth.user?.displayName || '…' }}</span>
      </button>
      <button
        class="icon-btn"
        type="button"
        :aria-label="settings.soundEnabled ? '关闭音效' : '开启音效'"
        @click="toggleSound"
      >
        <SvgIcon :name="settings.soundEnabled ? 'sound' : 'mute'" :size="22" />
      </button>
      <button
        class="icon-btn"
        type="button"
        aria-label="打开菜单"
        @click="emit('update:open', !open)"
      >
        <SvgIcon :name="open ? 'close' : 'menu'" :size="22" />
      </button>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  position: relative;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 560px;
  margin: 0 auto;
  padding: var(--gap-md) var(--gap-md) var(--gap-sm);
}
.app-header__brand {
  display: flex;
  align-items: center;
  gap: var(--gap-sm);
}
.app-header__logo {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--color-brown-dark);
  color: var(--color-cream);
  font-family: var(--font-serif);
  font-weight: 700;
  font-size: 18px;
}
.app-header__title {
  font-family: var(--font-serif);
  font-weight: 700;
  font-size: 18px;
  letter-spacing: 0.06em;
  color: var(--color-ink);
}
.app-header__actions {
  display: flex;
  align-items: center;
  gap: var(--gap-sm);
}
.app-header__user {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px 4px 4px;
  border-radius: 20px;
  background: rgba(244, 234, 216, 0.7);
  color: var(--color-brown-dark);
  transition: background var(--dur-fast) ease;
}
.app-header__user:active {
  background: var(--color-cream-dark);
}
.app-header__avatar {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: var(--color-green);
  color: var(--color-cream);
  font-family: var(--font-serif);
  font-size: 15px;
  font-weight: 700;
}
.app-header__username {
  font-size: 14px;
  font-weight: 600;
  max-width: 72px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.icon-btn {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(244, 234, 216, 0.7);
  color: var(--color-brown-dark);
  transition: background var(--dur-fast) ease;
}
.icon-btn:active {
  background: var(--color-cream-dark);
}
</style>

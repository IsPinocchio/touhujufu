import { defineStore } from 'pinia'

/**
 * 全局设置 store：音效、动画开关等
 * 使用 pinia-plugin-persistedstate 持久化到 localStorage
 */
export const useSettingsStore = defineStore('settings', {
  state: () => ({
    soundEnabled: true,
    animationEnabled: true,
  }),
  actions: {
    toggleSound() {
      this.soundEnabled = !this.soundEnabled
    },
    toggleAnimation() {
      this.animationEnabled = !this.animationEnabled
    },
  },
  persist: {
    key: 'touhu_settings',
    storage: localStorage,
  },
})

import { defineStore } from 'pinia'

let seq = 0

/**
 * 全局轻提示（toast）：接口报错、登录态失效、守卫拦截等统一从这里弹窗。
 * 用法：useToastStore().show('消息', 'error' | 'info')
 */
export const useToastStore = defineStore('toast', {
  state: () => ({
    items: [], // { id, message, type }
  }),
  actions: {
    show(message, type = 'error', duration = 3500) {
      // 相同消息已在展示时不重复弹，避免并发失败刷屏
      if (this.items.some((t) => t.message === message)) return
      const id = ++seq
      this.items.push({ id, message, type })
      setTimeout(() => this.dismiss(id), duration)
    },
    dismiss(id) {
      this.items = this.items.filter((t) => t.id !== id)
    },
  },
})

import { defineStore } from 'pinia'
import { getToken, setToken } from '@/utils/request'
import { authApi } from '@/utils/authApi'

// 登录状态：token 存 localStorage，用户信息随会话刷新
export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: getToken(),
    user: null, // { id, username, displayName, department, role }
  }),
  getters: {
    isLoggedIn: (s) => !!s.token,
  },
  actions: {
    async login(username, password) {
      const data = await authApi.login(username, password)
      this.token = data.token
      setToken(data.token)
      // 登录响应只有基础字段，再拉一次完整用户信息
      this.user = await authApi.me()
    },
    async register(payload) {
      await authApi.register(payload)
    },
    // 页面刷新后用本地 token 拉一次用户信息，拉不到说明 token 已过期
    async restore() {
      if (!this.token) return
      try {
        this.user = await authApi.me()
      } catch {
        this.logout()
      }
    },
    logout() {
      this.token = null
      this.user = null
      setToken(null)
    },
  },
})

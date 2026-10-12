import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

import App from './App.vue'
import router from './router'
import { setUnauthorizedHandler } from './utils/api'

// 全局样式：先变量后全局，保证变量可用
import './assets/styles/variables.css'
import './assets/styles/global.css'

// 创建 Pinia 并挂载本地持久化插件
const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

// 登录态失效（401）时统一跳回登录页（提示文案由 api.js 的 toast 负责）
setUnauthorizedHandler(() => {
  if (router.currentRoute.value.path !== '/login') {
    router.push('/login')
  }
})

createApp(App).use(pinia).use(router).mount('#app')

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

import App from './App.vue'
import router from './router'

// 全局样式：先变量后全局，保证变量可用
import './assets/styles/variables.css'
import './assets/styles/global.css'

// 创建 Pinia 并挂载本地持久化插件
const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

createApp(App).use(pinia).use(router).mount('#app')

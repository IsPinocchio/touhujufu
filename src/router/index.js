import { createRouter, createWebHashHistory } from 'vue-router'

import HomeView from '@/views/HomeView.vue'
import GameView from '@/views/GameView.vue'
import ResultView from '@/views/ResultView.vue'
import ComingSoon from '@/views/ComingSoon.vue'

/**
 * 路由表：使用 hash 模式，纯前端静态部署无需服务端配置。
 * /learn、/admin 为预留扩展路由，后续可替换为真实页面。
 */
const routes = [
  { path: '/', name: 'home', component: HomeView, meta: { title: '首页' } },
  { path: '/game', name: 'game', component: GameView, meta: { title: '游戏' } },
  { path: '/result', name: 'result', component: ResultView, meta: { title: '结算' } },
  {
    path: '/learn',
    name: 'learn',
    component: ComingSoon,
    meta: { title: '党纪党规学习' },
    props: { title: '党纪党规学习', desc: '后续将在此提供党纪党规系统化学习与答题模块。' },
  },
  {
    path: '/admin',
    name: 'admin',
    component: ComingSoon,
    meta: { title: '管理后台' },
    props: { title: '管理后台', desc: '后续将在此提供题库管理、成绩统计与组织管理能力。' },
  },
  // 兜底重定向到首页
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior() {
    // 切换路由回到顶部
    return { top: 0 }
  },
})

// 路由守卫：更新文档标题
router.afterEach((to) => {
  const base = '投壶拒腐 · 廉洁教育互动游戏'
  document.title = to.meta?.title ? `${to.meta.title} · ${base}` : base
})

export default router

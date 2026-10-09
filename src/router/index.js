import { createRouter, createWebHashHistory } from 'vue-router'

import HomeView from '@/views/HomeView.vue'
import GameView from '@/views/GameView.vue'
import ResultView from '@/views/ResultView.vue'
import ComingSoon from '@/views/ComingSoon.vue'

/**
 * 路由表：使用 hash 模式，纯前端静态部署无需服务端配置。
 * 首页为「廉动星球」3D 星球（bare 布局：隐藏全局顶栏/底栏）；
 * /quiz、/ai、/me 为预留模块路由，后续替换为真实页面。
 */
const routes = [
  { path: '/', name: 'home', component: HomeView, meta: { title: '首页', bare: true } },
  { path: '/game', name: 'game', component: GameView, meta: { title: '投壶拒腐' } },
  { path: '/result', name: 'result', component: ResultView, meta: { title: '结算' } },
  {
    path: '/quiz',
    name: 'quiz',
    component: ComingSoon,
    meta: { title: '知识竞赛' },
    props: { title: '知识竞赛', desc: '党纪党规趣味答题挑战即将上线，敬请期待。' },
  },
  {
    path: '/ai',
    name: 'ai',
    component: ComingSoon,
    meta: { title: 'AI 问答' },
    props: { title: 'AI 问答', desc: '廉洁知识智能问答助手即将上线，敬请期待。' },
  },
  {
    path: '/me',
    name: 'me',
    component: ComingSoon,
    meta: { title: '我的' },
    props: { title: '我的', desc: '个人成绩、清风令成就与领学记录即将上线，敬请期待。' },
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
  const base = '廉动星球'
  document.title = to.meta?.title ? `${to.meta.title} · ${base}` : base
})

export default router

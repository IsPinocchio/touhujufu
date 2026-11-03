import { createRouter, createWebHashHistory } from 'vue-router'

import HomeView from '@/views/HomeView.vue'
import LoginView from '@/views/LoginView.vue'
import GameHomeView from '@/views/touhu/GameHomeView.vue'
import GameView from '@/views/touhu/GameView.vue'
import ResultView from '@/views/touhu/ResultView.vue'
import MeView from '@/views/MeView.vue'
import LeaderboardView from '@/views/touhu/LeaderboardView.vue'
import ExhibitionView from '@/views/exhibition/ExhibitionView.vue'
import ComingSoon from '@/views/ComingSoon.vue'

/**
 * 路由表：使用 hash 模式，纯前端静态部署无需服务端配置。
 * 首页为「廉动星球」3D 星球（bare 布局：隐藏全局顶栏/底栏）；
 * /game 为投壶拒腐封面页（介绍 + 开始/继续），/game/play 为对局页；
 * /quiz、/ai、/me 为预留模块路由，后续替换为真实页面。
 */
const routes = [
  { path: '/', name: 'home', component: HomeView, meta: { title: '首页', bare: true } },
  { path: '/login', name: 'login', component: LoginView, meta: { title: '登录' } },
  { path: '/game', name: 'game', component: GameHomeView, meta: { title: '投壶拒腐' } },
  { path: '/game/play', name: 'gamePlay', component: GameView, meta: { title: '投壶拒腐' } },
  { path: '/result', name: 'result', component: ResultView, meta: { title: '结算' } },
  { path: '/game/leaderboard', name: 'leaderboard', component: LeaderboardView, meta: { title: '本周排行榜' } },
  { path: '/exhibition', name: 'exhibition', component: ExhibitionView, meta: { title: '廉洁展馆' } },
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
    component: MeView,
    meta: { title: '我的' },
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

// 登录守卫：除登录页外，所有页面都要求登录；未登录跳登录页，登录后按 redirect 跳回（默认首页）
// 注意：守卫里不能用 useAuthStore() 顶部导入（pinia 可能尚未激活），改为动态读取 token
import { getToken } from '@/utils/request'
import { useToastStore } from '@/stores/toast'

router.beforeEach((to, from) => {
  if (to.path === '/login') {
    // 已登录用户访问登录页，直接回首页
    return getToken() ? '/' : true
  }
  if (!getToken()) {
    // 应用内跳转（如点「我的」「开始游戏」）被拦下时给出提示；
    // 首次打开站点（from 无来源）静默跳登录页，避免每次访问都弹窗
    if (from.name) {
      useToastStore().show('请先登录后再继续', 'info')
    }
    return { path: '/login', query: to.fullPath === '/' ? {} : { redirect: to.fullPath } }
  }
  return true
})

export default router

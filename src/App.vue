<script setup>
/**
 * 根组件：
 * - 渲染全局背景（渐变 + 远山剪影 + 顶部暗纹）
 * - 提供全局可折叠导航
 * - 承载 <router-view>
 * - 首页（meta.bare）为全屏沉浸式 3D 星球，隐藏顶栏/底栏/背景
 */
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGameStore } from '@/stores/game'
import { useAuthStore } from '@/stores/auth'
import AppHeader from '@/components/common/AppHeader.vue'
import AppFooter from '@/components/common/AppFooter.vue'
import AppToast from '@/components/common/AppToast.vue'

// 全局导航折叠状态
const navOpen = ref(false)
const route = useRoute()
const router = useRouter()
const store = useGameStore()
const auth = useAuthStore()
const isBare = computed(() => !!route.meta?.bare)

// 刷新页面后用本地 token 恢复登录态
onMounted(() => {
  auth.restore()
})

function onLogout() {
  navOpen.value = false
  store.quitGame()
  auth.logout()
  router.push('/login')
}

// 重新游戏 / 退出游戏确认弹窗
const restartConfirm = ref(false)
const quitConfirm = ref(false)

async function onRestart() {
  restartConfirm.value = false
  navOpen.value = false
  try {
    await store.initGame()
    router.push('/game/play')
  } catch (e) {
    console.warn('[投壶拒腐] 重新开局失败', e)
    router.push('/game')
  }
}

function onQuit() {
  quitConfirm.value = false
  navOpen.value = false
  store.quitGame()
  router.push('/game')
}
</script>

<template>
  <!-- 全局背景层：固定定位，位于内容之下 -->
  <div v-if="!isBare" class="bg-layer" aria-hidden="true">
    <!-- 顶部竹叶/暗纹装饰 -->
    <svg class="bg-bamboo" viewBox="0 0 560 200" preserveAspectRatio="xMidYMin slice">
      <g fill="none" stroke="rgba(63,92,74,0.18)" stroke-width="3" stroke-linecap="round">
        <path d="M20 60 C40 30 60 90 80 20" />
        <path d="M44 40 L58 28 M60 58 L72 46 M78 34 L92 22" />
        <path d="M120 20 C140 60 160 30 180 70" />
        <path d="M148 34 L162 44 M166 26 L180 36" />
        <path d="M240 80 C255 45 275 80 295 25" />
        <path d="M262 62 L274 50 M282 44 L294 32" />
        <path d="M420 30 C440 70 460 40 480 80" />
        <path d="M448 50 L462 58 M468 40 L482 48" />
      </g>
    </svg>

    <!-- 底部远山剪影 -->
    <svg class="bg-mountain" viewBox="0 0 560 240" preserveAspectRatio="xMidYMax slice">
      <path
        d="M0 240 L0 190 C60 150 90 210 150 180 C210 150 240 200 300 170 C360 140 390 200 450 175 C500 155 530 190 560 175 L560 240 Z"
        fill="rgba(63,92,74,0.10)"
      />
      <path
        d="M0 240 L0 210 C80 185 120 225 190 205 C260 185 300 225 380 200 C450 180 500 220 560 200 L560 240 Z"
        fill="rgba(74,44,31,0.08)"
      />
    </svg>
  </div>

  <!-- 顶部导航（可折叠；全屏沉浸式页面隐藏） -->
  <AppHeader v-if="!isBare" v-model:open="navOpen" />

  <!-- 全局导航抽屉 -->
  <Transition name="fade">
    <nav v-if="navOpen" class="global-nav" @click="navOpen = false">
      <div class="global-nav__panel" @click.stop>
        <RouterLink to="/" class="global-nav__link">星球首页</RouterLink>
        <RouterLink to="/game" class="global-nav__link">投壶拒腐</RouterLink>
        <RouterLink to="/exhibition" class="global-nav__link" @click="navOpen = false">廉洁展馆</RouterLink>
        <RouterLink to="/quiz" class="global-nav__link">知识竞赛</RouterLink>
        <RouterLink to="/ai" class="global-nav__link">AI 问答</RouterLink>
        <RouterLink to="/me" class="global-nav__link">我的</RouterLink>
        <RouterLink v-if="!auth.isLoggedIn" to="/login" class="global-nav__link">登录</RouterLink>
        <button
          v-else
          class="global-nav__link global-nav__link--danger"
          type="button"
          @click="onLogout"
        >
          退出登录（{{ auth.user?.displayName || '已登录' }}）
        </button>
        <button
          v-if="store.hasActiveGame"
          class="global-nav__link global-nav__link--danger"
          type="button"
          @click="restartConfirm = true"
        >
          重新游戏
        </button>
        <button
          v-if="store.hasActiveGame"
          class="global-nav__link global-nav__link--danger"
          type="button"
          @click="quitConfirm = true"
        >
          退出游戏
        </button>
      </div>
    </nav>
  </Transition>

  <!-- 重新游戏确认 -->
  <Transition name="fade">
    <div v-if="restartConfirm" class="restart-overlay" @click.self="restartConfirm = false">
      <div class="restart-modal anim-pop-in" role="dialog" aria-modal="true">
        <p class="restart-modal__title">重新游戏？</p>
        <p class="restart-modal__sub">当前进度将清空，从第 1 轮重新开始</p>
        <button class="btn btn--primary btn--block" type="button" @click="onRestart">重新开始</button>
        <button class="btn btn--ghost btn--block" type="button" @click="restartConfirm = false">继续本局</button>
      </div>
    </div>
  </Transition>

  <!-- 退出游戏确认 -->
  <Transition name="fade">
    <div v-if="quitConfirm" class="restart-overlay" @click.self="quitConfirm = false">
      <div class="restart-modal anim-pop-in" role="dialog" aria-modal="true">
        <p class="restart-modal__title">退出游戏？</p>
        <p class="restart-modal__sub">当前进度将清空，返回游戏封面</p>
        <button class="btn btn--danger btn--block" type="button" @click="onQuit">退出游戏</button>
        <button class="btn btn--ghost btn--block" type="button" @click="quitConfirm = false">继续本局</button>
      </div>
    </div>
  </Transition>

  <!-- 页面主体 -->
  <main class="app-main">
    <RouterView v-slot="{ Component }">
      <Transition name="page" mode="out-in">
        <component :is="Component" />
      </Transition>
    </RouterView>
  </main>

  <AppFooter v-if="!isBare" />

  <!-- 全局轻提示（接口报错 / 登录态失效等） -->
  <AppToast />
</template>

<style scoped>
.app-main {
  position: relative;
  z-index: 1;
}

/* 页面切换过渡 */
.page-enter-active,
.page-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}
.page-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.page-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* —— 背景层 —— */
.bg-layer {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  /* 渐变底色：米白到淡米 */
  background: linear-gradient(180deg, var(--bg-top) 0%, var(--bg-bottom) 100%);
  pointer-events: none;
}
.bg-bamboo {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 40%;
}
.bg-mountain {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 55%;
}

/* —— 全局导航抽屉 —— */
.global-nav {
  position: fixed;
  inset: 0;
  z-index: 60;
  background: rgba(43, 33, 24, 0.4);
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
}
.global-nav__panel {
  margin: 12px;
  padding: var(--gap-md);
  background: var(--color-cream);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-float);
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
  min-width: 180px;
  animation: slide-down var(--dur-base) ease both;
}
.global-nav__link {
  padding: 12px 16px;
  border-radius: var(--radius-sm);
  color: var(--color-ink);
  font-size: 15px;
  transition: background var(--dur-fast) ease;
}
.global-nav__link:hover,
.global-nav__link.router-link-active {
  background: var(--color-cream-dark);
}
.global-nav__link--danger {
  text-align: left;
  border-top: 1px solid var(--color-cream-dark);
  border-radius: 0 0 var(--radius-sm) var(--radius-sm);
  color: var(--color-red);
}

/* —— 重新游戏确认弹窗 —— */
.restart-overlay {
  position: fixed;
  inset: 0;
  z-index: 70;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--gap-md);
  background: rgba(43, 33, 24, 0.7);
}
.restart-modal {
  width: 100%;
  max-width: 320px;
  padding: var(--gap-lg);
  background: var(--color-cream);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-float);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--gap-sm);
  text-align: center;
}
.restart-modal__title {
  font-family: var(--font-serif);
  font-size: 19px;
  letter-spacing: 0.06em;
  color: var(--color-brown-dark);
}
.restart-modal__sub {
  font-size: 12px;
  color: var(--color-ink-soft);
  margin-bottom: var(--gap-sm);
}
</style>

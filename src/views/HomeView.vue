<script setup>
/**
 * 廉动星球 · 首页
 * 全屏沉浸式的 3D 星球：表面五块功能大陆，点击 / 拖动进入对应模块。
 * 底部提供模块清单（星球标签被转走时的兜底入口）。
 */
import { useRouter } from 'vue-router'
import { useGameStore } from '@/stores/touhu'
import PlanetSphere from '@/components/planet/PlanetSphere.vue'

const router = useRouter()
const game = useGameStore()

// 五块功能大陆：经纬度彼此拉开，形状各不相同
const MODULES = [
  { key: 'game', name: '投壶拒腐败', glyph: '壶', color: '#b03a30', desc: '九轮情景投壶', route: '/game', lat: 14, lon: -40 },
  { key: 'quiz', name: '红线百斩', glyph: '赛', color: '#4a7a58', desc: '党纪党规答题', route: '/quiz', lat: 46, lon: 70 },
  { key: 'scenario', name: '看得见', glyph: '剧', color: '#46618f', desc: '廉洁情景剧本杀', route: '/scenario', lat: -14, lon: 140 },
  { key: 'exhibition', name: '廉洁展馆', glyph: '馆', color: '#7a4a2b', desc: '沉浸警示展厅', route: '/exhibition', lat: 45, lon: -165 },
  { key: 'me', name: '我的', glyph: '我', color: '#c09a4a', desc: '成绩与成就', route: '/me', lat: -38, lon: -105 },
]

function enter(m) {
  router.push(m.route)
}
</script>

<template>
  <div class="planet-home">
    <!-- 云气微光 -->
    <div class="planet-home__nebula" aria-hidden="true" />

    <!-- 背景装饰：祥云 / 竹枝 / 星芒 -->
    <div class="planet-home__ornaments" aria-hidden="true">
      <!-- 左上竹枝 -->
      <svg class="orn-bamboo orn-bamboo--tl" viewBox="0 0 200 200" fill="none"
        stroke="rgba(107,143,122,0.35)" stroke-width="3" stroke-linecap="round">
        <path d="M20 60 C40 30 60 90 80 20" />
        <path d="M44 40 L58 28 M60 58 L72 46 M78 34 L92 22" />
        <path d="M120 20 C140 60 160 30 180 70" />
        <path d="M148 34 L162 44 M166 26 L180 36" />
      </svg>
      <!-- 右下竹枝 -->
      <svg class="orn-bamboo orn-bamboo--br" viewBox="0 0 200 200" fill="none"
        stroke="rgba(122,74,43,0.28)" stroke-width="3" stroke-linecap="round">
        <path d="M180 140 C160 170 140 110 120 180" />
        <path d="M156 160 L142 172 M140 142 L128 154" />
        <path d="M80 180 C60 140 40 170 20 130" />
        <path d="M52 166 L38 156 M34 174 L20 164" />
      </svg>
      <!-- 祥云 -->
      <svg class="orn-cloud orn-cloud--l" viewBox="0 0 120 60" fill="none"
        stroke="rgba(184,134,63,0.45)" stroke-width="2.4" stroke-linecap="round">
        <path d="M14 46 h92" />
        <path d="M22 46 c-9 0-13-10-6-16 c5-5 12-4 16 1 c2-12 20-14 25-3 c11-7 25 2 20 13 c9-2 16 4 14 11" />
        <path d="M44 46 c0-7 11-7 11 0 c0 5-7 5-7 0" />
      </svg>
      <svg class="orn-cloud orn-cloud--r" viewBox="0 0 120 60" fill="none"
        stroke="rgba(158,43,37,0.3)" stroke-width="2.4" stroke-linecap="round">
        <path d="M14 46 h92" />
        <path d="M22 46 c-9 0-13-10-6-16 c5-5 12-4 16 1 c2-12 20-14 25-3 c11-7 25 2 20 13 c9-2 16 4 14 11" />
        <path d="M44 46 c0-7 11-7 11 0 c0 5-7 5-7 0" />
      </svg>
      <!-- 闪烁星芒 -->
      <span class="sparkle sparkle--1">✦</span>
      <span class="sparkle sparkle--2">✦</span>
      <span class="sparkle sparkle--3">✦</span>
      <span class="sparkle sparkle--4">✦</span>
      <span class="sparkle sparkle--5">✦</span>
    </div>

    <!-- 3D 星球 -->
    <PlanetSphere :modules="MODULES" @select="enter" />

    <!-- 品牌区 -->
    <header class="planet-home__brand">
      <div class="planet-home__seal">廉</div>
      <h1 class="planet-home__title">廉动星球</h1>
      <p class="planet-home__slogan">廉于心 · 动于行 · 守廉如守护一颗星</p>
    </header>

    <!-- 底部：操作提示 + 模块清单 -->
    <footer class="planet-home__dock">
      <p class="planet-home__hint">
        <span class="planet-home__hint-icon" aria-hidden="true">✦</span>
        拖动星球旋转 · 点击大陆进入模块
      </p>
      <div class="planet-home__modules">
        <button
          v-for="m in MODULES"
          :key="m.key"
          type="button"
          class="dock-module"
          @click="enter(m)"
        >
          <span class="dock-module__text">
            <span class="dock-module__name">
              {{ m.name }}
              <em v-if="m.key === 'game' && game.hasActiveGame" class="dock-module__badge">进行中</em>
            </span>
            <span class="dock-module__desc">{{ m.desc }}</span>
          </span>
        </button>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.planet-home {
  position: fixed;
  inset: 0;
  overflow: hidden;
  /* 暖纸底色：与投壶拒腐游戏页同源的米白暖调 */
  background: radial-gradient(120% 90% at 50% 0%, #f8f0df 0%, #efdfc2 58%, #e0c89e 100%);
}

/* 云气微光 */
.planet-home__nebula {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(38% 26% at 18% 22%, rgba(184, 134, 63, 0.12), transparent 70%),
    radial-gradient(42% 30% at 84% 68%, rgba(107, 143, 122, 0.12), transparent 70%),
    radial-gradient(30% 22% at 66% 12%, rgba(192, 80, 74, 0.07), transparent 70%);
}

/* —— 背景装饰 —— */
.planet-home__ornaments {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}
.orn-bamboo {
  position: absolute;
  width: 180px;
  height: 180px;
}
.orn-bamboo--tl {
  top: -20px;
  left: -30px;
}
.orn-bamboo--br {
  bottom: -16px;
  right: -26px;
}
.orn-cloud {
  position: absolute;
  width: 132px;
  height: 66px;
  animation: cloud-drift 7s ease-in-out infinite;
}
.orn-cloud--l {
  top: 19%;
  left: 5%;
}
.orn-cloud--r {
  top: 58%;
  right: 4%;
  animation-delay: -3.2s;
}
@keyframes cloud-drift {
  0%, 100% { transform: translateX(0); }
  50% { transform: translateX(10px); }
}
.sparkle {
  position: absolute;
  color: var(--color-gold);
  font-size: 13px;
  animation: hint-twinkle 2.8s ease-in-out infinite;
}
.sparkle--1 { top: 13%; right: 18%; animation-delay: 0s; }
.sparkle--2 { top: 30%; left: 12%; font-size: 9px; animation-delay: 0.7s; }
.sparkle--3 { top: 46%; right: 9%; font-size: 11px; animation-delay: 1.3s; }
.sparkle--4 { top: 66%; left: 16%; animation-delay: 1.9s; }
.sparkle--5 { top: 24%; left: 30%; font-size: 8px; animation-delay: 2.4s; }

/* —— 品牌区 —— */
.planet-home__brand {
  position: absolute;
  top: calc(var(--gap-lg) + env(safe-area-inset-top, 0px));
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  pointer-events: none;
  z-index: 5;
}
.planet-home__seal {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: var(--color-red);
  color: var(--color-cream);
  font-family: var(--font-serif);
  font-size: 26px;
  font-weight: 700;
  box-shadow: 0 0 24px rgba(158, 43, 37, 0.55);
  animation: seal-breathe 3.6s ease-in-out infinite;
}
@keyframes seal-breathe {
  0%, 100% { box-shadow: 0 0 16px rgba(158, 43, 37, 0.45); }
  50% { box-shadow: 0 0 30px rgba(158, 43, 37, 0.75); }
}
.planet-home__title {
  font-family: var(--font-serif);
  font-size: 30px;
  font-weight: 700;
  letter-spacing: 0.32em;
  text-indent: 0.32em; /* 视觉居中补偿字间距 */
  color: var(--color-brown-dark);
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.5);
}
.planet-home__slogan {
  font-size: 12px;
  letter-spacing: 0.22em;
  color: var(--color-ink-soft);
}

/* —— 底部停靠区 —— */
.planet-home__dock {
  position: absolute;
  left: 0;
  right: 0;
  bottom: calc(var(--gap-md) + env(safe-area-inset-bottom, 0px));
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--gap-md);
  padding: 0 var(--gap-md);
  z-index: 5;
}
.planet-home__hint {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  letter-spacing: 0.14em;
  color: var(--color-ink-soft);
}
.planet-home__hint-icon {
  color: #d4af6a;
  animation: hint-twinkle 2.4s ease-in-out infinite;
}
@keyframes hint-twinkle {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}

.planet-home__modules {
  width: 100%;
  max-width: 560px;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: var(--gap-sm);
}
.dock-module {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 10px 4px;
  border-radius: var(--radius-md);
  background: rgba(250, 244, 230, 0.85);
  border: 1px solid rgba(122, 74, 43, 0.16);
  box-shadow: var(--shadow-card);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  transition: border-color var(--dur-fast) ease, background var(--dur-fast) ease,
    transform var(--dur-fast) ease;
}
.dock-module:active {
  transform: scale(0.96);
  border-color: rgba(184, 134, 63, 0.6);
  background: #faf0da;
}
.dock-module__text {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.dock-module__name {
  position: relative;
  font-family: var(--font-serif);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--color-brown-dark);
}
.dock-module__badge {
  position: absolute;
  top: -4px;
  right: -26px;
  font-size: 9px;
  font-style: normal;
  letter-spacing: 0.04em;
  padding: 1px 5px;
  border-radius: 999px;
  background: var(--color-red);
  color: var(--color-cream);
  animation: hint-twinkle 1.8s ease-in-out infinite;
}
.dock-module__desc {
  font-size: 10px;
  letter-spacing: 0.04em;
  color: var(--color-ink-soft);
  transform: scale(0.92);
}

@media (max-width: 480px) {
  .planet-home__dock {
    padding: 0 8px;
  }
  .planet-home__modules {
    gap: 6px;
  }
  .dock-module__name {
    font-size: 11px;
    letter-spacing: 0;
  }
  .dock-module__desc {
    font-size: 9px;
    letter-spacing: 0;
  }
  .dock-module__badge {
    right: -18px;
    font-size: 8px;
  }
}

@media (max-height: 620px) {
  .planet-home__slogan,
  .dock-module__desc {
    display: none;
  }
}
</style>

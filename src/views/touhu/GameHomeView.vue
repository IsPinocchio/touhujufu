<script setup>
/**
 * 投壶拒腐 · 游戏封面
 * - 游戏介绍、规则简介
 * - 开始游戏 / 继续上局（对局进度在服务端，换设备也能续玩）
 */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '@/stores/touhu'
import { useAuthStore } from '@/stores/auth'
import { touhuApi } from '@/utils/touhu/api'

const router = useRouter()
const game = useGameStore()
const auth = useAuthStore()

// 服务端进行中的对局（null = 没有可续的局）
const serverSession = ref(null)
const loading = ref(false)
const errorMsg = ref('')

const hasSave = computed(() => !!serverSession.value)

onMounted(async () => {
  try {
    serverSession.value = await touhuApi.currentSession()
  } catch {
    serverSession.value = null
  }
})

async function startNew() {
  // 未登录先去登录，登录后回到本页
  if (!auth.isLoggedIn) {
    router.push({ path: '/login', query: { redirect: '/game' } })
    return
  }
  if (loading.value) return
  loading.value = true
  errorMsg.value = ''
  try {
    await game.initGame()
    router.push('/game/play')
  } catch (e) {
    errorMsg.value = e.message || '开局失败，请检查网络后重试'
  } finally {
    loading.value = false
  }
}

function continueGame() {
  if (!serverSession.value) return
  game.resumeFromServer(serverSession.value)
  router.push('/game/play')
}
</script>

<template>
  <div class="page game-home">
    <!-- 标题区 -->
    <header class="game-home__hero anim-slide-down">
      <div class="game-home__seal">廉</div>
      <h1 class="game-home__title">投壶拒腐</h1>
      <p class="game-home__subtitle">廉洁教育互动游戏 · 星网数科党管干部专场</p>
    </header>

    <!-- 主题引言 -->
    <section class="game-home__intro card anim-slide-up">
      <p class="game-home__quote">
        先答对，再投准——<br />
        <strong>守廉的每一步，都算分。</strong>
      </p>
    </section>

    <!-- 规则简介 -->
    <section class="game-home__rules card anim-slide-up">
      <h2 class="game-home__heading">规则简介</h2>
      <ul class="game-home__list">
        <li>共 <strong>9 轮</strong>情景抉择，每轮从 ABC 三个做法中选出唯一正确的做法；<strong>选错本题 0 分</strong>，并现场揭晓正确答案与解析。</li>
        <li>选对后进入<strong>投壶定分</strong>：三个壶难度不同——易 10 分、中 15 分、难 20 分，投中得对应分数，<strong>未投中保底 5 分</strong>。</li>
        <li>第 2/4/6/8 轮穿插<strong>法规判断题</strong>，答对得一枚清风令，最终清算每枚 +10 分。</li>
        <li>最终得分 = 各轮得分 + 清风令加成；分数过低需完成廉洁文化课程。</li>
      </ul>
    </section>

    <!-- 操作区 -->
    <div class="game-home__actions anim-slide-up">
      <p v-if="errorMsg" class="game-home__error">{{ errorMsg }}</p>
      <button v-if="hasSave" class="btn btn--green btn--block" type="button" @click="continueGame">
        继续上局（第 {{ serverSession.currentRound > 9 ? 9 : serverSession.currentRound }} 轮）
      </button>
      <button class="btn btn--primary btn--block" type="button" :disabled="loading" @click="startNew">
        {{ loading ? '开局中…' : hasSave ? '重新开始' : '开始游戏' }}
      </button>
      <RouterLink to="/game/leaderboard" class="btn btn--ghost btn--block">本周排行榜</RouterLink>
      <RouterLink to="/" class="btn btn--ghost btn--block">返回星球首页</RouterLink>
    </div>
  </div>
</template>

<style scoped>
.game-home {
  gap: var(--gap-lg);
}
.game-home__hero {
  text-align: center;
  padding: var(--gap-xl) 0 var(--gap-md);
}
.game-home__seal {
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  margin: 0 auto var(--gap-sm);
  border-radius: 12px;
  background: var(--color-red);
  color: var(--color-cream);
  font-family: var(--font-serif);
  font-size: 34px;
  font-weight: 700;
  box-shadow: var(--shadow-card);
}
.game-home__title {
  font-size: 34px;
  letter-spacing: 0.18em;
  color: var(--color-brown-dark);
}
.game-home__subtitle {
  margin-top: var(--gap-xs);
  font-size: 13px;
  color: var(--color-ink-soft);
}
.game-home__quote {
  text-align: center;
  font-family: var(--font-serif);
  font-size: 17px;
  line-height: 1.9;
}
.game-home__quote strong {
  color: var(--color-red);
}
.game-home__heading {
  font-size: 18px;
  margin-bottom: var(--gap-sm);
  color: var(--color-brown-dark);
  letter-spacing: 0.08em;
}
.game-home__list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 14px;
  line-height: 1.7;
}
.game-home__list li::before {
  content: '·';
  margin-right: 8px;
  color: var(--color-red);
  font-weight: 700;
}
.game-home__note {
  margin-top: var(--gap-md);
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  background: rgba(184, 134, 63, 0.12);
  font-size: 13px;
  line-height: 1.7;
}
.game-home__odds {
  color: var(--color-red);
  font-family: var(--font-serif);
  font-size: 16px;
}
.game-home__actions {
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
}
.game-home__error {
  font-size: 13px;
  color: var(--color-red);
  text-align: center;
}
</style>

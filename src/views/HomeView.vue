<script setup>
/**
 * 首页 / 游戏入口
 * - 展示标题、规则简介
 * - 开始游戏 / 继续上局（如有存档）
 */
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '@/stores/game'
import { corruptClueOdds } from '@/utils/probability'

const router = useRouter()
const game = useGameStore()

// 是否有可继续的存档
const hasSave = computed(() => game.hasActiveGame)
const odds = computed(() => (corruptClueOdds() * 100).toFixed(1))

function startNew() {
  game.initGame()
  router.push('/game')
}

function continueGame() {
  router.push('/game')
}
</script>

<template>
  <div class="page home">
    <!-- 标题区 -->
    <header class="home__hero anim-slide-down">
      <div class="home__seal">廉</div>
      <h1 class="home__title">投壶拒腐</h1>
      <p class="home__subtitle">廉洁教育互动游戏 · 星网数科党管干部专场</p>
    </header>

    <!-- 主题引言 -->
    <section class="home__intro card anim-slide-up">
      <p class="home__quote">
        腐败容易、守廉难——但只要你一直伸手，<br />
        <strong>被抓只是时间问题。</strong>
      </p>
    </section>

    <!-- 规则简介 -->
    <section class="home__rules card anim-slide-up">
      <h2 class="home__heading">规则简介</h2>
      <ul class="home__list">
        <li>共 <strong>9 轮</strong>场景抉择，你与 3 名 AI 对手同场竞技。</li>
        <li>每轮选择投向一个壶：<strong>腐败壶</strong>（口大易中，得分高）、<strong>擦边壶</strong>、<strong>廉洁壶</strong>（口小难中，得分低）。</li>
        <li>命中腐败 / 擦边壶必抽一张<strong>线索卡</strong>扣在桌上——可以花钱查看，也可以赌它没事。</li>
        <li>第 2/4/6/8 轮穿插<strong>法规判断题</strong>，答对得一枚清风令，最终清算每枚 +10 分。</li>
        <li>第 4 轮后可<strong>主动交代</strong>；第 5 轮后<strong>中期巡察</strong>强制翻卡，有线索者将被「组织关注」，之后留下线索的概率大增。</li>
        <li>第 9 轮后<strong>最终巡视</strong>：0 条线索平安着陆，1 条减半，2 条及以上清零。</li>
      </ul>
      <p class="home__note">
        腐败壶单次投掷实际留下线索的综合概率约为 <strong class="home__odds">{{ odds }}%</strong>——这是你手里的“赔率表”。
      </p>
    </section>

    <!-- 操作区 -->
    <div class="home__actions anim-slide-up">
      <button v-if="hasSave" class="btn btn--green btn--block" type="button" @click="continueGame">
        继续上局
      </button>
      <button class="btn btn--primary btn--block" type="button" @click="startNew">
        {{ hasSave ? '重新开始' : '开始游戏' }}
      </button>
      <RouterLink to="/learn" class="btn btn--ghost btn--block">党纪党规学习</RouterLink>
    </div>
  </div>
</template>

<style scoped>
.home {
  gap: var(--gap-lg);
}
.home__hero {
  text-align: center;
  padding: var(--gap-xl) 0 var(--gap-md);
}
.home__seal {
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
.home__title {
  font-size: 34px;
  letter-spacing: 0.18em;
  color: var(--color-brown-dark);
}
.home__subtitle {
  margin-top: var(--gap-xs);
  font-size: 13px;
  color: var(--color-ink-soft);
}
.home__quote {
  text-align: center;
  font-family: var(--font-serif);
  font-size: 17px;
  line-height: 1.9;
}
.home__quote strong {
  color: var(--color-red);
}
.home__heading {
  font-size: 18px;
  margin-bottom: var(--gap-sm);
  color: var(--color-brown-dark);
  letter-spacing: 0.08em;
}
.home__list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 14px;
  line-height: 1.7;
}
.home__list li::before {
  content: '·';
  margin-right: 8px;
  color: var(--color-red);
  font-weight: 700;
}
.home__note {
  margin-top: var(--gap-md);
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  background: rgba(184, 134, 63, 0.12);
  font-size: 13px;
  line-height: 1.7;
}
.home__odds {
  color: var(--color-red);
  font-family: var(--font-serif);
  font-size: 16px;
}
.home__actions {
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
}
</style>

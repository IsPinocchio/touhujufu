<script setup>
/**
 * 讲评与排名：清算后的最终呈现
 * - 最终排名（第 1 名「清风标兵」+ 勋章）
 * - 侥幸逃脱者 / 被清零者
 * - 每人一句 30 秒感受
 * - 主持人收尾语
 */
import { computed } from 'vue'
import { PERSONALITY } from '@/data/ai'
import SvgIcon from '@/components/common/SvgIcon.vue'

const props = defineProps({
  report: { type: Object, required: true },
  humanId: { type: String, default: 'human' },
})

const CLOSING =
  '现实里没有侥幸赔率表给你看——现实的概率是：只要你一直伸手，被抓只是时间问题。'

const penaltyLabel = {
  none: '平安着陆',
  light: '党纪轻处分',
  heavy: '重处分',
}

const ranked = computed(() => props.report.ranked || [])
const escaped = computed(() => props.report.escaped || [])
const zeroed = computed(() => props.report.zeroed || [])
const feelings = computed(() => props.report.feelings || [])

function label(p) {
  return penaltyLabel[p.penalty] || '—'
}
</script>

<template>
  <div class="summary">
    <!-- 最终排名 -->
    <section class="summary__section">
      <h3 class="summary__heading">最终排名</h3>
      <ul class="rank-list">
        <li
          v-for="p in ranked"
          :key="p.id"
          class="rank-item"
          :class="{ 'rank-item--me': p.id === humanId, 'rank-item--first': p.rank === 1 }"
        >
          <span class="rank-item__rank">{{ p.rank }}</span>
          <div class="rank-item__info">
            <span class="rank-item__name">
              {{ p.name }}
              <span v-if="p.rank === 1" class="rank-item__medal">
                <SvgIcon name="medal" :size="16" /> 清风标兵
              </span>
            </span>
            <span class="rank-item__label">
              {{ PERSONALITY[p.personality]?.label }}
              <template v-if="p.penalty"> · {{ label(p) }}</template>
            </span>
          </div>
          <span class="rank-item__score">
            {{ p.score }}
            <small v-if="p.breezeTokens > 0" class="rank-item__token">令 ×{{ p.breezeTokens }}</small>
          </span>
        </li>
      </ul>
    </section>

    <!-- 侥幸逃脱者 -->
    <section v-if="escaped.length" class="summary__section">
      <h3 class="summary__heading summary__heading--escape">侥幸逃脱者</h3>
      <p class="summary__desc">线索多但侥幸没被清零的玩家——他们只是运气好，不是真的干净。</p>
      <ul class="tag-list">
        <li v-for="p in escaped" :key="p.id" class="tag-list__item">{{ p.name }}</li>
      </ul>
    </section>

    <!-- 被清零者 -->
    <section v-if="zeroed.length" class="summary__section">
      <h3 class="summary__heading summary__heading--zero">被清零者</h3>
      <p class="summary__desc">线索达 2 条及以上，总分清零，接受重处分。</p>
      <ul class="tag-list">
        <li v-for="p in zeroed" :key="p.id" class="tag-list__item tag-list__item--red">{{ p.name }}</li>
      </ul>
    </section>

    <!-- 每人 30 秒感受 -->
    <section class="summary__section">
      <h3 class="summary__heading">30 秒感受</h3>
      <ul class="feeling-list">
        <li v-for="f in feelings" :key="f.id" class="feeling-item" :class="{ 'feeling-item--me': f.id === humanId }">
          <span class="feeling-item__name">{{ f.name }}</span>
          <p class="feeling-item__text">「{{ f.feeling }}」</p>
        </li>
      </ul>
    </section>

    <!-- 主持人收尾语 -->
    <section class="summary__section summary__closing">
      <p class="summary__closing-text">{{ CLOSING }}</p>
    </section>
  </div>
</template>

<style scoped>
.summary {
  display: flex;
  flex-direction: column;
  gap: var(--gap-lg);
}
.summary__section {
  background: var(--color-cream);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  padding: var(--gap-lg);
}
.summary__heading {
  font-size: 17px;
  letter-spacing: 0.06em;
  margin-bottom: var(--gap-sm);
  color: var(--color-brown-dark);
}
.summary__heading--escape {
  color: var(--color-gold);
}
.summary__heading--zero {
  color: var(--color-red);
}
.summary__desc {
  font-size: 13px;
  color: var(--color-ink-soft);
  margin-bottom: var(--gap-sm);
}

.rank-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.rank-item {
  display: flex;
  align-items: center;
  gap: var(--gap-md);
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  background: rgba(244, 234, 216, 0.6);
}
.rank-item--me {
  border: 1.5px solid var(--color-green);
  background: rgba(63, 92, 74, 0.1);
}
.rank-item--first {
  background: rgba(184, 134, 63, 0.15);
}
.rank-item__rank {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--color-brown-dark);
  color: var(--color-cream);
  font-weight: 700;
  font-family: var(--font-serif);
  flex-shrink: 0;
}
.rank-item__info {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.rank-item__name {
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 6px;
}
.rank-item__medal {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  color: var(--color-gold);
  font-size: 12px;
}
.rank-item__label {
  font-size: 12px;
  color: var(--color-ink-soft);
}
.rank-item__token {
  display: block;
  font-size: 11px;
  color: var(--color-gold);
  font-weight: 700;
}
.rank-item__score {
  font-family: var(--font-serif);
  font-size: 20px;
  font-weight: 700;
}

.tag-list {
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.tag-list__item {
  padding: 4px 12px;
  border-radius: 999px;
  background: rgba(184, 134, 63, 0.2);
  color: var(--color-brown-dark);
  font-size: 13px;
}
.tag-list__item--red {
  background: rgba(158, 43, 37, 0.15);
  color: var(--color-red);
}

.feeling-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.feeling-item {
  padding: 10px 12px;
  border-left: 3px solid var(--color-cream-dark);
}
.feeling-item--me {
  border-left-color: var(--color-green);
}
.feeling-item__name {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-ink-soft);
}
.feeling-item__text {
  font-size: 14px;
  line-height: 1.7;
  margin-top: 2px;
}

.summary__closing {
  background: var(--color-brown-dark);
  text-align: center;
  padding: var(--gap-xl) var(--gap-lg);
}
.summary__closing-text {
  font-family: var(--font-serif);
  font-size: 20px;
  line-height: 1.8;
  color: var(--color-cream);
  font-weight: 700;
  letter-spacing: 0.04em;
}
</style>

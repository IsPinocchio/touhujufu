<script setup>
/**
 * 讲评：清算后的最终呈现
 * - 侥幸逃脱 / 被清零 提示
 * - 一句 30 秒感受
 * - 主持人收尾语
 * - 排行榜占位：与真实玩家的排名由后端服务提供，接入后开放
 */
import SvgIcon from '@/components/common/SvgIcon.vue'

defineProps({
  report: { type: Object, required: true }, // { escaped, zeroed, feeling }
})

const CLOSING =
  '现实里没有侥幸赔率表给你看——现实的概率是：只要你一直伸手，被抓只是时间问题。'
</script>

<template>
  <div class="summary">
    <!-- 排行榜占位（后端接入后开放） -->
    <section class="summary__section summary__board">
      <h3 class="summary__heading">
        <SvgIcon name="rank" :size="18" /> 排行榜
      </h3>
      <p class="summary__desc">与真实玩家的共同排名即将上线，敬请期待。</p>
    </section>

    <!-- 侥幸逃脱 -->
    <section v-if="report.escaped" class="summary__section">
      <h3 class="summary__heading summary__heading--escape">侥幸逃脱</h3>
      <p class="summary__desc">
        你投过腐败 / 擦边壶，却没有留下线索——这只是运气好，不是真的干净。
      </p>
    </section>

    <!-- 被清零 -->
    <section v-if="report.zeroed" class="summary__section">
      <h3 class="summary__heading summary__heading--zero">被清零</h3>
      <p class="summary__desc">线索达 2 条及以上，总分清零，接受重处分。</p>
    </section>

    <!-- 30 秒感受 -->
    <section class="summary__section">
      <h3 class="summary__heading">30 秒感受</h3>
      <div class="feeling-item">
        <span class="feeling-item__name">你</span>
        <p class="feeling-item__text">「{{ report.feeling }}」</p>
      </div>
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
  display: flex;
  align-items: center;
  gap: 6px;
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
}
.summary__board {
  border: 1.5px dashed var(--color-cream-dark);
  background: rgba(244, 234, 216, 0.5);
  box-shadow: none;
}

.feeling-item {
  padding: 10px 12px;
  border-left: 3px solid var(--color-green);
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

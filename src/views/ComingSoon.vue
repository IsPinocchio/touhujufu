<script setup>
/**
 * 预留页占位：党纪党规学习、管理后台等
 * 通过路由 props 传入标题与说明
 */
defineProps({
  title: { type: String, default: '即将上线' },
  desc: { type: String, default: '该模块正在建设中。' },
})
</script>

<template>
  <div class="page">
    <div class="coming-soon card anim-slide-up">
      <h1 class="coming-soon__title">{{ title }}</h1>
      <p class="coming-soon__desc">{{ desc }}</p>
      <RouterLink to="/" class="btn btn--ghost">返回首页</RouterLink>
    </div>
  </div>
</template>

<style scoped>
.coming-soon {
  margin-top: 40px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--gap-md);
}
.coming-soon__title {
  font-size: 24px;
  letter-spacing: 0.1em;
}
.coming-soon__desc {
  color: var(--color-ink-soft);
  line-height: 1.8;
}
</style>

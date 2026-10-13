<script setup>
/**
 * 登录 / 注册页
 * - 登录成功后跳转 redirect 参数（默认游戏封面 /game）
 * - 切换到注册模式：需填写姓名、部门
 */
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const mode = ref('login') // login | register
const username = ref('')
const password = ref('')
const displayName = ref('')
const department = ref('')
const loading = ref(false)
const errorMsg = ref('')

function switchMode() {
  mode.value = mode.value === 'login' ? 'register' : 'login'
  errorMsg.value = ''
}

async function submit() {
  if (loading.value) return
  errorMsg.value = ''
  if (!username.value.trim() || !password.value) {
    errorMsg.value = '请填写账号和密码'
    return
  }
  loading.value = true
  try {
    if (mode.value === 'register') {
      if (!displayName.value.trim()) {
        errorMsg.value = '请填写姓名'
        return
      }
      await auth.register({
        username: username.value.trim(),
        password: password.value,
        displayName: displayName.value.trim(),
        department: department.value.trim(),
      })
      // 注册成功后直接登录
    }
    await auth.login(username.value.trim(), password.value)
    router.push(route.query.redirect || '/')
  } catch (e) {
    errorMsg.value = e.message || '操作失败，请稍后重试'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="page login-page">
    <header class="login-page__hero anim-slide-down">
      <div class="login-page__seal">廉</div>
      <h1 class="login-page__title">廉动星球</h1>
      <p class="login-page__subtitle">廉洁文化教育平台 · 登录后成绩计入真实排名</p>
    </header>

    <form class="login-page__form card anim-slide-up" @submit.prevent="submit">
      <label class="login-page__field">
        <span class="login-page__label">账号</span>
        <input v-model="username" class="login-page__input" type="text" placeholder="请输入账号" autocomplete="username" />
      </label>

      <template v-if="mode === 'register'">
        <label class="login-page__field">
          <span class="login-page__label">姓名</span>
          <input v-model="displayName" class="login-page__input" type="text" placeholder="真实姓名（排行榜显示）" autocomplete="name" />
        </label>
        <label class="login-page__field">
          <span class="login-page__label">部门</span>
          <input v-model="department" class="login-page__input" type="text" placeholder="所在部门（选填）" />
        </label>
      </template>

      <label class="login-page__field">
        <span class="login-page__label">密码</span>
        <input v-model="password" class="login-page__input" type="password" placeholder="请输入密码" :autocomplete="mode === 'login' ? 'current-password' : 'new-password'" />
      </label>

      <p v-if="errorMsg" class="login-page__error">{{ errorMsg }}</p>

      <button class="btn btn--primary btn--block" type="submit" :disabled="loading">
        {{ loading ? '请稍候…' : mode === 'login' ? '登录' : '注册并登录' }}
      </button>

      <button class="login-page__switch" type="button" @click="switchMode">
        {{ mode === 'login' ? '还没有账号？点此注册' : '已有账号？返回登录' }}
      </button>
    </form>

    <RouterLink to="/" class="login-page__back">返回星球首页</RouterLink>
  </div>
</template>

<style scoped>
.login-page {
  gap: var(--gap-lg);
}
.login-page__hero {
  text-align: center;
  padding: var(--gap-xl) 0 var(--gap-sm);
}
.login-page__seal {
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
.login-page__title {
  font-size: 30px;
  letter-spacing: 0.18em;
  color: var(--color-brown-dark);
}
.login-page__subtitle {
  margin-top: var(--gap-xs);
  font-size: 13px;
  color: var(--color-ink-soft);
}
.login-page__form {
  display: flex;
  flex-direction: column;
  gap: var(--gap-md);
  padding: var(--gap-lg);
}
.login-page__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.login-page__label {
  font-size: 13px;
  color: var(--color-ink-soft);
}
.login-page__input {
  padding: 12px 14px;
  border: 1px solid rgba(95, 74, 53, 0.25);
  border-radius: var(--radius-sm);
  background: var(--color-cream);
  font-size: 15px;
  color: var(--color-brown-dark);
  outline: none;
  transition: border-color 0.2s;
}
.login-page__input:focus {
  border-color: var(--color-green);
}
.login-page__error {
  font-size: 13px;
  color: var(--color-red);
}
.login-page__switch {
  background: none;
  border: none;
  padding: 4px;
  font-size: 13px;
  color: var(--color-green);
  cursor: pointer;
}
.login-page__back {
  text-align: center;
  font-size: 13px;
  color: var(--color-ink-soft);
}
</style>

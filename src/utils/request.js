// 后端接口封装：统一处理 token、错误码与返回格式
// 后端约定：{ code: 0, message, data }，code === 0 为成功
//
// 错误提示策略：
// - 网络不通 / 服务器 5xx / 业务 code != 0 → 全局 toast 弹窗提示（玩家无需看控制台）
// - 401（登录态失效）→ 清 token + toast + 跳回登录页
// - 登录/注册接口例外：错误由登录页表单内联展示，不走全局弹窗与跳转

import { useToastStore } from '@/stores/toast'

const TOKEN_KEY = 'touhu_token'

// 登录态失效时的跳转钩子，由 main.js 注入（request.js 不能直接 import router，会循环依赖）
let onUnauthorized = null
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn
}

// 这些路径的错误交给登录页内联提示
const AUTH_PATHS = ['/auth/login', '/auth/register']

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_KEY)
  }
}

export class ApiError extends Error {
  constructor(code, message) {
    super(message)
    this.code = code
  }
}

function toastError(message) {
  try {
    useToastStore().show(message)
  } catch {
    // pinia 尚未激活（极早期调用）时静默降级到控制台
    console.warn('[廉动星球]', message)
  }
}

// 接口前缀优先级：.env 的 VITE_API_BASE > 页面 base 路径
// - 开发环境：两者都未设置 → ''（/api 走 vite proxy 到 localhost:8080）
// - 线上：.env.production 设为 https://maas-dev.chinasatnet.com.cn:8089/ldxq_backend
//   接口与页面不同源（端口不同），由后端 CORS 放行
const API_PREFIX = import.meta.env.VITE_API_BASE ?? import.meta.env.BASE_URL.replace(/\/$/, '')

export async function request(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  let res
  try {
    res = await fetch(`${API_PREFIX}/api${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    // 网络层失败：断网、服务器宕机、跨域被拦等
    const err = new ApiError(0, '无法连接服务器，请检查网络后重试')
    toastError(err.message)
    throw err
  }

  const isAuthApi = AUTH_PATHS.includes(path)

  if (res.status === 401 && !isAuthApi) {
    // token 失效：清掉并跳回登录页
    setToken(null)
    toastError('登录已过期，请重新登录')
    onUnauthorized?.()
    throw new ApiError(401, '登录已过期，请重新登录')
  }

  const json = await res.json().catch(() => null)
  if (!json) {
    // 非 JSON 响应：服务器崩溃或网关错误页
    const err = new ApiError(res.status, `服务器开小差了（${res.status}），请稍后再试`)
    toastError(err.message)
    throw err
  }
  if (json.code !== 0) {
    const err = new ApiError(json.code, json.message || '操作失败，请稍后重试')
    if (json.code === 401 && !isAuthApi) {
      // 业务码 401（如 /auth/me 判定登录失效）：与 HTTP 401 同样处理
      setToken(null)
      toastError('登录已过期，请重新登录')
      onUnauthorized?.()
    } else if (!isAuthApi) {
      toastError(err.message)
    }
    throw err
  }
  return json.data
}

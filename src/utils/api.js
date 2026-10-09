// 后端接口封装：统一处理 token、错误码与返回格式
// 后端约定：{ code: 0, message, data }，code === 0 为成功

const TOKEN_KEY = 'touhu_token'

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

async function request(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (res.status === 401) {
    // token 失效：清掉并抛错，由调用方（路由守卫/store）决定跳转登录页
    setToken(null)
    throw new ApiError(401, '登录已过期，请重新登录')
  }
  const json = await res.json().catch(() => null)
  if (!json) {
    throw new ApiError(res.status, `服务器响应异常（${res.status}）`)
  }
  if (json.code !== 0) {
    throw new ApiError(json.code, json.message || '请求失败')
  }
  return json.data
}

export const api = {
  // 认证
  login: (username, password) => request('/auth/login', { method: 'POST', body: { username, password } }),
  register: (data) => request('/auth/register', { method: 'POST', body: data }),
  me: () => request('/auth/me'),

  // 游戏
  startSession: () => request('/game/sessions', { method: 'POST' }),
  currentSession: () => request('/game/sessions/current'),
  reportThrow: (sessionId, data) => request(`/game/sessions/${sessionId}/throws`, { method: 'POST', body: data }),
  reportQuiz: (sessionId, data) => request(`/game/sessions/${sessionId}/quiz`, { method: 'POST', body: data }),
  reportCardView: (sessionId, data) => request(`/game/sessions/${sessionId}/card-views`, { method: 'POST', body: data }),
  confess: (sessionId) => request(`/game/sessions/${sessionId}/confess`, { method: 'POST' }),
  finishSession: (sessionId) => request(`/game/sessions/${sessionId}/finish`, { method: 'POST' }),
  abandonSession: (sessionId) => request(`/game/sessions/${sessionId}/abandon`, { method: 'POST' }),
  myHistory: () => request('/game/my/history'),

  // 排行榜
  leaderboard: (limit = 50) => request(`/leaderboard?limit=${limit}`),
}

import { request } from './request'

export const authApi = {
  login: (username, password) => request('/auth/login', { method: 'POST', body: { username, password } }),
  register: (data) => request('/auth/register', { method: 'POST', body: data }),
  me: () => request('/auth/me'),
}

import { request } from '../request'

export const touhuApi = {
  startSession: () => request('/game/sessions', { method: 'POST' }),
  currentSession: () => request('/game/sessions/current'),
  reportThrow: (sessionId, data) => request(`/game/sessions/${sessionId}/throws`, { method: 'POST', body: data }),
  reportQuiz: (sessionId, data) => request(`/game/sessions/${sessionId}/quiz`, { method: 'POST', body: data }),
  reportCardView: (sessionId, data) => request(`/game/sessions/${sessionId}/card-views`, { method: 'POST', body: data }),
  confess: (sessionId) => request(`/game/sessions/${sessionId}/confess`, { method: 'POST' }),
  finishSession: (sessionId) => request(`/game/sessions/${sessionId}/finish`, { method: 'POST' }),
  abandonSession: (sessionId) => request(`/game/sessions/${sessionId}/abandon`, { method: 'POST' }),
  myHistory: () => request('/game/my/history'),
  leaderboard: (limit = 50) => request(`/leaderboard?limit=${limit}`),
}

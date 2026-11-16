// E2E：开局(校验题目下发) → 打3轮(轮1答错/轮2答对投壶+答题/轮3答对未中) → sessions/current 续玩校验 → 打满9轮 → finish → 排行榜字段
const BASE = 'http://localhost:8080'

async function req(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json()
  if (json.code !== 0) throw new Error(`${path} -> ${json.code} ${json.message}`)
  return json.data
}

const assert = (cond, msg) => { if (!cond) throw new Error('断言失败: ' + msg); console.log('  ✓', msg) }

const token = (await req('/api/auth/login', { method: 'POST', body: { username: 'sunqi', password: '123456' } })).token

// 清理旧对局
const cur0 = await req('/api/game/sessions/current', { token }).catch(() => null)
if (cur0?.sessionId) await req(`/api/game/sessions/${cur0.sessionId}/abandon`, { method: 'POST', token })

// 1. 开局：校验题目下发
const s = await req('/api/game/sessions', { method: 'POST', token })
assert(s.sessionId > 0, '开局返回 sessionId')
const plan = s.questionPlan
assert(plan && Array.isArray(plan.scenes) && plan.scenes.length === 9, '下发 9 道场景题')
assert(plan.quizzes && ['2', '4', '6', '8'].every((k) => plan.quizzes[k]), '下发 4 道判断题(轮2/4/6/8)')
const sceneIds = new Set(plan.scenes.map((x) => x.id))
assert(sceneIds.size === 9, '9 道场景题互不重复')
assert(plan.scenes.every((sc) => sc.options.filter((o) => o.correct).length === 1), '每题恰有一个正确选项')
assert(s.rules?.potScores?.EASY === 10 && s.rules?.potScores?.HARD === 20, '规则快照含壶分 10/15/20')
assert(s.rules?.missScore === 5, '规则快照含未中保底 5 分')

const correctOf = (scene) => scene.options.find((o) => o.correct)
const wrongOf = (scene) => scene.options.find((o) => !o.correct)

// 2. 打 3 轮：轮1 答错(0分)；轮2 答对+投中 HARD(20分)+答题；轮3 答对+未中(保底5分)
async function playRound(round, { wrong = false, inZone = true } = {}) {
  const scene = plan.scenes[round - 1]
  const opt = wrong ? wrongOf(scene) : correctOf(scene)
  const body = { roundNo: round, sceneId: scene.id, optionKey: opt.key }
  if (!wrong) {
    body.potType = 'HARD'
    body.pointerPos = 0.5
    body.inZone = inZone
  }
  await req(`/api/game/sessions/${s.sessionId}/throws`, { method: 'POST', token, body })
  const quiz = plan.quizzes[String(round)]
  if (quiz) {
    await req(`/api/game/sessions/${s.sessionId}/quiz`, {
      method: 'POST', token,
      body: { roundNo: round, quizId: quiz.id, correct: true },
    })
  }
}
await playRound(1, { wrong: true })
await playRound(2)
await playRound(3, { inZone: false })
console.log('  ✓ 已打 3 轮（答错/投中/未中三路径）')

// 3. 续玩校验
const st = await req('/api/game/sessions/current', { token })
assert(st.sessionId === s.sessionId, 'current 返回同一会话')
assert(st.currentRound === 4, 'currentRound=4')
assert(st.throws.length === 3, 'throws 3 条')
assert(st.throws[0].optionCorrect === false && st.throws[0].scoreGained === 0, '轮1 答错 0 分')
assert(st.throws[0].potType == null, '轮1 答错无投壶字段')
assert(st.throws[1].optionCorrect === true && st.throws[1].scoreGained === 20, '轮2 投中难壶 20 分')
assert(st.throws[2].scoreGained === 5 && st.throws[2].hit === false, '轮3 未中保底 5 分')
assert(st.quizzes.length === 1 && st.quizzes[0].roundNo === 2, 'quizzes 1 条(轮2)')
assert(JSON.stringify(st.questionPlan.scenes.map((x) => x.id)) === JSON.stringify(plan.scenes.map((x) => x.id)), '续玩题目与开局一致')

// 4. 打满剩余轮（全部答对+投中 MID=15）
for (let r = 4; r <= 9; r++) {
  const scene = plan.scenes[r - 1]
  const opt = correctOf(scene)
  await req(`/api/game/sessions/${s.sessionId}/throws`, {
    method: 'POST', token,
    body: { roundNo: r, sceneId: scene.id, optionKey: opt.key, potType: 'MID', pointerPos: 0.5, inZone: true },
  })
  const quiz = plan.quizzes[String(r)]
  if (quiz) {
    await req(`/api/game/sessions/${s.sessionId}/quiz`, {
      method: 'POST', token,
      body: { roundNo: r, quizId: quiz.id, correct: true },
    })
  }
}
console.log('  ✓ 已打满 9 轮')

// 5. 结算：0 + 20 + 5 + 6×15 + 清风令4×10 = 155
const fin = await req(`/api/game/sessions/${s.sessionId}/finish`, { method: 'POST', token })
assert(fin.finalScore === 155, `结算 finalScore=${fin.finalScore}（预期 155）`)
assert(fin.breezeTokens === 4, `清风令=${fin.breezeTokens}（预期 4）`)

// 6. 排行榜字段
const me0 = await req('/api/auth/me', { token })
const board = await req('/api/leaderboard?limit=50', { token })
const me = board.find((e) => e.userId === me0.id)
assert(me, `排行榜含本人(${me0.displayName})`)
assert(typeof me.gamesThisWeek === 'number' && me.gamesThisWeek >= 1, `gamesThisWeek=${me.gamesThisWeek}`)
assert(typeof me.bestScore === 'number', `bestScore=${me.bestScore}`)

// 7. 历史战绩
const hist = await req('/api/game/my/history', { token })
const last = hist.find((h) => h.sessionId === s.sessionId)
assert(last, '战绩包含本局')
assert(last.finalScore === fin.finalScore, '战绩分数与结算一致')

console.log('\n全部断言通过 ✅')

// 一次性脚本：读取前端题目数据，生成 server 端的种子 SQL
// 用法：node scripts/gen-seed-questions.mjs
import { pathToFileURL } from 'node:url'
import { writeFileSync } from 'node:fs'

const esc = (s) =>
  s == null ? 'NULL' : "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "''") + "'"

const { scenes } = await import(pathToFileURL('src/data/scenes.js').href)
const { quizQuestions } = await import(pathToFileURL('src/data/quiz.js').href)

const lines = []
lines.push('-- 题目种子数据：由 src/data/scenes.js 与 src/data/quiz.js 通过 scripts/gen-seed-questions.mjs 生成')
lines.push('-- INSERT IGNORE 幂等，可随服务启动重复执行；改题后重新生成本文件')
lines.push('')
lines.push(
  'INSERT IGNORE INTO scene_questions (id, category, difficulty, scene_text, options_json, hint, source, enabled) VALUES'
)
lines.push(
  scenes
    .map(
      (s) =>
        '(' +
        [
          esc(s.id),
          esc(s.category),
          s.difficulty,
          esc(s.scene),
          esc(JSON.stringify(s.options)),
          esc(s.hint),
          esc(s.source),
          1,
        ].join(', ') +
        ')'
    )
    .join(',\n') + ';'
)
lines.push('')
lines.push(
  'INSERT IGNORE INTO quiz_questions (id, category, difficulty, scene, compliant, answer_note, `explain`, basis, enabled) VALUES'
)
lines.push(
  quizQuestions
    .map(
      (q) =>
        '(' +
        [
          esc(q.id),
          esc(q.category),
          q.difficulty,
          esc(q.scene),
          q.compliant ? 1 : 0,
          esc(q.answerNote),
          esc(q.explain),
          esc(q.basis),
          1,
        ].join(', ') +
        ')'
    )
    .join(',\n') + ';'
)

writeFileSync('server/src/main/resources/db/seed_questions.sql', lines.join('\n') + '\n', 'utf8')
console.log(`scenes: ${scenes.length}, quizzes: ${quizQuestions.length}`)

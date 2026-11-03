// 一次性脚本：读取前端题目数据，生成 server 端的种子 SQL
// 用法：node scripts/gen-seed-questions.mjs
import { pathToFileURL } from 'node:url'
import { writeFileSync } from 'node:fs'

const esc = (s) =>
  s == null ? 'NULL' : "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "''") + "'"

const { scenes } = await import(pathToFileURL('src/data/touhu/scenes.js').href)
const { quizQuestions } = await import(pathToFileURL('src/data/touhu/quiz.js').href)

const lines = []
lines.push('-- 题目种子数据：由 src/data/touhu/scenes.js 与 src/data/touhu/quiz.js 通过 scripts/gen-seed-questions.mjs 生成')
lines.push('-- ON DUPLICATE KEY UPDATE 保证改题后重新生成本文件即可同步更新存量数据（enabled 开关除外，保留后台手动下线状态）')
lines.push('')
lines.push(
  'INSERT INTO scene_questions (id, category, difficulty, scene_text, options_json, hint, source, enabled) VALUES'
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
    .join(',\n') +
    ' AS new ON DUPLICATE KEY UPDATE category = new.category, difficulty = new.difficulty, scene_text = new.scene_text, options_json = new.options_json, hint = new.hint, source = new.source;'
)
lines.push('')
lines.push(
  'INSERT INTO quiz_questions (id, category, difficulty, scene, qtype, compliant, answer_note, explain_text, basis, enabled) VALUES'
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
          esc(q.qtype ?? 'scenario'),
          q.compliant ? 1 : 0,
          esc(q.answerNote),
          esc(q.explain),
          esc(q.basis),
          1,
        ].join(', ') +
        ')'
    )
    .join(',\n') +
    ' AS new ON DUPLICATE KEY UPDATE category = new.category, difficulty = new.difficulty, scene = new.scene, qtype = new.qtype, compliant = new.compliant, answer_note = new.answer_note, explain_text = new.explain_text, basis = new.basis;'
)

writeFileSync('server/src/main/resources/db/seed_questions.sql', lines.join('\n') + '\n', 'utf8')
console.log(`scenes: ${scenes.length}, quizzes: ${quizQuestions.length}`)

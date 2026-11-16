/**
 * 廉洁展馆 · 画框贴图生成器
 * 用 Canvas 离屏绘制展板贴图，避免外部图片依赖；
 * panel.image 为预留图片位：后续填入图片地址后自动替换占位画面。
 *
 * 展板风格由 room.theme 决定：
 * - parchment（勤廉厅）：米白宣纸底 + 描金边框
 * - crimson（警示厅）：暗红底 + 金字金边（参考警示教育展馆红色展墙）
 */
import * as THREE from 'three'

let maxAnisotropy = 4

/** 由渲染器能力初始化贴图各项异性上限（在创建贴图前调用一次） */
export function initTextureQuality(renderer) {
  maxAnisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 4)
}

const THEMES = {
  parchment: {
    bg: ['#faf4e6', '#eee0c5'],
    border: '#b8863f',
    corner: 'rgba(184, 134, 63, 0.75)',
    ribbonText: '#f4ead8',
    sealText: '#f4ead8',
    title: '#4a2c1f',
    body: '#57473a',
    quoteText: '#4a2c1f',
    quoteFrom: '#8a7156',
    quoteBox: 'rgba(184, 134, 63, 0.12)',
    quoteBorder: 'rgba(184, 134, 63, 0.5)',
    footerLine: 'rgba(122, 74, 43, 0.35)',
  },
  crimson: {
    bg: ['#8e2620', '#6e1a15'],
    border: '#d5b675',
    corner: 'rgba(213, 182, 117, 0.8)',
    ribbonBg: '#d5b675',
    ribbonText: '#6e1a15',
    sealBg: '#f4ead8',
    title: '#f4ead8',
    body: '#e8d9b8',
    quoteText: '#f4ead8',
    quoteFrom: '#d5b675',
    quoteBox: 'rgba(213, 182, 117, 0.15)',
    quoteBorder: 'rgba(213, 182, 117, 0.55)',
    footerLine: 'rgba(213, 182, 117, 0.45)',
  },
}

function themeOf(room) {
  return THEMES[room.theme] || THEMES.parchment
}

/** 确定性伪随机（由展板 id 播种，保证每次生成撕裂边缘一致） */
function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function seedOf(text) {
  let h = 2166136261
  for (const ch of String(text)) {
    h ^= ch.codePointAt(0)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function makeTexture(canvas) {
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = maxAnisotropy
  return texture
}

function wrappedLines(ctx, text, maxWidth, maxLines) {
  const lines = []
  let line = ''
  for (const char of Array.from(text)) {
    const next = line + char
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line)
      line = char
    } else {
      line = next
    }
  }
  if (line) lines.push(line)
  if (lines.length > maxLines) {
    const visible = lines.slice(0, maxLines)
    visible[maxLines - 1] = `${visible[maxLines - 1].slice(0, -1)}…`
    return visible
  }
  return lines
}

function drawLines(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
  const lines = wrappedLines(ctx, text, maxWidth, maxLines)
  lines.forEach((line, index) => {
    ctx.fillText(line, x, y + index * lineHeight)
  })
  return lines.length
}

/** 展板底版：渐变底 + 双层描边 + 回纹角饰 */
function paintPanelBase(ctx, w, h, theme) {
  const gradient = ctx.createLinearGradient(0, 0, 0, h)
  gradient.addColorStop(0, theme.bg[0])
  gradient.addColorStop(1, theme.bg[1])
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, w, h)
  const inset = Math.max(10, Math.round(w * 0.018))
  ctx.strokeStyle = theme.border
  ctx.lineWidth = Math.max(4, Math.round(w * 0.007))
  ctx.strokeRect(inset, inset, w - inset * 2, h - inset * 2)
  ctx.lineWidth = Math.max(1.5, Math.round(w * 0.002))
  ctx.strokeRect(inset * 1.8, inset * 1.8, w - inset * 3.6, h - inset * 3.6)
  // 四角回纹装饰（内框四角的小 L 角花）
  const c = inset * 1.8
  const arm = Math.round(w * 0.035)
  ctx.strokeStyle = theme.corner
  ctx.lineWidth = Math.max(2, Math.round(w * 0.003))
  for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    const ox = sx > 0 ? c : w - c
    const oy = sy > 0 ? c : h - c
    const gap = Math.round(arm * 0.45)
    ctx.beginPath()
    ctx.moveTo(ox + sx * gap, oy + sy * (gap + arm))
    ctx.lineTo(ox + sx * gap, oy + sy * gap)
    ctx.lineTo(ox + sx * (gap + arm), oy + sy * gap)
    ctx.stroke()
  }
}

/** 分类缎带（左上） + 展厅印章（右上） */
function paintHeader(ctx, w, panel, room, theme) {
  const ribbonH = Math.round(w * 0.062)
  const ribbonW = Math.round(w * 0.26)
  const pad = Math.round(w * 0.055)
  ctx.fillStyle = theme.ribbonBg || room.accent
  ctx.fillRect(pad, pad, ribbonW, ribbonH)
  ctx.fillStyle = theme.ribbonText
  ctx.font = `${Math.round(ribbonH * 0.46)}px "Microsoft YaHei", sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(panel.category, pad + ribbonW / 2, pad + ribbonH / 2)

  const sealSize = Math.round(w * 0.085)
  ctx.fillStyle = theme.sealBg || room.accent
  ctx.fillRect(w - pad - sealSize, pad, sealSize, sealSize)
  ctx.fillStyle = theme.sealText || room.accent
  ctx.font = `700 ${Math.round(sealSize * 0.56)}px "SimSun", serif`
  ctx.fillText(room.seal, w - pad - sealSize / 2, pad + sealSize / 2)
}

/** 图片占位画面：水墨渐变 + 展厅印章字 + 「影像资料」标注（预留图片位） */
function paintImageSlot(ctx, rect, room) {
  const { x, y, w, h } = rect
  const gradient = ctx.createLinearGradient(x, y, x + w, y + h)
  gradient.addColorStop(0, '#d8cbae')
  gradient.addColorStop(1, '#c3b091')
  ctx.fillStyle = gradient
  ctx.fillRect(x, y, w, h)
  // 远山剪影
  ctx.fillStyle = 'rgba(93, 61, 41, 0.18)'
  ctx.beginPath()
  ctx.moveTo(x, y + h * 0.72)
  ctx.bezierCurveTo(x + w * 0.25, y + h * 0.5, x + w * 0.4, y + h * 0.78, x + w * 0.62, y + h * 0.55)
  ctx.bezierCurveTo(x + w * 0.78, y + h * 0.4, x + w * 0.9, y + h * 0.62, x + w, y + h * 0.52)
  ctx.lineTo(x + w, y + h)
  ctx.lineTo(x, y + h)
  ctx.closePath()
  ctx.fill()
  // 中央印章字
  const sealSize = Math.min(w, h) * 0.3
  ctx.fillStyle = room.accent
  ctx.globalAlpha = 0.85
  ctx.fillRect(x + w / 2 - sealSize / 2, y + h * 0.34 - sealSize / 2, sealSize, sealSize)
  ctx.globalAlpha = 1
  ctx.fillStyle = '#f4ead8'
  ctx.font = `700 ${Math.round(sealSize * 0.52)}px "SimSun", serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(room.seal, x + w / 2, y + h * 0.34)
  ctx.fillStyle = 'rgba(74, 44, 31, 0.66)'
  ctx.font = `${Math.round(Math.min(w, h) * 0.075)}px "Microsoft YaHei", sans-serif`
  ctx.fillText('影像资料 · 待补充', x + w / 2, y + h * 0.72)
  ctx.strokeStyle = 'rgba(184, 134, 63, 0.8)'
  ctx.lineWidth = Math.max(2, Math.round(w * 0.006))
  ctx.strokeRect(x, y, w, h)
}

/** 预留图片位：有 image 时异步加载并完整显示（contain 不裁切），无图时画占位框 */
function attachImage(texture, ctx, rect, panel, room) {
  if (!panel.image) {
    paintImageSlot(ctx, rect, room)
    return
  }
  // 宣纸底衬，contain 留白时不露占位文字
  ctx.fillStyle = '#efe6d2'
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h)
  ctx.strokeStyle = 'rgba(184, 134, 63, 0.8)'
  ctx.lineWidth = Math.max(2, Math.round(rect.w * 0.006))
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h)
  const img = new Image()
  img.onload = () => {
    // contain：完整显示人物，不裁切
    const scale = Math.min(rect.w / img.width, rect.h / img.height)
    const dw = img.width * scale
    const dh = img.height * scale
    ctx.drawImage(img, rect.x + (rect.w - dw) / 2, rect.y + (rect.h - dh) / 2, dw, dh)
    texture.needsUpdate = true
  }
  img.src = panel.image
}

/** 文字展板：标题 + （可选名言）/ 摘要 */
function paintTextPanel(ctx, w, h, panel, room, theme) {
  paintPanelBase(ctx, w, h, theme)
  paintHeader(ctx, w, panel, room, theme)
  const pad = Math.round(w * 0.055)
  ctx.textAlign = 'left'
  ctx.fillStyle = theme.title
  ctx.font = `700 ${Math.round(w * 0.06)}px "Noto Serif SC", "SimSun", serif`
  const titleY = Math.round(h * 0.28)
  drawLines(ctx, panel.title, pad, titleY, w - pad * 2, Math.round(w * 0.075), 2)

  if (panel.quote) {
    // 名言区块：描边底纹 + 居中大字 + 出处
    const quoteY = Math.round(h * 0.48)
    const quoteH = Math.round(h * 0.28)
    ctx.fillStyle = theme.quoteBox
    ctx.fillRect(pad, quoteY, w - pad * 2, quoteH)
    ctx.strokeStyle = theme.quoteBorder
    ctx.lineWidth = 2
    ctx.strokeRect(pad, quoteY, w - pad * 2, quoteH)
    ctx.fillStyle = theme.quoteText
    ctx.font = `700 ${Math.round(h * 0.075)}px "Noto Serif SC", "SimSun", serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    drawLines(ctx, panel.quote.text, w / 2, quoteY + quoteH * 0.38, w - pad * 4, Math.round(h * 0.095), 2)
    ctx.fillStyle = theme.quoteFrom
    ctx.font = `${Math.round(h * 0.04)}px "Noto Serif SC", "SimSun", serif`
    ctx.fillText(`—— ${panel.quote.from}`, w / 2, quoteY + quoteH * 0.82)
  } else {
    ctx.fillStyle = theme.body
    ctx.font = `${Math.round(w * 0.038)}px "Microsoft YaHei", sans-serif`
    drawLines(ctx, panel.summary, pad, Math.round(h * 0.5), w - pad * 2, Math.round(h * 0.075), 3)
  }
}

/** 图文展板：上部图片区 + 下部标题摘要 */
function paintMixedPanel(ctx, w, h, panel, room, theme, index, texture) {
  paintPanelBase(ctx, w, h, theme)
  const pad = Math.round(w * 0.045)
  const imgH = Math.round(h * 0.52)
  attachImage(texture, ctx, { x: pad, y: pad, w: w - pad * 2, h: imgH }, panel, room)

  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = theme.title
  ctx.font = `700 ${Math.round(w * 0.055)}px "Noto Serif SC", "SimSun", serif`
  drawLines(ctx, panel.title, pad, Math.round(h * 0.68), w - pad * 2, Math.round(w * 0.068), 1)
  ctx.fillStyle = theme.body
  ctx.font = `${Math.round(w * 0.034)}px "Microsoft YaHei", sans-serif`
  drawLines(ctx, panel.summary, pad, Math.round(h * 0.78), w - pad * 2, Math.round(h * 0.062), 2)
}

/** 图文并排展板：一侧整图（按原比例完整显示）+ 一侧姓名、名言与摘要；imageSide 可切换左右 */
function paintSidePanel(ctx, w, h, panel, room, theme, index, texture) {
  paintPanelBase(ctx, w, h, theme)
  const pad = Math.round(w * 0.04)
  const colW = Math.round(w * 0.46)
  const flip = panel.imageSide === 'right'
  attachImage(texture, ctx, { x: flip ? w - pad - colW : pad, y: pad, w: colW, h: h - pad * 2 }, panel, room)

  const tx = flip ? pad : pad * 2 + colW
  const tw = w - colW - pad * 3
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  const [name, sub] = panel.title.split('·').map((s) => s.trim())
  ctx.fillStyle = theme.title
  ctx.font = `700 ${Math.round(h * 0.1)}px "Noto Serif SC", "SimSun", serif`
  ctx.fillText(name, tx, Math.round(h * 0.17))
  if (sub) {
    ctx.font = `${Math.round(h * 0.05)}px "Noto Serif SC", "SimSun", serif`
    ctx.fillText(sub, tx, Math.round(h * 0.26))
  }
  ctx.strokeStyle = theme.footerLine
  ctx.lineWidth = Math.max(1.5, Math.round(w * 0.002))
  ctx.beginPath()
  ctx.moveTo(tx, Math.round(h * 0.33))
  ctx.lineTo(tx + tw, Math.round(h * 0.33))
  ctx.stroke()

  let bodyY = Math.round(h * 0.44)
  if (panel.quote) {
    ctx.fillStyle = theme.quoteText
    ctx.font = `700 ${Math.round(h * 0.048)}px "Noto Serif SC", "SimSun", serif`
    const lineH = Math.round(h * 0.075)
    const lines = wrappedLines(ctx, `「${panel.quote.text}」`, tw, 3)
    lines.forEach((line, i) => ctx.fillText(line, tx, bodyY + i * lineH))
    bodyY += lines.length * lineH + Math.round(h * 0.04)
  }
  ctx.fillStyle = theme.body
  ctx.font = `${Math.round(h * 0.042)}px "Microsoft YaHei", sans-serif`
  drawLines(ctx, panel.summary, tx, bodyY, tw, Math.round(h * 0.065), 4)
}

/** 图片展板：整幅图片区 + 底部标题条 */
function paintImagePanel(ctx, w, h, panel, room, theme, index, texture) {
  paintPanelBase(ctx, w, h, theme)
  const pad = Math.round(w * 0.045)
  const stripH = Math.round(h * 0.16)
  attachImage(texture, ctx, { x: pad, y: pad, w: w - pad * 2, h: h - pad * 2 - stripH }, panel, room)
  const stripY = h - pad - stripH
  ctx.fillStyle = theme.ribbonBg || room.accent
  ctx.fillRect(pad, stripY, w - pad * 2, stripH)
  ctx.fillStyle = theme.ribbonText
  ctx.font = `700 ${Math.round(stripH * 0.42)}px "Noto Serif SC", "SimSun", serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(panel.title, w / 2, stripY + stripH / 2)
}

/** 水墨山水（卷轴展板右侧插画）：远山层叠 + 孤松 + 飞鸟 + 红印章 */
function paintInkLandscape(ctx, rect) {
  const { x, y, w, h } = rect
  const layers = [
    ['rgba(90, 90, 90, 0.22)', 0.5],
    ['rgba(70, 70, 70, 0.38)', 0.64],
    ['rgba(50, 50, 50, 0.55)', 0.78],
  ]
  for (const [color, base] of layers) {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.moveTo(x, y + h)
    ctx.lineTo(x, y + h * base)
    ctx.bezierCurveTo(x + w * 0.2, y + h * (base - 0.35), x + w * 0.35, y + h * (base + 0.1), x + w * 0.55, y + h * (base - 0.25))
    ctx.bezierCurveTo(x + w * 0.7, y + h * (base - 0.45), x + w * 0.85, y + h * base, x + w, y + h * (base - 0.3))
    ctx.lineTo(x + w, y + h)
    ctx.closePath()
    ctx.fill()
  }
  // 孤松
  const px = x + w * 0.16
  const py = y + h * 0.95
  ctx.strokeStyle = 'rgba(47, 32, 22, 0.85)'
  ctx.lineCap = 'round'
  ctx.lineWidth = 7
  ctx.beginPath()
  ctx.moveTo(px, py)
  ctx.quadraticCurveTo(px + 12, py - h * 0.28, px + 6, py - h * 0.5)
  ctx.stroke()
  ctx.fillStyle = 'rgba(63, 92, 74, 0.8)'
  for (const [ox, oy, rw] of [[-6, -h * 0.52, 52], [10, -h * 0.42, 44], [-2, -h * 0.32, 36]]) {
    ctx.beginPath()
    ctx.ellipse(px + ox, py + oy, rw, 13, -0.12, 0, Math.PI * 2)
    ctx.fill()
  }
  // 飞鸟
  ctx.strokeStyle = 'rgba(47, 32, 22, 0.6)'
  ctx.lineWidth = 3
  for (const [bx, by] of [[x + w * 0.68, y + h * 0.18], [x + w * 0.78, y + h * 0.26]]) {
    ctx.beginPath()
    ctx.arc(bx - 9, by, 9, Math.PI * 1.1, Math.PI * 1.9)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(bx + 9, by, 9, Math.PI * 1.1, Math.PI * 1.9)
    ctx.stroke()
  }
  // 红印章
  ctx.fillStyle = '#9e2b25'
  ctx.fillRect(x + w - 64, y + h - 64, 46, 46)
  ctx.fillStyle = '#f4ead8'
  ctx.font = '700 28px "SimSun", serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('廉', x + w - 41, y + h - 41)
}

/** 卷轴展板（古贤清风样式）：左文右画，姓名 + 生卒 + 小传 + 水墨山水 */
function paintScrollPanel(ctx, w, h, panel, room, texture) {
  ctx.fillStyle = '#f7f1e3'
  ctx.fillRect(0, 0, w, h)
  ctx.strokeStyle = '#3d2a1c'
  ctx.lineWidth = 12
  ctx.strokeRect(6, 6, w - 12, h - 12)
  ctx.strokeStyle = 'rgba(184, 134, 63, 0.55)'
  ctx.lineWidth = 3
  ctx.strokeRect(26, 26, w - 52, h - 52)

  const pad = Math.round(w * 0.06)
  // 姓名 + 生卒
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = '#2f2016'
  ctx.font = `700 ${Math.round(w * 0.095)}px "Noto Serif SC", "SimSun", serif`
  ctx.fillText(panel.shortTitle, pad, Math.round(h * 0.17))
  ctx.fillStyle = '#7a4a2b'
  ctx.font = `${Math.round(w * 0.037)}px "Microsoft YaHei", sans-serif`
  ctx.fillText(panel.years, pad, Math.round(h * 0.24))
  ctx.strokeStyle = 'rgba(122, 74, 43, 0.4)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(pad, Math.round(h * 0.28))
  ctx.lineTo(Math.round(w * 0.5), Math.round(h * 0.28))
  ctx.stroke()
  // 小传（左栏）
  ctx.fillStyle = '#57473a'
  ctx.font = `${Math.round(w * 0.035)}px "Noto Serif SC", "SimSun", serif`
  drawLines(ctx, panel.sections[0].body, pad, Math.round(h * 0.36), Math.round(w * 0.44), Math.round(h * 0.07), 8)
  // 右栏：有人物图片时显示图片，否则水墨山水
  const sideRect = {
    x: Math.round(w * 0.55),
    y: Math.round(h * 0.24),
    w: Math.round(w * 0.4),
    h: Math.round(h * 0.6),
  }
  if (panel.image && texture) {
    attachImage(texture, ctx, sideRect, panel, room)
  } else {
    paintInkLandscape(ctx, sideRect)
  }
}

/** 深色卡片区图片：深色底衬 + 冷色细边，contain 完整显示 */
function attachDarkImage(texture, ctx, rect, panel) {
  ctx.fillStyle = '#101316'
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h)
  ctx.strokeStyle = 'rgba(74, 158, 255, 0.28)'
  ctx.lineWidth = Math.max(1.5, Math.round(rect.w * 0.004))
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h)
  if (!panel.image) {
    ctx.fillStyle = 'rgba(159, 178, 200, 0.55)'
    ctx.font = `${Math.round(Math.min(rect.w, rect.h) * 0.09)}px "Microsoft YaHei", sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('影像资料 · 待补充', rect.x + rect.w / 2, rect.y + rect.h / 2)
    return
  }
  const img = new Image()
  img.onload = () => {
    const scale = Math.min(rect.w / img.width, rect.h / img.height)
    const dw = img.width * scale
    const dh = img.height * scale
    ctx.drawImage(img, rect.x + (rect.w - dw) / 2, rect.y + (rect.h - dh) / 2, dw, dh)
    texture.needsUpdate = true
  }
  img.src = panel.image
}

/**
 * 撕裂边缘点列：牛皮纸手撕锯齿 + 随机一个角斜切（残缺感）。
 * 返回点列供填充/描边/裁剪共用，保证三者边缘一致。
 */
function tornPoints(w, h, rand) {
  const step = Math.max(24, Math.round(Math.min(w, h) / 14))
  const amp = Math.round(Math.min(w, h) * 0.01) + 3
  const jag = () => (rand() - 0.5) * 2 * amp
  const pts = []
  const corners = []
  for (let x = 0; x <= w; x += step) pts.push([x, jag()])
  corners.push(pts.length - 1)
  for (let y = step; y <= h; y += step) pts.push([w + jag(), y])
  corners.push(pts.length - 1)
  for (let x = w - step; x >= 0; x -= step) pts.push([x, h + jag()])
  corners.push(pts.length - 1)
  for (let y = h - step; y >= 0; y -= step) pts.push([jag(), y])
  corners.push(0)
  // 斜切一个角：角点替换为沿两边内缩的两个点，形成裁切斜边
  const cutAt = corners[Math.floor(rand() * 3)]
  const corner = pts[cutAt]
  const prev = pts[(cutAt - 1 + pts.length) % pts.length]
  const next = pts[(cutAt + 1) % pts.length]
  const d = Math.min(w, h) * (0.05 + rand() * 0.04)
  const along = (a, b) => {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
    return [a[0] + ((b[0] - a[0]) / len) * d, a[1] + ((b[1] - a[1]) / len) * d]
  }
  pts.splice(cutAt, 1, along(corner, prev), along(corner, next))
  return pts
}

function tracePath(ctx, pts) {
  ctx.beginPath()
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
  ctx.closePath()
}

/** 边缘纤维：沿撕裂边随机外挑短线，模拟纸纤维外露 */
function paintFibers(ctx, pts, w, h, rand) {
  const cx = w / 2
  const cy = h / 2
  ctx.lineWidth = 1
  for (let i = 0; i < pts.length; i += 2) {
    if (rand() < 0.45) continue
    const [x, y] = pts[i]
    const len = Math.hypot(x - cx, y - cy) || 1
    const nx = (x - cx) / len
    const ny = (y - cy) / len
    const fl = 2 + rand() * 5
    ctx.strokeStyle = `rgba(190, 202, 214, ${0.1 + rand() * 0.14})`
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + nx * fl + (rand() - 0.5) * 2, y + ny * fl + (rand() - 0.5) * 2)
    ctx.stroke()
  }
}

/** 断裂横线：等距虚段中刻意缺一段，呼应「人生轨迹断裂」意象 */
function paintBrokenLine(ctx, x, y, width, color) {
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  const seg = 16
  const gap = 8
  const missAt = Math.floor(width / (seg + gap) / 2)
  let i = 0
  for (let sx = x; sx + seg <= x + width; sx += seg + gap, i += 1) {
    if (i === missAt) continue
    ctx.beginPath()
    ctx.moveTo(sx, y)
    ctx.lineTo(sx + seg, y)
    ctx.stroke()
  }
}

/**
 * 警示厅案卷卡片：深炭灰底 + 手撕牛皮纸边缘 + 冷青蓝信息 + 暗红关键数据。
 * 竖版卡（标题/照片/数据/分节案情/警示要点纵排）与横版卡（左图右文）两种布局；
 * 大卡片（如薄熙来案）逐节渲染完整案情，小卡片空间耗尽自动截断。
 */
function paintWarningPanel(ctx, w, h, panel, room, index, texture) {
  const pts = tornPoints(w, h, mulberry32(seedOf(panel.id)))
  tracePath(ctx, pts)
  const gradient = ctx.createLinearGradient(0, 0, 0, h)
  gradient.addColorStop(0, 'rgba(36, 41, 48, 0.97)')
  gradient.addColorStop(1, 'rgba(24, 27, 32, 0.97)')
  ctx.fillStyle = gradient
  ctx.fill()
  paintFibers(ctx, pts, w, h, mulberry32(seedOf(panel.id) ^ 0x9e3779b9))
  ctx.strokeStyle = 'rgba(148, 170, 192, 0.4)'
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.save()
  tracePath(ctx, pts)
  ctx.clip()

  const pad = Math.round(Math.min(w, h) * 0.075)
  const bottomPad = Math.round(pad * 1.3)
  const horizontal = w > h * 1.4
  const u = horizontal ? h : w

  // 分类缎带：暗红撕裂条
  const ribbonH = Math.round(u * 0.062)
  ctx.font = `700 ${Math.round(ribbonH * 0.52)}px "Noto Serif SC", "SimSun", serif`
  const ribbonW = Math.round(ctx.measureText(panel.category).width + ribbonH * 1.4)
  ctx.fillStyle = '#8b2e2e'
  ctx.fillRect(pad, pad, ribbonW, ribbonH)
  ctx.fillStyle = '#f0e2d0'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(panel.category, pad + ribbonW / 2, pad + ribbonH / 2 + 1)
  // 档案编号（右上，等宽字体）
  ctx.fillStyle = 'rgba(148, 170, 192, 0.6)'
  ctx.font = `${Math.round(ribbonH * 0.4)}px "JetBrains Mono", "Consolas", monospace`
  ctx.textAlign = 'right'
  ctx.fillText(`CASE ${String(index + 1).padStart(2, '0')}`, w - pad, pad + ribbonH / 2 + 1)

  // 关键数据（涉案金额/处理结果/罪名，暗红等宽字）
  const KEY_LABELS = ['涉案金额', '处理结果', '罪名']
  const keyMeta = (panel.meta || []).filter((m) => KEY_LABELS.includes(m.label))
  const keyText = keyMeta.length
    ? keyMeta.map((m) => `${m.label}｜${m.value}`).join('　')
    : panel.summary
  const warning = (panel.sections || []).find((s) => s.heading === '警示要点')
  const bodySections = (panel.sections || []).filter((s) => s.heading !== '警示要点')

  /** 逐节流式渲染案情：多节带小标题，空间到 limitY 即止；返回结束 y */
  const flowSections = (x, startY, width, bodySize, lineH, limitY) => {
    let y = startY
    const multi = bodySections.length > 1
    for (const section of bodySections) {
      if (y + lineH > limitY) break
      if (multi) {
        ctx.fillStyle = '#8fb4dd'
        ctx.font = `700 ${bodySize}px "Noto Serif SC", "SimSun", serif`
        ctx.fillText(`◆ ${section.heading}`, x, y)
        y += lineH * 0.95
      }
      ctx.fillStyle = '#a9b8c6'
      ctx.font = `${bodySize}px "Noto Serif SC", "SimSun", serif`
      const maxLines = Math.max(0, Math.floor((limitY - y) / lineH))
      if (!maxLines) break
      y += drawLines(ctx, section.body, x, y, width, lineH, maxLines) * lineH + lineH * 0.5
    }
    return y
  }

  const paintWarningLine = (x, y, width, bodySize, lineH, limitY) => {
    if (!warning || y + lineH > limitY) return
    ctx.fillStyle = '#d4574a'
    ctx.font = `700 ${bodySize}px "Noto Serif SC", "SimSun", serif`
    ctx.fillText('▲', x, y)
    ctx.fillStyle = '#c6cfd8'
    ctx.font = `${bodySize}px "Noto Serif SC", "SimSun", serif`
    const maxLines = Math.max(1, Math.floor((limitY - y) / lineH))
    drawLines(ctx, warning.body, x + bodySize * 1.4, y, width - bodySize * 1.4, lineH, maxLines)
  }

  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  if (horizontal) {
    const imgW = Math.round(w * 0.3)
    attachDarkImage(texture, ctx, { x: pad, y: pad * 2 + ribbonH, w: imgW, h: h - pad * 2 - ribbonH - bottomPad }, panel)
    const tx = pad * 2 + imgW
    const tw = w - imgW - pad * 3
    const bodySize = Math.round(h * 0.058)
    const lineH = Math.round(h * 0.095)
    let y = pad * 2 + ribbonH + Math.round(h * 0.045)
    ctx.fillStyle = '#e8ecf1'
    ctx.font = `700 ${Math.round(h * 0.105)}px "Noto Serif SC", "SimSun", serif`
    drawLines(ctx, panel.title, tx, y, tw, Math.round(h * 0.13), 1)
    y += Math.round(h * 0.13)
    paintBrokenLine(ctx, tx, y, tw, 'rgba(120, 150, 180, 0.45)')
    y += Math.round(h * 0.075)
    ctx.fillStyle = '#d4574a'
    ctx.font = `700 ${Math.round(h * 0.05)}px "JetBrains Mono", "Consolas", "Microsoft YaHei", monospace`
    const keyLineH = Math.round(h * 0.07)
    y += drawLines(ctx, keyText, tx, y, tw, keyLineH, 2) * keyLineH + Math.round(h * 0.025)
    if (panel.events?.length) {
      // 事件纪要：罪名下的具体事实行，▪ 标记
      const eventLineH = Math.round(h * 0.068)
      for (const event of panel.events) {
        if (y + eventLineH > h - bottomPad) break
        ctx.fillStyle = '#d4574a'
        ctx.font = `700 ${bodySize}px "Noto Serif SC", "SimSun", serif`
        ctx.fillText('▪', tx, y)
        ctx.fillStyle = '#a9b8c6'
        ctx.font = `${bodySize}px "Noto Serif SC", "SimSun", serif`
        ctx.fillText(event, tx + bodySize * 1.2, y)
        y += eventLineH
      }
    } else {
      const warnReserve = warning ? lineH * 2 : 0
      y = flowSections(tx, y, tw, bodySize, lineH, h - bottomPad - warnReserve)
      paintWarningLine(tx, y + Math.round(h * 0.03), tw, bodySize, lineH, h - bottomPad)
    }
  } else {
    let y = pad * 2 + ribbonH + Math.round(u * 0.05)
    ctx.fillStyle = '#e8ecf1'
    ctx.font = `700 ${Math.round(u * 0.075)}px "Noto Serif SC", "SimSun", serif`
    y += drawLines(ctx, panel.title, pad, y, w - pad * 2, Math.round(u * 0.088), 2) * Math.round(u * 0.088) + Math.round(u * 0.03)
    paintBrokenLine(ctx, pad, y, w - pad * 2, 'rgba(120, 150, 180, 0.45)')
    y += Math.round(u * 0.045)
    const imgH = Math.round(h * (bodySections.length > 2 ? 0.24 : 0.3))
    attachDarkImage(texture, ctx, { x: pad, y, w: w - pad * 2, h: imgH }, panel)
    y += imgH + Math.round(u * 0.05)
    ctx.fillStyle = '#d4574a'
    ctx.font = `700 ${Math.round(u * 0.042)}px "JetBrains Mono", "Consolas", "Microsoft YaHei", monospace`
    const keyLineH = Math.round(u * 0.062)
    y += drawLines(ctx, keyText, pad, y, w - pad * 2, keyLineH, 3) * keyLineH + Math.round(u * 0.04)
    const bodySize = Math.round(u * 0.036)
    const lineH = Math.round(u * 0.058)
    const warnReserve = warning ? lineH * 2 + Math.round(u * 0.03) : 0
    y = flowSections(pad, y, w - pad * 2, bodySize, lineH, h - bottomPad - warnReserve)
    paintWarningLine(pad, y + Math.round(u * 0.03), w - pad * 2, bodySize, lineH, h - bottomPad)
  }
  ctx.restore()
}
export function createPanelTexture(panel, room, index) {
  const canvas = document.createElement('canvas')
  // 画布与画框同比例（上限 1024px），避免极端宽高比被各自截断后拉伸变形
  const scale = Math.min(1024 / panel.layout.w, 1024 / panel.layout.h, 420)
  canvas.width = Math.round(panel.layout.w * scale)
  canvas.height = Math.round(panel.layout.h * scale)
  const ctx = canvas.getContext('2d')
  const texture = makeTexture(canvas)
  const theme = themeOf(room)
  if (panel.kind === 'scroll') {
    canvas.width = 1024
    canvas.height = Math.round((1024 * panel.layout.h) / panel.layout.w)
    paintScrollPanel(canvas.getContext('2d'), canvas.width, canvas.height, panel, room, texture)
    return texture
  }
  // 警示厅：统一案卷卡片（撕裂边深色系），不再使用描金画框贴图
  if (room.theme === 'crimson') {
    paintWarningPanel(ctx, canvas.width, canvas.height, panel, room, index, texture)
    return texture
  }
  if (panel.kind === 'image') {
    paintImagePanel(ctx, canvas.width, canvas.height, panel, room, theme, index, texture)
  } else if (panel.kind === 'side') {
    paintSidePanel(ctx, canvas.width, canvas.height, panel, room, theme, index, texture)
  } else if (panel.kind === 'mixed') {
    paintMixedPanel(ctx, canvas.width, canvas.height, panel, room, theme, index, texture)
  } else {
    paintTextPanel(ctx, canvas.width, canvas.height, panel, room, theme)
  }
  return texture
}

/**
 * 书法名言贴：透明底竖排大字直接上墙（无画框），末尾落红印章。
 * 用于 kind: 'calligraphy' 的名言警句类展板。
 */
export function createCalligraphyTexture(panel, room) {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 1152
  const ctx = canvas.getContext('2d')
  const chars = Array.from(panel.quote.text)
  const size = Math.min(150, Math.floor(760 / chars.length))
  ctx.fillStyle = room.theme === 'crimson' ? '#e8cf9e' : '#4a2c1f'
  ctx.font = `700 ${size}px "Noto Serif SC", "SimSun", serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const step = size * 1.12
  const startY = 90 + size / 2
  chars.forEach((char, index) => {
    ctx.fillText(char, 256, startY + index * step)
  })
  // 落款小字
  const fromY = startY + chars.length * step + 24
  ctx.font = '32px "Noto Serif SC", "SimSun", serif'
  ctx.fillStyle = room.theme === 'crimson' ? 'rgba(213, 182, 117, 0.85)' : 'rgba(122, 74, 43, 0.75)'
  ctx.fillText(panel.quote.from, 256, fromY)
  // 红印章
  const sealSize = 76
  const sealY = Math.min(fromY + 34, 1152 - sealSize - 30)
  ctx.fillStyle = '#9e2b25'
  ctx.fillRect(256 - sealSize / 2, sealY, sealSize, sealSize)
  ctx.fillStyle = '#f4ead8'
  ctx.font = `700 ${Math.round(sealSize * 0.56)}px "SimSun", serif`
  ctx.fillText(room.seal, 256, sealY + sealSize / 2)
  return makeTexture(canvas)
}

/** 展厅牌匾 */
export function createPlaqueTexture(room) {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 256
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = room.accent
  ctx.fillRect(0, 0, 1024, 256)
  ctx.strokeStyle = '#d5b675'
  ctx.lineWidth = 8
  ctx.strokeRect(14, 14, 996, 228)
  ctx.fillStyle = '#f4ead8'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = '700 72px "Noto Serif SC", "SimSun", serif'
  ctx.fillText(room.name, 512, 98)
  ctx.font = '30px "Noto Serif SC", "SimSun", serif'
  ctx.fillText(room.subtitle, 512, 184)
  return makeTexture(canvas)
}

/** 通往另一展厅的门牌；dark 模式与警示厅深色墙面融为一体（隐蔽化处理） */
export function createDoorTexture(nextRoom, dark = false) {
  const canvas = document.createElement('canvas')
  canvas.width = 768
  canvas.height = 480
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = dark ? '#2a2d32' : '#f4ead8'
  ctx.fillRect(0, 0, 768, 480)
  ctx.strokeStyle = dark ? '#4a5058' : '#b8863f'
  ctx.lineWidth = 10
  ctx.strokeRect(16, 16, 736, 448)
  ctx.fillStyle = dark ? '#8a939e' : '#7a4a2b'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = '32px "Microsoft YaHei", sans-serif'
  ctx.fillText('前 往 展 厅', 384, 82)
  ctx.fillStyle = dark ? '#e8ecf1' : nextRoom.accent
  ctx.font = '700 60px "Noto Serif SC", "SimSun", serif'
  wrappedLines(ctx, nextRoom.name, 640, 2).forEach((line, index, lines) => {
    ctx.fillText(line, 384, 208 + (index - (lines.length - 1) / 2) * 72)
  })
  ctx.fillStyle = dark ? '#7fa6d4' : '#57473a'
  ctx.font = '30px "Microsoft YaHei", sans-serif'
  ctx.fillText('点击进入 →', 384, 402)
  return makeTexture(canvas)
}

/** 墙面肌理：勤廉厅米白竖纹；警示厅深炭灰近黑 + 极淡 1px 网格底纹（审视感） */
export function createWallTexture(theme = 'parchment') {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')
  if (theme === 'crimson') {
    // 深灰哑光混凝土基底（提亮一档，避免压抑）
    ctx.fillStyle = '#3a3e44'
    ctx.fillRect(0, 0, 256, 256)
    // 时间磨旧的斑驳：深浅不一的椭圆块
    for (let i = 0; i < 22; i += 1) {
      const light = Math.random() > 0.5
      ctx.fillStyle = light
        ? `rgba(228, 234, 240, ${Math.random() * 0.028})`
        : `rgba(0, 0, 0, ${Math.random() * 0.05})`
      ctx.beginPath()
      ctx.ellipse(
        Math.random() * 256,
        Math.random() * 256,
        18 + Math.random() * 52,
        10 + Math.random() * 24,
        Math.random() * Math.PI,
        0,
        Math.PI * 2
      )
      ctx.fill()
    }
    // 细微横刷痕
    for (let i = 0; i < 34; i += 1) {
      ctx.strokeStyle = `rgba(220, 228, 236, ${0.015 + Math.random() * 0.03})`
      ctx.lineWidth = 1 + Math.random() * 1.5
      const y = Math.random() * 256
      ctx.beginPath()
      ctx.moveTo(Math.random() * 40, y)
      ctx.lineTo(120 + Math.random() * 136, y + (Math.random() - 0.5) * 4)
      ctx.stroke()
    }
    // 手工抹刀弧纹
    for (let i = 0; i < 9; i += 1) {
      ctx.strokeStyle = `rgba(0, 0, 0, ${0.03 + Math.random() * 0.04})`
      ctx.lineWidth = 1.5 + Math.random()
      const start = Math.random() * Math.PI
      ctx.beginPath()
      ctx.arc(Math.random() * 256, Math.random() * 256, 18 + Math.random() * 42, start, start + Math.PI * (0.4 + Math.random() * 0.5))
      ctx.stroke()
    }
    // 极淡细网格（档案坐标纸，定睛才见）
    ctx.strokeStyle = 'rgba(170, 185, 200, 0.045)'
    ctx.lineWidth = 1
    for (let x = 0; x <= 256; x += 24) {
      ctx.beginPath()
      ctx.moveTo(x + 0.5, 0)
      ctx.lineTo(x + 0.5, 256)
      ctx.stroke()
    }
    for (let y = 0; y <= 256; y += 24) {
      ctx.beginPath()
      ctx.moveTo(0, y + 0.5)
      ctx.lineTo(256, y + 0.5)
      ctx.stroke()
    }
    // 哑光噪点
    for (let i = 0; i < 70; i += 1) {
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.015})`
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2)
    }
  } else {
    ctx.fillStyle = '#eadfc9'
    ctx.fillRect(0, 0, 256, 256)
    for (let x = 0; x < 256; x += 16) {
      ctx.fillStyle = x % 32 ? 'rgba(190, 168, 128, 0.1)' : 'rgba(190, 168, 128, 0.05)'
      ctx.fillRect(x, 0, 2, 256)
    }
    for (let i = 0; i < 120; i += 1) {
      ctx.fillStyle = `rgba(150, 124, 88, ${Math.random() * 0.04})`
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2)
    }
  }
  const texture = makeTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(6, 2)
  return texture
}

/** 展签：画框下方的小铭牌 */
export function createLabelTexture(title) {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 128
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#f8f1e2'
  ctx.fillRect(0, 0, 512, 128)
  ctx.strokeStyle = 'rgba(122, 74, 43, 0.55)'
  ctx.lineWidth = 4
  ctx.strokeRect(6, 6, 500, 116)
  ctx.fillStyle = '#4a2c1f'
  ctx.font = '600 42px "Noto Serif SC", "SimSun", serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(title, 256, 66, 460)
  return makeTexture(canvas)
}

/** 前言竖版：暗红落地竖版 + 白字（参考实体展馆的红色序厅墙板） */
export function createPrefaceTexture(room) {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 1216
  const ctx = canvas.getContext('2d')
  const gradient = ctx.createLinearGradient(0, 0, 0, 1216)
  gradient.addColorStop(0, '#8e2620')
  gradient.addColorStop(1, '#671711')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 512, 1216)
  ctx.strokeStyle = '#d5b675'
  ctx.lineWidth = 6
  ctx.strokeRect(18, 18, 476, 1180)
  ctx.lineWidth = 2
  ctx.strokeRect(30, 30, 452, 1156)

  // 顶部：印章 + 「前言」题名
  ctx.fillStyle = '#f4ead8'
  ctx.fillRect(216, 76, 80, 80)
  ctx.fillStyle = room.accent
  ctx.font = '700 46px "SimSun", serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(room.seal, 256, 118)
  ctx.fillStyle = '#f4ead8'
  ctx.font = '700 72px "Noto Serif SC", "SimSun", serif'
  ctx.fillText('前  言', 256, 236)
  ctx.strokeStyle = 'rgba(213, 182, 117, 0.7)'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(80, 300)
  ctx.lineTo(432, 300)
  ctx.stroke()

  ctx.fillStyle = '#efe2c4'
  ctx.font = '33px "Noto Serif SC", "SimSun", serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  drawLines(ctx, room.preface, 64, 380, 384, 62, 12)
  return makeTexture(canvas)
}

/** 红毯：展厅中央导引地毯 */
export function createCarpetTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 1024
  const ctx = canvas.getContext('2d')
  const gradient = ctx.createLinearGradient(0, 0, 512, 0)
  gradient.addColorStop(0, '#7e241f')
  gradient.addColorStop(0.5, '#9e2b25')
  gradient.addColorStop(1, '#7e241f')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 512, 1024)
  // 描金边线
  ctx.strokeStyle = '#d5b675'
  ctx.lineWidth = 6
  ctx.strokeRect(24, 24, 464, 976)
  ctx.lineWidth = 2
  ctx.strokeRect(40, 40, 432, 944)
  // 中心回纹点缀
  ctx.strokeStyle = 'rgba(213, 182, 117, 0.5)'
  ctx.lineWidth = 3
  for (const cy of [192, 512, 832]) {
    ctx.beginPath()
    ctx.arc(256, cy, 64, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(256, cy, 40, 0, Math.PI * 2)
    ctx.stroke()
    ctx.fillStyle = 'rgba(213, 182, 117, 0.65)'
    ctx.font = '44px "SimSun", serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('廉', 256, cy)
  }
  return makeTexture(canvas)
}

/** —— 廉洁元素贴画（透明底，直接贴墙面） —— */

function paintBamboo(ctx) {
  ctx.fillStyle = 'rgba(63, 92, 74, 0.85)'
  // 两根竹秆：分段竹节
  for (const { x, lean } of [{ x: 190, lean: -12 }, { x: 300, lean: 9 }]) {
    for (let i = 0; i < 4; i += 1) {
      const y = 480 - i * 112
      const cx = x + lean * i
      ctx.fillRect(cx - 13, y - 102, 26, 98)
      ctx.fillStyle = 'rgba(43, 66, 51, 0.95)'
      ctx.fillRect(cx - 16, y - 8, 32, 9)
      ctx.fillStyle = 'rgba(63, 92, 74, 0.85)'
    }
  }
  // 竹叶
  const leaves = [
    [250, 80, -0.5], [335, 120, 0.6], [155, 185, -0.95],
    [305, 245, 0.35], [205, 320, -0.45], [360, 55, 0.95],
  ]
  for (const [x, y, rot] of leaves) {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(rot)
    ctx.beginPath()
    ctx.ellipse(0, 0, 58, 13, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}

function paintLotus(ctx) {
  // 茎
  ctx.strokeStyle = 'rgba(63, 92, 74, 0.9)'
  ctx.lineWidth = 10
  ctx.beginPath()
  ctx.moveTo(256, 330)
  ctx.quadraticCurveTo(246, 400, 250, 475)
  ctx.stroke()
  // 荷叶
  ctx.fillStyle = 'rgba(88, 130, 100, 0.72)'
  ctx.beginPath()
  ctx.ellipse(160, 425, 112, 42, -0.15, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(365, 445, 92, 34, 0.2, 0, Math.PI * 2)
  ctx.fill()
  // 花瓣
  ctx.fillStyle = 'rgba(198, 90, 110, 0.9)'
  for (const [rot, len] of [[-0.9, 95], [-0.45, 115], [0, 128], [0.45, 115], [0.9, 95]]) {
    ctx.save()
    ctx.translate(256, 255)
    ctx.rotate(rot)
    ctx.beginPath()
    ctx.ellipse(0, -len / 2, 34, len / 2, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
  // 莲心
  ctx.fillStyle = '#e8cf9e'
  ctx.beginPath()
  ctx.arc(256, 255, 26, 0, Math.PI * 2)
  ctx.fill()
}

function paintPlum(ctx) {
  ctx.strokeStyle = '#4a2c1f'
  ctx.lineCap = 'round'
  ctx.lineWidth = 16
  ctx.beginPath()
  ctx.moveTo(55, 485)
  ctx.quadraticCurveTo(180, 330, 330, 205)
  ctx.stroke()
  ctx.lineWidth = 10
  ctx.beginPath()
  ctx.moveTo(200, 330)
  ctx.quadraticCurveTo(270, 320, 345, 355)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(300, 232)
  ctx.quadraticCurveTo(372, 168, 432, 88)
  ctx.stroke()
  // 梅花：五瓣簇拥 + 金蕊
  const flowers = [[330, 205], [345, 355], [432, 88], [252, 298], [148, 395], [382, 158]]
  for (const [x, y] of flowers) {
    ctx.fillStyle = '#b03a3a'
    for (let i = 0; i < 5; i += 1) {
      const angle = (i / 5) * Math.PI * 2
      ctx.beginPath()
      ctx.arc(x + Math.cos(angle) * 21, y + Math.sin(angle) * 21, 15, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.fillStyle = '#e8cf9e'
    ctx.beginPath()
    ctx.arc(x, y, 9, 0, Math.PI * 2)
    ctx.fill()
  }
}

function paintEmblem(ctx, room) {
  const c = 256
  ctx.fillStyle = room.accent
  ctx.strokeStyle = '#b8863f'
  ctx.lineWidth = 14
  ctx.beginPath()
  ctx.arc(c, c, 200, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.strokeStyle = '#e8cf9e'
  ctx.lineWidth = 6
  ctx.beginPath()
  ctx.arc(c, c, 166, 0, Math.PI * 2)
  ctx.stroke()
  ctx.fillStyle = '#f4ead8'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = '700 190px "SimSun", serif'
  ctx.fillText(room.seal, c, c - 18)
  ctx.font = '36px "Noto Serif SC", "SimSun", serif'
  ctx.fillText(room.subtitle.split('·')[0].trim(), c, c + 112)
}

/** 暗红介绍带（古贤清风版头）：暗红底 + 题名 + 副题 + 导语 */
function paintRedband(ctx, decal) {
  const w = 512
  const h = 1280
  const gradient = ctx.createLinearGradient(0, 0, 0, h)
  gradient.addColorStop(0, '#8e2620')
  gradient.addColorStop(1, '#671711')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, w, h)
  ctx.strokeStyle = '#d5b675'
  ctx.lineWidth = 6
  ctx.strokeRect(16, 16, w - 32, h - 32)
  ctx.lineWidth = 2
  ctx.strokeRect(28, 28, w - 56, h - 56)

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#f4ead8'
  ctx.font = '700 92px "Noto Serif SC", "SimSun", serif'
  const title = decal.title || ''
  Array.from(title).forEach((char, index) => {
    ctx.fillText(char, w / 2, 170 + index * 118)
  })
  const subY = 170 + title.length * 118 + 26
  ctx.fillStyle = '#e8cf9e'
  ctx.font = '34px "Noto Serif SC", "SimSun", serif'
  ctx.fillText(decal.subtitle || '', w / 2, subY)
  ctx.strokeStyle = 'rgba(213, 182, 117, 0.7)'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(90, subY + 46)
  ctx.lineTo(w - 90, subY + 46)
  ctx.stroke()

  ctx.fillStyle = '#efe2c4'
  ctx.font = '30px "Noto Serif SC", "SimSun", serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  drawLines(ctx, decal.body || '', 62, subY + 116, w - 124, 56, 10)
}

/** 廉政制度沿革时间轴（透明底）：题名 + 朝代节点竖列 */
function paintTimeline(ctx, decal) {
  const w = 512
  const h = 1024
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#4a2c1f'
  ctx.font = '700 54px "Noto Serif SC", "SimSun", serif'
  ctx.fillText(decal.title || '廉政制度沿革', w / 2, 60)
  ctx.strokeStyle = '#b8863f'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(90, 108)
  ctx.lineTo(w - 90, 108)
  ctx.stroke()

  const items = decal.items || []
  const top = 190
  const bottom = h - 90
  const step = items.length > 1 ? (bottom - top) / (items.length - 1) : 0
  ctx.strokeStyle = 'rgba(122, 74, 43, 0.55)'
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.moveTo(w / 2, top)
  ctx.lineTo(w / 2, bottom)
  ctx.stroke()
  items.forEach((item, index) => {
    const y = top + index * step
    ctx.fillStyle = '#9e2b25'
    ctx.beginPath()
    ctx.arc(w / 2, y, 14, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#d5b675'
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.fillStyle = '#4a2c1f'
    ctx.font = '700 44px "Noto Serif SC", "SimSun", serif'
    ctx.textAlign = 'right'
    ctx.fillText(item.label, w / 2 - 40, y)
    ctx.fillStyle = '#7a6a55'
    ctx.font = '26px "Microsoft YaHei", sans-serif'
    ctx.textAlign = 'left'
    drawLines(ctx, item.text, w / 2 + 40, y - 20, 190, 36, 2)
    ctx.textAlign = 'center'
  })
}

/** 数据代价区：人生轨迹折线断崖下跌 + 碎裂多边形 + 裂纹辐射 + 暗红虚线警戒 */
function paintFallline(ctx) {
  const w = 1024
  const h = 512
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = 'rgba(200, 212, 224, 0.9)'
  ctx.font = '700 38px "Noto Serif SC", "SimSun", serif'
  ctx.textAlign = 'left'
  ctx.fillText('数据代价 · 人生轨迹', 44, 62)
  ctx.fillStyle = 'rgba(148, 170, 192, 0.6)'
  ctx.font = '20px "JetBrains Mono", "Consolas", monospace'
  ctx.fillText('LIFE TRAJECTORY / CLIFF DROP', 46, 94)

  // 局部网格
  ctx.strokeStyle = 'rgba(74, 158, 255, 0.09)'
  ctx.lineWidth = 1
  for (let x = 44; x <= w - 44; x += 62) {
    ctx.beginPath()
    ctx.moveTo(x + 0.5, 110)
    ctx.lineTo(x + 0.5, h - 48)
    ctx.stroke()
  }
  for (let y = 110; y <= h - 48; y += 44) {
    ctx.beginPath()
    ctx.moveTo(44, y + 0.5)
    ctx.lineTo(w - 44, y + 0.5)
    ctx.stroke()
  }

  // 上升段（冷青蓝）：起步 → 攀升 → 顶点
  const rise = [[70, 396], [230, 350], [390, 276], [540, 208], [660, 158]]
  ctx.strokeStyle = '#4a9eff'
  ctx.lineWidth = 7
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.beginPath()
  rise.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
  ctx.stroke()
  // 断崖段（暗红）
  const dropX = 660
  const dropTop = 158
  const dropBottom = 416
  ctx.strokeStyle = '#d4574a'
  ctx.beginPath()
  ctx.moveTo(dropX, dropTop)
  ctx.lineTo(dropX + 12, dropBottom)
  ctx.stroke()
  // 谷底平线（灰红）
  ctx.strokeStyle = 'rgba(212, 87, 74, 0.5)'
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.moveTo(dropX + 12, dropBottom)
  ctx.lineTo(w - 70, dropBottom + 6)
  ctx.stroke()

  // 毛玻璃模糊区：碎片群背后霜化光斑（多层径向渐变假模糊）
  for (const [fx, fy, fr, fa] of [[dropX + 150, dropBottom - 70, 150, 0.09], [dropX + 210, dropBottom - 30, 110, 0.07]]) {
    const frost = ctx.createRadialGradient(fx, fy, 10, fx, fy, fr)
    frost.addColorStop(0, `rgba(205, 220, 235, ${fa})`)
    frost.addColorStop(1, 'rgba(205, 220, 235, 0)')
    ctx.fillStyle = frost
    ctx.beginPath()
    ctx.arc(fx, fy, fr, 0, Math.PI * 2)
    ctx.fill()
  }

  // 碎裂多边形（锈蚀钢板断面：氧化坑洼 + 毛刺棱角）
  const shards = [
    [[dropX + 40, dropBottom - 90], [dropX + 96, dropBottom - 58], [dropX + 58, dropBottom - 22]],
    [[dropX + 118, dropBottom - 130], [dropX + 178, dropBottom - 96], [dropX + 132, dropBottom - 52]],
    [[dropX + 196, dropBottom - 60], [dropX + 262, dropBottom - 30], [dropX + 208, dropBottom + 2]],
  ]
  shards.forEach((pts, i) => {
    const minX = Math.min(...pts.map((p) => p[0]))
    const minY = Math.min(...pts.map((p) => p[1]))
    const rust = ctx.createLinearGradient(minX, minY, minX + 120, minY + 110)
    rust.addColorStop(0, 'rgba(84, 74, 62, 0.55)')
    rust.addColorStop(0.6, 'rgba(102, 82, 60, 0.45)')
    rust.addColorStop(1, 'rgba(58, 54, 48, 0.55)')
    ctx.beginPath()
    pts.forEach(([x, y], j) => (j ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
    ctx.closePath()
    ctx.fillStyle = rust
    ctx.fill()
    ctx.strokeStyle = 'rgba(190, 200, 210, 0.5)'
    ctx.lineWidth = 2
    ctx.stroke()
    // 氧化剥落坑洼
    const seedPts = pts.flat()
    for (let k = 0; k < 6; k += 1) {
      const px = minX + ((seedPts[k % seedPts.length] * 37 + k * 53) % 90)
      const py = minY + ((seedPts[(k + 1) % seedPts.length] * 29 + k * 41) % 70)
      ctx.fillStyle = `rgba(20, 18, 16, ${0.2 + (k % 3) * 0.08})`
      ctx.beginPath()
      ctx.ellipse(px, py, 3 + (k % 3) * 2, 2 + (k % 2) * 2, k, 0, Math.PI * 2)
      ctx.fill()
    }
    // 边缘毛刺
    ctx.strokeStyle = 'rgba(190, 200, 210, 0.3)'
    ctx.lineWidth = 1
    for (let e = 0; e < 3; e += 1) {
      const [ax, ay] = pts[e]
      const [bx, by] = pts[(e + 1) % 3]
      const mx = (ax + bx) / 2
      const my = (ay + by) / 2
      ctx.beginPath()
      ctx.moveTo(mx, my)
      ctx.lineTo(mx + (i - 1) * 4, my - 5 - e * 2)
      ctx.stroke()
    }
  })
  // 钢化玻璃放射裂纹：冷蓝光晕 + 尖锐分叉
  const crackFrom = [dropX + 12, dropBottom - 10]
  const crackEnds = [[58, -84], [108, -40], [136, 8], [86, 42], [30, 58], [-24, 40], [168, -78]]
  for (const [dx, dy] of crackEnds) {
    const ex = crackFrom[0] + dx
    const ey = crackFrom[1] + dy
    ctx.strokeStyle = 'rgba(74, 158, 255, 0.14)'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(crackFrom[0], crackFrom[1])
    ctx.lineTo(ex, ey)
    ctx.stroke()
    ctx.strokeStyle = 'rgba(200, 216, 232, 0.55)'
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.moveTo(crackFrom[0], crackFrom[1])
    ctx.lineTo(ex, ey)
    ctx.stroke()
    // 分叉
    const bx = crackFrom[0] + dx * 0.55
    const by = crackFrom[1] + dy * 0.55
    ctx.beginPath()
    ctx.moveTo(bx, by)
    ctx.lineTo(bx + dx * 0.3 - dy * 0.18, by + dy * 0.3 + dx * 0.18)
    ctx.stroke()
  }

  // 暗红断续竖线（朱批式：深浅不一、忽隐忽现）
  for (const x of [300, 860]) {
    let y = 118
    let k = 0
    while (y < h - 52) {
      const segLen = 10 + ((k * 37) % 14)
      const alpha = k % 5 === 2 ? 0.12 : 0.25 + ((k * 53) % 45) / 100
      ctx.strokeStyle = `rgba(139, 46, 46, ${alpha})`
      ctx.lineWidth = k % 4 === 1 ? 4 : 2.5
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x, Math.min(y + segLen, h - 52))
      ctx.stroke()
      y += segLen + 8 + ((k * 29) % 10)
      k += 1
    }
  }

  // 节点标注
  ctx.fillStyle = 'rgba(74, 158, 255, 0.9)'
  ctx.font = '20px "JetBrains Mono", "Consolas", monospace'
  ctx.textAlign = 'center'
  ctx.fillText('起步', 70, 432)
  ctx.fillText('攀升', 390, 316)
  ctx.fillStyle = '#d4574a'
  ctx.font = '700 26px "Noto Serif SC", "SimSun", serif'
  ctx.fillText('断崖式坠落', dropX + 34, dropTop - 18)
}

/** 主墙贯穿线：断裂横线（人生轨迹）+ 断续暗红竖线（警戒），dashes 可配竖线位置 */
function paintWallline(ctx, decal = {}) {
  const dashXs = decal.dashes ?? [79, 1994]
  const w = 2048
  const h = 640
  const lineY = 560
  // 断裂横线：规律虚段中刻意留断口
  ctx.strokeStyle = 'rgba(140, 165, 190, 0.55)'
  ctx.lineWidth = 4
  const seg = 46
  const gap = 22
  let i = 0
  for (let x = 30; x + seg <= w - 30; x += seg + gap, i += 1) {
    if (i % 7 === 4) continue
    ctx.beginPath()
    ctx.moveTo(x, lineY)
    ctx.lineTo(x + seg, lineY)
    ctx.stroke()
  }
  // 暗红断续竖线（朱批式深浅不一；位置由 decal.dashes 指定）
  for (const x of dashXs) {
    let y = 60
    let k = 0
    while (y < lineY - 12) {
      const segLen = 12 + ((k * 37) % 16)
      const alpha = k % 5 === 2 ? 0.1 : 0.22 + ((k * 53) % 48) / 100
      ctx.strokeStyle = `rgba(139, 46, 46, ${alpha})`
      ctx.lineWidth = k % 4 === 1 ? 5 : 3
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x, Math.min(y + segLen, lineY - 12))
      ctx.stroke()
      y += segLen + 9 + ((k * 29) % 11)
      k += 1
    }
  }
  ctx.fillStyle = 'rgba(212, 87, 74, 0.8)'
  for (const x of dashXs) {
    ctx.beginPath()
    ctx.arc(x, 48, 7, 0, Math.PI * 2)
    ctx.fill()
  }
  // 端部标注
  ctx.textBaseline = 'bottom'
  ctx.fillStyle = 'rgba(140, 165, 190, 0.6)'
  ctx.font = '20px "JetBrains Mono", "Consolas", monospace'
  ctx.textAlign = 'left'
  ctx.fillText('LIFE LINE · BROKEN', 40, lineY - 16)
  ctx.fillStyle = 'rgba(212, 87, 74, 0.75)'
  ctx.font = '700 30px "Noto Serif SC", "SimSun", serif'
  ctx.textAlign = 'right'
  ctx.fillText('警戒线', w - 40, lineY - 12)
}

/**
 * 明镜造型（主墙中央装置）：拉丝不锈钢圆盘 + 蚀刻同心环 + 朱批红环 + 「镜」字铭文。
 * 完整露出于两案之间的墙面，不再被画框遮挡。
 */
function paintMirror(ctx) {
  const c = 256
  // 圆盘底：径向渐变模拟金属受光
  const disc = ctx.createRadialGradient(c - 70, c - 80, 40, c, c, 252)
  disc.addColorStop(0, '#4b515a')
  disc.addColorStop(0.65, '#34383e')
  disc.addColorStop(1, '#23262b')
  ctx.fillStyle = disc
  ctx.beginPath()
  ctx.arc(c, c, 250, 0, Math.PI * 2)
  ctx.fill()
  // 拉丝发丝纹（裁剪在圆盘内）
  ctx.save()
  ctx.beginPath()
  ctx.arc(c, c, 250, 0, Math.PI * 2)
  ctx.clip()
  for (let i = 0; i < 130; i += 1) {
    ctx.strokeStyle = `rgba(205, 216, 226, ${0.02 + Math.random() * 0.03})`
    ctx.lineWidth = 1
    const x = 20 + Math.random() * 472
    const y = 20 + Math.random() * 472
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x, y + 24 + Math.random() * 70)
    ctx.stroke()
  }
  // 蚀刻同心环：暗线 + 上移 1.5px 亮线（凹槽感），第三环暗红点睛
  for (let i = 0; i < 5; i += 1) {
    const r = 74 + i * 38
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.arc(c, c, r, 0, Math.PI * 2)
    ctx.stroke()
    ctx.strokeStyle = i === 2 ? 'rgba(212, 87, 74, 0.7)' : `rgba(196, 210, 222, ${0.42 - i * 0.05})`
    ctx.lineWidth = i === 2 ? 3 : 1.5
    ctx.beginPath()
    ctx.arc(c, c - 1.5, r, 0, Math.PI * 2)
    ctx.stroke()
  }
  // 外圈刻度
  ctx.strokeStyle = 'rgba(196, 210, 222, 0.35)'
  ctx.lineWidth = 1.5
  for (let a = 0; a < 36; a += 1) {
    const angle = (a / 36) * Math.PI * 2
    ctx.beginPath()
    ctx.moveTo(c + Math.cos(angle) * 234, c + Math.sin(angle) * 234)
    ctx.lineTo(c + Math.cos(angle) * 243, c + Math.sin(angle) * 243)
    ctx.stroke()
  }
  ctx.restore()
  // 盘缘描边
  ctx.strokeStyle = 'rgba(148, 170, 192, 0.5)'
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.arc(c, c, 249, 0, Math.PI * 2)
  ctx.stroke()
  // 中心「镜」+ 铭文
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#e8ecf1'
  ctx.font = '700 112px "Noto Serif SC", "SimSun", serif'
  ctx.fillText('镜', c, c - 18)
  ctx.fillStyle = 'rgba(212, 87, 74, 0.85)'
  ctx.beginPath()
  ctx.arc(c, c + 62, 6, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(200, 210, 220, 0.85)'
  ctx.font = '700 30px "Noto Serif SC", "SimSun", serif'
  ctx.fillText('以案为镜 · 正心修身', c, c + 108)
  ctx.fillStyle = 'rgba(148, 170, 192, 0.5)'
  ctx.font = '15px "JetBrains Mono", "Consolas", monospace'
  ctx.fillText('REFLECTION', c, c + 142)
}

/** 玻璃裂纹：冲击点放射状炸开，缝隙透冷蓝光 */
function paintCrack(ctx) {
  const cx = 256
  const cy = 290
  const rand = mulberry32(20261116)
  // 冷蓝光晕
  const glow = ctx.createRadialGradient(cx, cy, 4, cx, cy, 160)
  glow.addColorStop(0, 'rgba(74, 158, 255, 0.2)')
  glow.addColorStop(1, 'rgba(74, 158, 255, 0)')
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(cx, cy, 160, 0, Math.PI * 2)
  ctx.fill()
  // 放射主裂纹 + 分叉
  for (let i = 0; i < 11; i += 1) {
    const angle = (i / 11) * Math.PI * 2 + rand() * 0.4
    const len = 90 + rand() * 140
    const ex = cx + Math.cos(angle) * len
    const ey = cy + Math.sin(angle) * len
    ctx.strokeStyle = 'rgba(74, 158, 255, 0.13)'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(ex, ey)
    ctx.stroke()
    ctx.strokeStyle = 'rgba(205, 220, 235, 0.6)'
    ctx.lineWidth = 1.3
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(ex, ey)
    ctx.stroke()
    const b = 0.35 + rand() * 0.3
    const bx = cx + Math.cos(angle) * len * b
    const by = cy + Math.sin(angle) * len * b
    const ba = angle + (rand() > 0.5 ? 0.55 : -0.55)
    ctx.beginPath()
    ctx.moveTo(bx, by)
    ctx.lineTo(bx + Math.cos(ba) * len * 0.35, by + Math.sin(ba) * len * 0.35)
    ctx.stroke()
  }
  // 同心碎裂环（两段）
  ctx.strokeStyle = 'rgba(180, 200, 220, 0.3)'
  ctx.lineWidth = 1.2
  for (const [r, a0, a1] of [[70, 0.3, 2.4], [70, 3.4, 5.6], [120, 1.2, 3.0], [120, 4.2, 6.1]]) {
    ctx.beginPath()
    ctx.arc(cx, cy, r, a0, a1)
    ctx.stroke()
  }
  // 冲击点
  ctx.fillStyle = 'rgba(235, 242, 248, 0.9)'
  ctx.beginPath()
  ctx.arc(cx, cy, 5, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = 'rgba(74, 158, 255, 0.5)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(cx, cy, 11, 0, Math.PI * 2)
  ctx.stroke()
}

/** 门上蚀刻横批：「以案为鉴 · 警钟长鸣」+ 断裂细线 */
function paintDoorstrip(ctx) {
  const w = 1024
  const h = 256
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  // 蚀刻感：先暗错位再亮
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)'
  ctx.font = '700 66px "Noto Serif SC", "SimSun", serif'
  ctx.fillText('以案为鉴 · 警钟长鸣', w / 2, h / 2 - 8 + 2)
  ctx.fillStyle = 'rgba(205, 216, 226, 0.88)'
  ctx.fillText('以案为鉴 · 警钟长鸣', w / 2, h / 2 - 8)
  ctx.fillStyle = 'rgba(148, 170, 192, 0.5)'
  ctx.font = '18px "JetBrains Mono", "Consolas", monospace'
  ctx.fillText('WARNING  ·  DETERRENCE', w / 2, h / 2 + 48)
  // 上下断裂细线
  for (const y of [34, h - 34]) {
    let i = 0
    for (let x = 60; x + 34 <= w - 60; x += 48, i += 1) {
      if (i % 6 === 3) continue
      ctx.strokeStyle = 'rgba(140, 165, 190, 0.4)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + 34, y)
      ctx.stroke()
    }
  }
  // 两端红点
  ctx.fillStyle = 'rgba(212, 87, 74, 0.75)'
  for (const x of [40, w - 40]) {
    ctx.beginPath()
    ctx.arc(x, h / 2, 5, 0, Math.PI * 2)
    ctx.fill()
  }
}

const decalPainters = {
  bamboo: paintBamboo,
  lotus: paintLotus,
  plum: paintPlum,
  emblem: paintEmblem,
  redband: paintRedband,
  timeline: paintTimeline,
  fallline: paintFallline,
  mirror: paintMirror,
  wallline: paintWallline,
  crack: paintCrack,
  doorstrip: paintDoorstrip,
}

/** 廉洁元素贴画：竹子/莲花/梅花/徽章/警钟/利剑/介绍带/时间轴 */
export function createDecalTexture(decal, room) {
  const canvas = document.createElement('canvas')
  if (decal.type === 'redband') {
    canvas.width = 512
    canvas.height = 1280
  } else if (decal.type === 'timeline') {
    canvas.width = 512
    canvas.height = 1024
  } else if (decal.type === 'fallline') {
    canvas.width = 1024
    canvas.height = 512
  } else if (decal.type === 'wallline') {
    canvas.width = 2048
    canvas.height = 640
  } else if (decal.type === 'doorstrip') {
    canvas.width = 1024
    canvas.height = 256
  } else {
    canvas.width = 512
    canvas.height = 512
  }
  const ctx = canvas.getContext('2d')
  decalPainters[decal.type]?.(ctx, decal.type === 'emblem' ? room : decal)
  return makeTexture(canvas)
}

/** 圆形铜浮雕贴图：青灰石底 + 山峦纹 + 「廉」字 */
export function createReliefTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')
  const c = 256
  const gradient = ctx.createRadialGradient(c - 60, c - 60, 40, c, c, 250)
  gradient.addColorStop(0, '#9a8264')
  gradient.addColorStop(1, '#6e5433')
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.arc(c, c, 250, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = 'rgba(232, 207, 158, 0.55)'
  ctx.lineWidth = 6
  for (const r of [232, 196]) {
    ctx.beginPath()
    ctx.arc(c, c, r, 0, Math.PI * 2)
    ctx.stroke()
  }
  // 山峦纹
  ctx.strokeStyle = 'rgba(62, 44, 26, 0.75)'
  ctx.lineWidth = 9
  ctx.lineCap = 'round'
  for (const [base, amp] of [[330, 60], [372, 44]]) {
    ctx.beginPath()
    ctx.moveTo(c - 168, base)
    ctx.quadraticCurveTo(c - 100, base - amp, c - 40, base - 14)
    ctx.quadraticCurveTo(c + 30, base - amp - 20, c + 96, base - 8)
    ctx.quadraticCurveTo(c + 140, base - amp * 0.6, c + 168, base - 22)
    ctx.stroke()
  }
  ctx.fillStyle = '#4a3620'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = '700 128px "SimSun", serif'
  ctx.fillText('廉', c, c - 58)
  ctx.font = '30px "Noto Serif SC", "SimSun", serif'
  ctx.fillText('清 风 正 气', c, c + 26)
  return makeTexture(canvas)
}

/** 木地板 */
export function createFloorTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#8b6b4d'
  ctx.fillRect(0, 0, 512, 512)
  for (let y = 0; y <= 512; y += 64) {
    ctx.strokeStyle = 'rgba(57, 35, 23, 0.42)'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(512, y)
    ctx.stroke()
    for (let x = (y / 64) % 2 ? 128 : 0; x <= 512; x += 256) {
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x, y + 64)
      ctx.stroke()
    }
  }
  const texture = makeTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(2.5, 2.5)
  return texture
}

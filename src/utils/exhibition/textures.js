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
  wrappedLines(ctx, text, maxWidth, maxLines).forEach((line, index) => {
    ctx.fillText(line, x, y + index * lineHeight)
  })
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

/** 页脚：展板序号 + 交互提示 */
function paintFooter(ctx, w, h, room, theme, index) {
  const pad = Math.round(w * 0.055)
  const lineY = h - Math.round(h * 0.115)
  ctx.strokeStyle = theme.footerLine
  ctx.lineWidth = Math.max(1.5, Math.round(w * 0.002))
  ctx.beginPath()
  ctx.moveTo(pad, lineY)
  ctx.lineTo(w - pad, lineY)
  ctx.stroke()
  ctx.fillStyle = theme.quoteFrom === '#8a7156' ? room.accent : theme.quoteFrom
  ctx.font = `${Math.round(h * 0.042)}px "Microsoft YaHei", sans-serif`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(`第 ${index + 1} 展板`, pad, h - Math.round(h * 0.06))
  ctx.textAlign = 'right'
  ctx.fillText('点击查看详情', w - pad, h - Math.round(h * 0.06))
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

/** 预留图片位：有 image 时异步加载并替换占位画面 */
function attachImage(texture, ctx, rect, panel, room) {
  paintImageSlot(ctx, rect, room)
  if (!panel.image) return
  const img = new Image()
  img.onload = () => {
    // cover 裁切填充
    const scale = Math.max(rect.w / img.width, rect.h / img.height)
    const dw = img.width * scale
    const dh = img.height * scale
    ctx.save()
    ctx.beginPath()
    ctx.rect(rect.x, rect.y, rect.w, rect.h)
    ctx.clip()
    ctx.drawImage(img, rect.x + (rect.w - dw) / 2, rect.y + (rect.h - dh) / 2, dw, dh)
    ctx.restore()
    texture.needsUpdate = true
  }
  img.src = panel.image
}

/** 文字展板：标题 + （可选名言）/ 摘要 */
function paintTextPanel(ctx, w, h, panel, room, theme, index) {
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
  paintFooter(ctx, w, h, room, theme, index)
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
  ctx.fillStyle = theme.quoteFrom === '#8a7156' ? room.accent : theme.quoteFrom
  ctx.font = `${Math.round(h * 0.038)}px "Microsoft YaHei", sans-serif`
  ctx.textAlign = 'right'
  ctx.fillText(`第 ${index + 1} 展板 · 点击查看详情`, w - pad, h - Math.round(h * 0.045))
  ctx.textAlign = 'left'
  ctx.fillText(panel.category, pad, h - Math.round(h * 0.045))
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
  ctx.font = `700 ${Math.round(stripH * 0.4)}px "Noto Serif SC", "SimSun", serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(panel.title, w / 2, stripY + stripH * 0.38)
  ctx.font = `${Math.round(stripH * 0.28)}px "Microsoft YaHei", sans-serif`
  ctx.fillText(`第 ${index + 1} 展板 · 点击查看详情`, w / 2, stripY + stripH * 0.74)
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
function paintScrollPanel(ctx, w, h, panel) {
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
  ctx.font = `700 ${Math.round(w * 0.085)}px "Noto Serif SC", "SimSun", serif`
  ctx.fillText(panel.shortTitle, pad, Math.round(h * 0.17))
  ctx.fillStyle = '#7a4a2b'
  ctx.font = `${Math.round(w * 0.033)}px "Microsoft YaHei", sans-serif`
  ctx.fillText(panel.years, pad, Math.round(h * 0.24))
  ctx.strokeStyle = 'rgba(122, 74, 43, 0.4)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(pad, Math.round(h * 0.28))
  ctx.lineTo(Math.round(w * 0.5), Math.round(h * 0.28))
  ctx.stroke()
  // 小传（左栏）
  ctx.fillStyle = '#57473a'
  ctx.font = `${Math.round(w * 0.031)}px "Noto Serif SC", "SimSun", serif`
  drawLines(ctx, panel.sections[0].body, pad, Math.round(h * 0.36), Math.round(w * 0.44), Math.round(h * 0.065), 9)
  // 右栏水墨山水
  paintInkLandscape(ctx, {
    x: Math.round(w * 0.55),
    y: Math.round(h * 0.24),
    w: Math.round(w * 0.4),
    h: Math.round(h * 0.6),
  })
  // 点击提示
  ctx.fillStyle = '#8a7156'
  ctx.font = `${Math.round(w * 0.026)}px "Microsoft YaHei", sans-serif`
  ctx.textAlign = 'right'
  ctx.fillText('点击查看详情', w - pad, h - Math.round(h * 0.05))
}

/** 展板贴图入口：按 kind 分派，画布比例与画框尺寸一致避免拉伸 */
export function createPanelTexture(panel, room, index) {
  const canvas = document.createElement('canvas')
  canvas.width = Math.min(1024, Math.max(512, Math.round(panel.layout.w * 380)))
  canvas.height = Math.min(1024, Math.max(384, Math.round(panel.layout.h * 380)))
  const ctx = canvas.getContext('2d')
  const texture = makeTexture(canvas)
  const theme = themeOf(room)
  if (panel.kind === 'scroll') {
    canvas.width = 1024
    canvas.height = Math.round((1024 * panel.layout.h) / panel.layout.w)
    paintScrollPanel(canvas.getContext('2d'), canvas.width, canvas.height, panel)
    return texture
  }
  if (panel.kind === 'image') {
    paintImagePanel(ctx, canvas.width, canvas.height, panel, room, theme, index, texture)
  } else if (panel.kind === 'mixed') {
    paintMixedPanel(ctx, canvas.width, canvas.height, panel, room, theme, index, texture)
  } else {
    paintTextPanel(ctx, canvas.width, canvas.height, panel, room, theme, index)
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

/** 通往另一展厅的门牌 */
export function createDoorTexture(nextRoom) {
  const canvas = document.createElement('canvas')
  canvas.width = 768
  canvas.height = 480
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#f4ead8'
  ctx.fillRect(0, 0, 768, 480)
  ctx.strokeStyle = '#b8863f'
  ctx.lineWidth = 10
  ctx.strokeRect(16, 16, 736, 448)
  ctx.fillStyle = '#7a4a2b'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = '32px "Microsoft YaHei", sans-serif'
  ctx.fillText('前 往 展 厅', 384, 82)
  ctx.fillStyle = nextRoom.accent
  ctx.font = '700 60px "Noto Serif SC", "SimSun", serif'
  wrappedLines(ctx, nextRoom.name, 640, 2).forEach((line, index, lines) => {
    ctx.fillText(line, 384, 208 + (index - (lines.length - 1) / 2) * 72)
  })
  ctx.fillStyle = '#57473a'
  ctx.font = '30px "Microsoft YaHei", sans-serif'
  ctx.fillText('点击进入 →', 384, 402)
  return makeTexture(canvas)
}

/** 墙面肌理：米白底 + 隐约竖纹，避免大面积平涂的单调感 */
export function createWallTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')
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

function paintBell(ctx) {
  const cx = 256
  // 钟体
  ctx.fillStyle = '#8a6b45'
  ctx.beginPath()
  ctx.moveTo(cx - 30, 95)
  ctx.quadraticCurveTo(cx - 148, 185, cx - 158, 330)
  ctx.quadraticCurveTo(cx - 168, 392, cx - 188, 402)
  ctx.lineTo(cx + 188, 402)
  ctx.quadraticCurveTo(cx + 168, 392, cx + 158, 330)
  ctx.quadraticCurveTo(cx + 148, 185, cx + 30, 95)
  ctx.closePath()
  ctx.fill()
  // 钟口沿
  ctx.fillStyle = '#6e5433'
  ctx.beginPath()
  ctx.ellipse(cx, 402, 188, 30, 0, 0, Math.PI * 2)
  ctx.fill()
  // 钟钮
  ctx.strokeStyle = '#6e5433'
  ctx.lineWidth = 18
  ctx.beginPath()
  ctx.arc(cx, 72, 28, 0, Math.PI * 2)
  ctx.stroke()
  // 钟锤
  ctx.fillStyle = '#4a3a2c'
  ctx.beginPath()
  ctx.arc(cx, 438, 20, 0, Math.PI * 2)
  ctx.fill()
  // 饰带
  ctx.strokeStyle = 'rgba(232, 207, 158, 0.75)'
  ctx.lineWidth = 8
  ctx.beginPath()
  ctx.moveTo(cx - 128, 250)
  ctx.quadraticCurveTo(cx, 278, cx + 128, 250)
  ctx.stroke()
}

function paintSword(ctx) {
  const cx = 256
  // 剑刃（朝下，「高悬利剑」）
  const blade = ctx.createLinearGradient(cx - 28, 0, cx + 28, 0)
  blade.addColorStop(0, '#9aa4ad')
  blade.addColorStop(0.5, '#edf1f4')
  blade.addColorStop(1, '#9aa4ad')
  ctx.fillStyle = blade
  ctx.beginPath()
  ctx.moveTo(cx - 26, 155)
  ctx.lineTo(cx + 26, 155)
  ctx.lineTo(cx + 10, 430)
  ctx.lineTo(cx, 468)
  ctx.lineTo(cx - 10, 430)
  ctx.closePath()
  ctx.fill()
  // 护手
  ctx.fillStyle = '#b8863f'
  ctx.fillRect(cx - 85, 122, 170, 28)
  // 剑柄
  ctx.fillStyle = '#4a2c1f'
  ctx.fillRect(cx - 14, 44, 28, 78)
  ctx.fillStyle = '#b8863f'
  ctx.beginPath()
  ctx.arc(cx, 38, 18, 0, Math.PI * 2)
  ctx.fill()
  // 红缨
  ctx.strokeStyle = '#b03a3a'
  ctx.lineWidth = 8
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(cx + 62, 150)
  ctx.quadraticCurveTo(cx + 98, 205, cx + 82, 265)
  ctx.stroke()
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

/** 墙上大字题额（透明底）：墨色大字 + 副题 */
function paintWalltitle(ctx, decal) {
  const w = 1024
  const h = 300
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#2f2016'
  ctx.font = '700 128px "Noto Serif SC", "SimSun", serif'
  const title = decal.title || ''
  const gap = 190
  const startX = w / 2 - ((title.length - 1) * gap) / 2
  Array.from(title).forEach((char, index) => {
    ctx.fillText(char, startX + index * gap, 118)
  })
  ctx.strokeStyle = '#9e2b25'
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.moveTo(w / 2 - 220, 196)
  ctx.lineTo(w / 2 + 220, 196)
  ctx.stroke()
  ctx.fillStyle = '#7a4a2b'
  ctx.font = '44px "Noto Serif SC", "SimSun", serif'
  ctx.fillText(decal.subtitle || '', w / 2, 252)
}

const decalPainters = {
  bamboo: paintBamboo,
  lotus: paintLotus,
  plum: paintPlum,
  emblem: paintEmblem,
  bell: paintBell,
  sword: paintSword,
  redband: paintRedband,
  timeline: paintTimeline,
  walltitle: paintWalltitle,
}

/** 廉洁元素贴画：竹子/莲花/梅花/徽章/警钟/利剑/介绍带/时间轴/题额 */
export function createDecalTexture(decal, room) {
  const canvas = document.createElement('canvas')
  if (decal.type === 'redband') {
    canvas.width = 512
    canvas.height = 1280
  } else if (decal.type === 'timeline') {
    canvas.width = 512
    canvas.height = 1024
  } else if (decal.type === 'walltitle') {
    canvas.width = 1024
    canvas.height = 300
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

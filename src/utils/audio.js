/**
 * Web Audio 音效生成器
 * 不依赖任何外部音频文件，通过振荡器实时合成音效
 */

let audioCtx = null
let enabled = true

/** 设置音效开关 */
export function setAudioEnabled(value) {
  enabled = value
}

/** 获取音效开关状态 */
export function isAudioEnabled() {
  return enabled
}

/** 获取（或惰性创建）AudioContext，并恢复挂起状态 */
function getCtx() {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    audioCtx = new AC()
  }
  if (audioCtx.state === 'suspended') audioCtx.resume()
  return audioCtx
}

/**
 * 生成一个带包络的单音
 * @param {number} freq 起始频率
 * @param {number} duration 时长（秒）
 * @param {object} opts 波形、终点频率、音量等
 */
function tone(freq, duration, opts = {}) {
  const ctx = getCtx()
  if (!ctx) return

  const {
    type = 'sine',
    endFreq = freq, // 频率终点（用于滑音）
    gain = 0.12,
    attack = 0.005,
    when = 0,
  } = opts

  const osc = ctx.createOscillator()
  const g = ctx.createGain()

  osc.type = type
  osc.frequency.setValueAtTime(freq, ctx.currentTime + when)
  if (endFreq !== freq) {
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(endFreq, 1),
      ctx.currentTime + when + duration,
    )
  }

  // 音量包络：快起音 + 指数衰减
  g.gain.setValueAtTime(0.0001, ctx.currentTime + when)
  g.gain.exponentialRampToValueAtTime(gain, ctx.currentTime + when + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + when + duration)

  osc.connect(g)
  g.connect(ctx.destination)
  osc.start(ctx.currentTime + when)
  osc.stop(ctx.currentTime + when + duration + 0.05)
}

/** 白噪声短促脉冲（用于“啪”落桌、翻卡等打击感） */
function noise(duration, opts = {}) {
  const ctx = getCtx()
  if (!ctx) return

  const { gain = 0.2, when = 0, filterFreq = 1800 } = opts
  const bufferSize = Math.floor(ctx.sampleRate * duration)
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)

  for (let i = 0; i < bufferSize; i++) {
    // 指数衰减的随机噪声
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize)
  }

  const src = ctx.createBufferSource()
  src.buffer = buffer

  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = filterFreq

  const g = ctx.createGain()
  g.gain.setValueAtTime(gain, ctx.currentTime + when)
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + when + duration)

  src.connect(filter)
  filter.connect(g)
  g.connect(ctx.destination)
  src.start(ctx.currentTime + when)
}

/**
 * 播放指定音效
 * @param {string} name 音效名
 */
export function playSound(name) {
  if (!enabled) return

  try {
    switch (name) {
      case 'throw': // 箭飞出：上扬的咻声
        tone(500, 0.28, { type: 'sawtooth', endFreq: 1400, gain: 0.05 })
        break
      case 'hit': // 命中：低沉的闷响
        tone(180, 0.18, { type: 'triangle', endFreq: 90, gain: 0.25 })
        noise(0.06, { gain: 0.15, filterFreq: 900 })
        break
      case 'miss': // 未命中：下滑的失落声
        tone(600, 0.3, { type: 'sine', endFreq: 160, gain: 0.1 })
        break
      case 'card': // 抽卡“啪”落桌
        noise(0.08, { gain: 0.3, filterFreq: 2400 })
        break
      case 'flip': // 翻卡：清脆的翻动
        tone(900, 0.12, { type: 'triangle', endFreq: 400, gain: 0.08 })
        noise(0.05, { gain: 0.12, filterFreq: 3200 })
        break
      case 'settle': // 清算：一记重音
        tone(220, 0.5, { type: 'sawtooth', endFreq: 60, gain: 0.2 })
        tone(110, 0.6, { type: 'sine', endFreq: 55, gain: 0.2, when: 0.02 })
        break
      case 'warning': // 巡视警示：低沉的警音
        tone(140, 0.5, { type: 'sine', endFreq: 100, gain: 0.18 })
        tone(180, 0.5, { type: 'sine', endFreq: 120, gain: 0.12, when: 0.15 })
        break
      case 'tick': // 计时/提示滴答
        tone(1000, 0.05, { type: 'square', gain: 0.05 })
        break
      case 'win': // 获胜/清风奖
        tone(523, 0.15, { type: 'triangle', gain: 0.14 })
        tone(659, 0.15, { type: 'triangle', gain: 0.14, when: 0.12 })
        tone(784, 0.3, { type: 'triangle', gain: 0.14, when: 0.24 })
        break
      default:
        break
    }
  } catch (e) {
    // 音频失败不影响游戏主流程
  }
}

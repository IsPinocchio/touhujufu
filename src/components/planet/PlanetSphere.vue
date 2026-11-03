<script setup>
/**
 * 廉动星球 · 3D 星球首页核心组件（Three.js）
 *
 * 视觉构成：
 * - 程序生成的星球贴图（深海蓝海洋 + 水墨风装饰大陆）
 * - 功能大陆（球形曲面贴片，品牌色 + 鎏金描边），可点击
 * - 大陆上方悬浮「印章式」字形 sprite + HTML 标签（始终面向用户）
 * - 大气辉光（菲涅尔 shader）、星空粒子、鎏金行星环、「廉」字小卫星
 *
 * 交互：
 * - 指针拖拽旋转（上下左右），带惯性；松手后缓慢自转
 * - 点击（位移 < 8px 判定为点击）大陆 → emit('select', module)
 * - hover（桌面端）高亮对应大陆与标签
 */
import { onMounted, onUnmounted, reactive, ref } from 'vue'
import * as THREE from 'three'

const props = defineProps({
  // 功能模块定义：{ key, name, glyph, color, desc, route, lat, lon }
  modules: { type: Array, required: true },
})
const emit = defineEmits(['select'])

const containerRef = ref(null)

// HTML 标签位置（每帧由渲染循环更新）
const labels = reactive(
  props.modules.map((m) => ({ key: m.key, x: 0, y: 0, visible: false, active: false }))
)

let renderer, scene, camera, planetGroup, moon
let plates = [] // { mesh, module, normal(Vector3 local), sprite }
let tokens = [] // 清风令环绕 sprite
let lotuses = [] // 莲花独立环绕 sprite
let rafId = 0
let lastFrameTime = 0
let needsRender = true
let resizeObserver
const raycaster = new THREE.Raycaster()
const pointerNdc = new THREE.Vector2()

// 拖拽 / 惯性 / 自转状态
const drag = {
  active: false,
  lastX: 0,
  lastY: 0,
  velX: 0,
  velY: 0,
  moved: 0,
  idleFrames: 999, // 空闲帧数，用于恢复自转
}
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const AUTO_SPEED = reduceMotion ? 0 : 0.0012
const FRAME_INTERVAL = 1000 / 30

// ———————————————————————— 工具函数 ————————————————————————

/** 经纬度 → 球面单位向量（lon=0 朝向相机 +z） */
function latLonToVec3(lat, lon, r = 1) {
  const phi = THREE.MathUtils.degToRad(lat)
  const lambda = THREE.MathUtils.degToRad(lon)
  return new THREE.Vector3(
    r * Math.cos(phi) * Math.sin(lambda),
    r * Math.sin(phi),
    r * Math.cos(phi) * Math.cos(lambda)
  )
}

/** 用随机但平滑的半径扰动画一块不规则「大陆」路径 */
function blobPath(ctx, cx, cy, radius, seed, irregular = 0.16) {
  const rand = mulberry32(seed)
  const phases = [rand() * Math.PI * 2, rand() * Math.PI * 2, rand() * Math.PI * 2]
  ctx.beginPath()
  const steps = 48
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2
    const k =
      1 -
      irregular / 2 +
      irregular * 0.55 * Math.sin(3 * a + phases[0]) +
      irregular * 0.3 * Math.sin(7 * a + phases[1]) +
      irregular * 0.15 * Math.sin(11 * a + phases[2])
    const x = cx + Math.cos(a) * radius * k
    const y = cy + Math.sin(a) * radius * k
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
}

function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ———————————————————————— 贴图生成 ————————————————————————

/** 星球表面贴图：深海蓝海洋 + 水墨装饰大陆（非交互底图） */
function createPlanetTexture() {
  const W = 1024
  const H = 512
  const cv = document.createElement('canvas')
  cv.width = W
  cv.height = H
  const ctx = cv.getContext('2d')

  // 海洋底色：明快浅蓝，近赤道略亮
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, '#6b9cc2')
  g.addColorStop(0.42, '#8cbadd')
  g.addColorStop(0.58, '#8cbadd')
  g.addColorStop(1, '#5a8ab0')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)

  // 海面微光噪点
  const rand = mulberry32(20261008)
  for (let i = 0; i < 2600; i++) {
    const x = rand() * W
    const y = rand() * H
    const a = 0.04 + rand() * 0.08
    ctx.fillStyle = `rgba(255, 252, 236, ${a})`
    ctx.fillRect(x, y, rand() < 0.9 ? 1 : 2, 1)
  }
  // 大范围云水亮带
  for (let i = 0; i < 14; i++) {
    const x = rand() * W
    const y = H * 0.2 + rand() * H * 0.6
    const r = 60 + rand() * 150
    const rg = ctx.createRadialGradient(x, y, 0, x, y, r)
    rg.addColorStop(0, 'rgba(235, 244, 220, 0.12)')
    rg.addColorStop(1, 'rgba(235, 244, 220, 0)')
    ctx.fillStyle = rg
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }

  // 装饰性大陆放置在功能大陆之间的空隙，避免遮挡交互贴片
  const decorLand = [
    { lat: -45, lon: 35, r: 58 }, { lat: 0, lon: 20, r: 52 },
    { lat: -15, lon: 75, r: 50 }, { lat: -70, lon: 110, r: 46 },
    { lat: 20, lon: -100, r: 44 }, { lat: -45, lon: -25, r: 38 },
    { lat: 70, lon: -50, r: 34 },
  ]
  for (let i = 0; i < decorLand.length; i++) {
    const { lat, lon, r } = decorLand[i]
    // 经纬度 → 贴图坐标（SphereGeometry UV 约定：lon=0 处对应 u=0.25，即 lon+90）
    const x = ((lon + 90) / 360) * W
    const y = ((90 - lat) / 180) * H
    // 靠近接缝处画两份，避免大陆被切断
    for (const xx of [x, x - W, x + W]) {
      if (xx < -r || xx > W + r) continue
      blobPath(ctx, xx, y, r, 1000 + i * 77, 0.22)
      ctx.fillStyle = 'rgba(196, 148, 84, 0.95)'
      ctx.fill()
      ctx.strokeStyle = 'rgba(122, 74, 43, 0.8)'
      ctx.lineWidth = 3
      ctx.stroke()
      // 内陆浅色肌理
      blobPath(ctx, xx, y, r * 0.62, 2000 + i * 31, 0.3)
      ctx.fillStyle = 'rgba(232, 202, 142, 0.4)'
      ctx.fill()
    }
  }

  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

/**
 * 功能大陆贴图：品牌色陆块 + 鎏金描边 + 内部肌理（径向 UV）
 * 每个模块用不同 seed，得到互不相同的不规则大陆轮廓
 */
function createPlateTexture(color, seed = 7) {
  const S = 256
  const cv = document.createElement('canvas')
  cv.width = S
  cv.height = S
  const ctx = cv.getContext('2d')
  const c = S / 2
  const R = S * 0.44

  // 金色光晕垫底
  ctx.save()
  ctx.shadowColor = 'rgba(212, 175, 106, 0.9)'
  ctx.shadowBlur = 18

  blobPath(ctx, c, c, R, seed, 0.24)
  const grad = ctx.createRadialGradient(c - R * 0.3, c - R * 0.3, R * 0.1, c, c, R * 1.15)
  grad.addColorStop(0, lighten(color, 0.25))
  grad.addColorStop(0.65, color)
  grad.addColorStop(1, darken(color, 0.2))
  ctx.fillStyle = grad
  ctx.fill()
  ctx.restore()

  // 鎏金描边（双层）
  blobPath(ctx, c, c, R, seed, 0.24)
  ctx.strokeStyle = 'rgba(212, 175, 106, 0.95)'
  ctx.lineWidth = 5
  ctx.stroke()
  blobPath(ctx, c, c, R * 0.95, seed, 0.24)
  ctx.strokeStyle = 'rgba(244, 234, 216, 0.35)'
  ctx.lineWidth = 1.5
  ctx.stroke()

  // 内部肌理斑块
  const rand = mulberry32(color.charCodeAt(1) * 999 + seed)
  for (let i = 0; i < 7; i++) {
    const a = rand() * Math.PI * 2
    const d = rand() * R * 0.5
    blobPath(ctx, c + Math.cos(a) * d, c + Math.sin(a) * d, 10 + rand() * 22, i * 55 + 9, 0.4)
    ctx.fillStyle = rand() < 0.5 ? 'rgba(244, 234, 216, 0.14)' : 'rgba(20, 20, 30, 0.16)'
    ctx.fill()
  }

  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

/** 莲花贴图：环绕星球的廉洁意象装饰 */
function createLotusTexture() {
  const S = 128
  const cv = document.createElement('canvas')
  cv.width = S
  cv.height = S
  const ctx = cv.getContext('2d')
  const c = S / 2

  // 花瓣：两层，外层深内层浅
  const drawPetals = (r, color, count, rot) => {
    ctx.fillStyle = color
    for (let i = 0; i < count; i++) {
      const a = rot + (i / count) * Math.PI * 2
      ctx.save()
      ctx.translate(c, c)
      ctx.rotate(a)
      ctx.beginPath()
      ctx.ellipse(0, -r * 0.55, r * 0.26, r * 0.52, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
  }
  drawPetals(S * 0.4, 'rgba(192, 80, 74, 0.95)', 6, 0)
  drawPetals(S * 0.28, 'rgba(232, 160, 150, 0.95)', 6, Math.PI / 6)
  // 莲心
  ctx.beginPath()
  ctx.arc(c, c, S * 0.1, 0, Math.PI * 2)
  ctx.fillStyle = '#e8c98a'
  ctx.fill()
  ctx.beginPath()
  ctx.arc(c, c, S * 0.1, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(158, 43, 37, 0.6)'
  ctx.lineWidth = 2
  ctx.stroke()

  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/** 清风令贴图：绕星球巡行的金色令牌 */
function createTokenTexture() {
  const S = 96
  const cv = document.createElement('canvas')
  cv.width = S
  cv.height = S
  const ctx = cv.getContext('2d')
  const c = S / 2

  // 金饼
  ctx.beginPath()
  ctx.arc(c, c, S * 0.44, 0, Math.PI * 2)
  ctx.fillStyle = '#c9a25a'
  ctx.fill()
  ctx.lineWidth = 3
  ctx.strokeStyle = '#8a6a30'
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(c, c, S * 0.34, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(244, 234, 216, 0.5)'
  ctx.lineWidth = 1.5
  ctx.stroke()

  ctx.fillStyle = '#4a2c1f'
  ctx.font = `700 ${S * 0.4}px "Noto Serif SC", "STSong", "SimSun", serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('清', c, c + 2)

  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/** 大陆上方的印章字形 sprite 贴图 */
function createGlyphTexture(glyph, color) {
  const S = 128
  const cv = document.createElement('canvas')
  cv.width = S
  cv.height = S
  const ctx = cv.getContext('2d')

  // 圆形印章底
  ctx.beginPath()
  ctx.arc(S / 2, S / 2, S * 0.46, 0, Math.PI * 2)
  ctx.fillStyle = darken(color, 0.12)
  ctx.fill()
  ctx.lineWidth = 4
  ctx.strokeStyle = 'rgba(212, 175, 106, 0.95)'
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(S / 2, S / 2, S * 0.38, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(244, 234, 216, 0.4)'
  ctx.lineWidth = 1.5
  ctx.stroke()

  // 字形
  ctx.fillStyle = '#f4ead8'
  ctx.font = `700 ${S * 0.44}px "Noto Serif SC", "STSong", "SimSun", serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(glyph, S / 2, S / 2 + S * 0.02)

  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/** 行星环贴图：径向渐变的柔和鎏金带 */
function createRingTexture() {
  const S = 256
  const cv = document.createElement('canvas')
  cv.width = S
  cv.height = S
  const ctx = cv.getContext('2d')
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2)
  g.addColorStop(0.0, 'rgba(212,175,106,0)')
  g.addColorStop(0.52, 'rgba(212,175,106,0)')
  g.addColorStop(0.6, 'rgba(212,175,106,0.55)')
  g.addColorStop(0.66, 'rgba(244,234,216,0.75)')
  g.addColorStop(0.74, 'rgba(212,175,106,0.4)')
  g.addColorStop(0.82, 'rgba(212,175,106,0)')
  g.addColorStop(1.0, 'rgba(212,175,106,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, S, S)
  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/** 「廉」字小卫星贴图 */
function createMoonTexture() {
  const S = 128
  const cv = document.createElement('canvas')
  cv.width = S
  cv.height = S
  const ctx = cv.getContext('2d')
  ctx.beginPath()
  ctx.arc(S / 2, S / 2, S * 0.48, 0, Math.PI * 2)
  ctx.fillStyle = '#efe3cb'
  ctx.fill()
  // 月面暗斑
  const rand = mulberry32(42)
  for (let i = 0; i < 6; i++) {
    ctx.beginPath()
    ctx.arc(rand() * S, rand() * S, 4 + rand() * 10, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(160, 140, 110, 0.35)'
    ctx.fill()
  }
  // 「廉」字印章
  ctx.fillStyle = '#9e2b25'
  ctx.font = `700 ${S * 0.5}px "Noto Serif SC", "STSong", "SimSun", serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('廉', S / 2, S / 2 + 2)

  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function lighten(hex, amt) {
  return shiftColor(hex, Math.abs(amt))
}
function darken(hex, amt) {
  return shiftColor(hex, -Math.abs(amt))
}
function shiftColor(hex, amt) {
  const n = parseInt(hex.slice(1), 16)
  const r = Math.min(255, Math.max(0, ((n >> 16) & 255) + 255 * amt))
  const gch = Math.min(255, Math.max(0, ((n >> 8) & 255) + 255 * amt))
  const b = Math.min(255, Math.max(0, (n & 255) + 255 * amt))
  return `rgb(${r | 0}, ${gch | 0}, ${b | 0})`
}

// ———————————————————————— 几何：球形曲面大陆贴片 ————————————————————————

/**
 * 生成贴合球面的圆盘贴片（同心环三角网），UV 为径向（中心 0.5,0.5）
 * @param lat/lon 中心经纬度，angularRadius 弧度，lift 抬升半径系数
 */
function createPlateGeometry(lat, lon, angularRadius, lift = 1.02) {
  const RINGS = 10
  const SECTORS = 48
  const center = latLonToVec3(lat, lon, lift)
  // 切平面基向量
  const up = Math.abs(center.y) > 0.95 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0)
  const u = new THREE.Vector3().crossVectors(center, up).normalize()
  const v = new THREE.Vector3().crossVectors(center, u).normalize()

  const positions = [center.x, center.y, center.z]
  const uvs = [0.5, 0.5]
  const indices = []

  for (let ring = 1; ring <= RINGS; ring++) {
    const ang = angularRadius * (ring / RINGS)
    for (let s = 0; s < SECTORS; s++) {
      const a = (s / SECTORS) * Math.PI * 2
      const dir = new THREE.Vector3()
        .copy(center)
        .multiplyScalar(Math.cos(ang))
        .addScaledVector(u, Math.cos(a) * Math.sin(ang))
        .addScaledVector(v, Math.sin(a) * Math.sin(ang))
        .normalize()
      positions.push(dir.x * lift, dir.y * lift, dir.z * lift)
      const ru = 0.5 + 0.5 * (ring / RINGS) * Math.cos(a)
      const rv = 0.5 + 0.5 * (ring / RINGS) * Math.sin(a)
      uvs.push(ru, rv)
    }
  }
  // 索引：中心扇区
  for (let s = 0; s < SECTORS; s++) {
    indices.push(0, 1 + s, 1 + ((s + 1) % SECTORS))
  }
  // 环间四边形
  for (let ring = 0; ring < RINGS - 1; ring++) {
    const a0 = 1 + ring * SECTORS
    const b0 = 1 + (ring + 1) * SECTORS
    for (let s = 0; s < SECTORS; s++) {
      const s1 = (s + 1) % SECTORS
      indices.push(a0 + s, b0 + s, b0 + s1)
      indices.push(a0 + s, b0 + s1, a0 + s1)
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

// ———————————————————————— 场景搭建 ————————————————————————

function buildScene() {
  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200)
  camera.position.set(0, 0.15, 3)

  // 灯光：提亮整体，偏暖阳
  scene.add(new THREE.AmbientLight(0xfff6e6, 0.85))
  const key = new THREE.DirectionalLight(0xffe8c0, 1.6)
  key.position.set(3, 2.2, 4)
  scene.add(key)
  const rim = new THREE.DirectionalLight(0xd9a05e, 0.45)
  rim.position.set(-4, -1, -3)
  scene.add(rim)

  planetGroup = new THREE.Group()
  planetGroup.position.set(0, -0.35, 0) // 星球整体下沉，给标题留位
  scene.add(planetGroup)

  // 星球本体
  const planet = new THREE.Mesh(
    new THREE.SphereGeometry(1, 64, 64),
    new THREE.MeshStandardMaterial({
      map: createPlanetTexture(),
      roughness: 0.9,
      metalness: 0.05,
    })
  )
  planetGroup.add(planet)

  // 功能大陆贴片 + 印章字形
  for (let i = 0; i < props.modules.length; i++) {
    const m = props.modules[i]
    const geo = createPlateGeometry(m.lat, m.lon, THREE.MathUtils.degToRad(36))
    const mat = new THREE.MeshStandardMaterial({
      map: createPlateTexture(m.color, i * 17 + 5),
      transparent: true,
      roughness: 0.65,
      metalness: 0.15,
      emissive: new THREE.Color(m.color),
      emissiveIntensity: 0.25,
    })
    const mesh = new THREE.Mesh(geo, mat)
    planetGroup.add(mesh)

    const normal = latLonToVec3(m.lat, m.lon, 1)
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: createGlyphTexture(m.glyph, m.color),
        transparent: true,
        depthWrite: false,
      })
    )
    sprite.scale.set(0.32, 0.32, 1)
    sprite.position.copy(normal).multiplyScalar(1.1)
    planetGroup.add(sprite)

    plates.push({ mesh, sprite, module: m, normal })
  }

  // 鎏金行星环
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(1.45, 2.15, 64),
    new THREE.MeshBasicMaterial({
      map: createRingTexture(),
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  )
  ring.rotation.x = Math.PI / 2 - 0.32
  ring.raycast = () => {} // 不参与点击
  planetGroup.add(ring)

  // 大气辉光（菲涅尔）
  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(1, 32, 32),
    new THREE.ShaderMaterial({
      vertexShader: /* glsl */ `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(max(0.0, 0.62 - dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.2);
          gl_FragColor = vec4(0.98, 0.8, 0.45, 1.0) * intensity; // 暖金大气辉光
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
    })
  )
  atmosphere.scale.setScalar(1.22)
  atmosphere.raycast = () => {}
  planetGroup.add(atmosphere)

  // 「廉」字小卫星
  moon = new THREE.Mesh(
    new THREE.SphereGeometry(0.11, 32, 32),
    new THREE.MeshStandardMaterial({ map: createMoonTexture(), roughness: 0.8 })
  )
  moon.raycast = () => {}
  planetGroup.add(moon)

  // 莲花贴饰：沿各自轨道绕星球巡行，与球体自转相互独立
  const lotusTex = createLotusTexture()
  const lotusDefs = [
    { radius: 1.18, speed: 0.18, phase: 0.2, lift: 0.32 },
    { radius: 1.24, speed: -0.14, phase: 1.9, lift: 0.48 },
    { radius: 1.12, speed: 0.16, phase: 3.5, lift: 0.58 },
    { radius: 1.28, speed: -0.12, phase: 5.1, lift: 0.4 },
  ]
  for (const def of lotusDefs) {
    const lotus = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: lotusTex, transparent: true, depthWrite: false })
    )
    lotus.scale.set(0.14, 0.14, 1)
    lotus.raycast = () => {}
    lotus.userData.orbit = def
    planetGroup.add(lotus)
    lotuses.push(lotus)
  }

  // 清风令：沿行星环巡行的金色令牌
  const tokenTex = createTokenTexture()
  const tokenDefs = [
    { radius: 1.62, speed: 0.5, phase: 0 },
    { radius: 1.85, speed: -0.34, phase: 2.1 },
    { radius: 2.02, speed: 0.42, phase: 4.2 },
  ]
  for (const def of tokenDefs) {
    const token = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: tokenTex, transparent: true, depthWrite: false })
    )
    token.scale.set(0.12, 0.12, 1)
    token.raycast = () => {}
    token.userData.orbit = def
    planetGroup.add(token)
    tokens.push(token)
  }

  // 星空
  const starGeo = new THREE.BufferGeometry()
  const starCount = 900
  const starPos = new Float32Array(starCount * 3)
  const rand = mulberry32(88)
  for (let i = 0; i < starCount; i++) {
    // 均匀球壳
    const theta = rand() * Math.PI * 2
    const cosPhi = rand() * 2 - 1
    const sinPhi = Math.sqrt(1 - cosPhi * cosPhi)
    const r = 45 + rand() * 30
    starPos[i * 3] = r * sinPhi * Math.cos(theta)
    starPos[i * 3 + 1] = r * cosPhi
    starPos[i * 3 + 2] = r * sinPhi * Math.sin(theta)
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3))
  const stars = new THREE.Points(
    starGeo,
    new THREE.PointsMaterial({
      color: 0xb8863f,
      size: 1.6,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    })
  )
  stars.raycast = () => {}
  scene.add(stars)

  // 初始朝向：让「投壶拒腐」大陆斜向镜头（星球略偏画面下方，给标题留位）
  const first = props.modules[0]
  if (first) {
    const dir = latLonToVec3(first.lat, first.lon, 1)
    const target = new THREE.Vector3(0, -0.18, 1).normalize()
    planetGroup.quaternion.setFromUnitVectors(dir, target)
  }
}

// ———————————————————————— 渲染循环 ————————————————————————

const tmpVec = new THREE.Vector3()
const tmpQuat = new THREE.Quaternion()

function requestRender() {
  needsRender = true
  if (!rafId && renderer && !document.hidden) {
    rafId = requestAnimationFrame(tick)
  }
}

function tick(now) {
  rafId = 0
  if (!renderer || document.hidden) return

  const shouldRender = !reduceMotion || needsRender || drag.active
  if (shouldRender && now - lastFrameTime >= FRAME_INTERVAL) {
    const deltaSeconds = lastFrameTime
      ? Math.min((now - lastFrameTime) / 1000, 0.1)
      : FRAME_INTERVAL / 1000
    const frameScale = deltaSeconds * 60
    lastFrameTime = now

    // 惯性 + 自转
    if (!drag.active) {
      planetGroup.rotation.y += drag.velX * frameScale
      planetGroup.rotation.x = THREE.MathUtils.clamp(
        planetGroup.rotation.x + drag.velY * frameScale,
        -1.1,
        1.1
      )
      const damping = Math.pow(0.94, frameScale)
      drag.velX *= damping
      drag.velY *= damping
      if (Math.abs(drag.velX) < 0.0004) drag.velX = 0
      if (Math.abs(drag.velY) < 0.0004) drag.velY = 0
      drag.idleFrames += frameScale
      if (drag.idleFrames > 120) planetGroup.rotation.y += AUTO_SPEED * frameScale
    }

    // 小卫星绕转
    if (moon) {
      const t = now * 0.00022
      moon.position.set(Math.cos(t) * 1.95, Math.sin(t * 1.3) * 0.42 + 0.12, Math.sin(t) * 1.95)
      moon.rotation.y += 0.004 * frameScale
    }

    const tSec = now * 0.001
    // 莲花沿独立轨道公转（带轻微起伏）
    for (const lotus of lotuses) {
      const { radius, speed, phase, lift } = lotus.userData.orbit
      const a = tSec * speed + phase
      lotus.position.set(
        Math.cos(a) * radius,
        Math.sin(a * 1.4) * lift,
        Math.sin(a) * radius
      )
    }
    for (const token of tokens) {
      const { radius, speed, phase } = token.userData.orbit
      const a = tSec * speed + phase
      token.position.set(
        Math.cos(a) * radius,
        Math.sin(a * 1.7) * 0.22,
        Math.sin(a) * radius
      )
    }

    updateLabels()
    renderer.render(scene, camera)
    needsRender = false
  }

  if (!reduceMotion || drag.active || needsRender) {
    rafId = requestAnimationFrame(tick)
  }
}

/** 将大陆的世界坐标投影到屏幕，驱动 HTML 标签显隐与位置 */
function updateLabels() {
  const rect = renderer.domElement.getBoundingClientRect()
  planetGroup.getWorldQuaternion(tmpQuat)
  const camPos = camera.position

  for (let i = 0; i < plates.length; i++) {
    const p = plates[i]
    const label = labels[i]

    // 大陆中心世界坐标 + 朝外偏移（含星球组整体位移）
    tmpVec
      .copy(p.normal)
      .applyQuaternion(tmpQuat)
      .multiplyScalar(1.32)
      .add(planetGroup.position)
    const worldNormal = tmpVec.clone().normalize()

    // 面向相机判定
    const facing = worldNormal.dot(tmpVec2.copy(camPos).sub(tmpVec).normalize())

    tmpVec.project(camera)
    const behind = tmpVec.z > 1
    label.visible = !behind && facing > 0.18
    label.x = (tmpVec.x * 0.5 + 0.5) * rect.width
    label.y = (-tmpVec.y * 0.5 + 0.5) * rect.height
  }
}
const tmpVec2 = new THREE.Vector3()

// ———————————————————————— 指针交互 ————————————————————————

function setNdcFromEvent(e) {
  const rect = renderer.domElement.getBoundingClientRect()
  pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
  pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
}

function pickPlate(e) {
  setNdcFromEvent(e)
  raycaster.setFromCamera(pointerNdc, camera)
  const hits = raycaster.intersectObjects(plates.map((p) => p.mesh), false)
  return hits.length ? plates.find((p) => p.mesh === hits[0].object) : null
}

function setHovered(plate) {
  for (const p of plates) {
    const on = p === plate
    p.mesh.material.emissiveIntensity = on ? 0.75 : 0.25
  }
  for (const l of labels) {
    l.active = plate ? l.key === plate.module.key : false
  }
  renderer.domElement.style.cursor = plate ? 'pointer' : 'grab'
  requestRender()
}

function onPointerDown(e) {
  drag.active = true
  drag.lastX = e.clientX
  drag.lastY = e.clientY
  drag.velX = 0
  drag.velY = 0
  drag.moved = 0
  drag.idleFrames = 0
  renderer.domElement.setPointerCapture(e.pointerId)
  renderer.domElement.style.cursor = 'grabbing'
  requestRender()
}

function onPointerMove(e) {
  if (!drag.active) {
    // 桌面 hover 高亮
    if (e.pointerType === 'mouse') setHovered(pickPlate(e))
    return
  }
  const dx = e.clientX - drag.lastX
  const dy = e.clientY - drag.lastY
  drag.lastX = e.clientX
  drag.lastY = e.clientY
  drag.moved += Math.abs(dx) + Math.abs(dy)
  drag.velX = dx * 0.005
  drag.velY = dy * 0.005
  planetGroup.rotation.y += drag.velX
  planetGroup.rotation.x = THREE.MathUtils.clamp(planetGroup.rotation.x + drag.velY, -1.1, 1.1)
  requestRender()
}

function onPointerUp(e) {
  if (!drag.active) return
  drag.active = false
  renderer.domElement.style.cursor = 'grab'
  // 位移足够小 → 视为点击（pointercancel 不触发点击）
  if (e.type === 'pointerup' && drag.moved < 8) {
    const plate = pickPlate(e)
    if (plate) emit('select', plate.module)
  }
  requestRender()
}

// ———————————————————————— 生命周期 ————————————————————————

function resize() {
  const el = containerRef.value
  if (!el || !renderer) return
  const w = el.clientWidth
  const h = el.clientHeight
  if (!w || !h) return
  renderer.setSize(w, h)
  camera.aspect = w / h
  // 依据宽高自适应镜头距离：星球直径约占屏宽 65%、屏高 ~55%
  const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
  const zByWidth = 1.55 / (tan * camera.aspect)
  const zByHeight = 1.85 / tan
  camera.position.z = Math.max(zByWidth, zByHeight)
  // 星球下沉幅度：竖屏更明显，宽屏收敛
  planetGroup.position.y = camera.aspect < 0.85 ? -0.35 : -0.15
  camera.updateProjectionMatrix()
  requestRender()
}

function onVisibilityChange() {
  cancelAnimationFrame(rafId)
  rafId = 0
  lastFrameTime = 0
  if (!document.hidden) requestRender()
}

onMounted(() => {
  renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  renderer.domElement.style.cursor = 'grab'
  containerRef.value.appendChild(renderer.domElement)

  buildScene()
  resize()
  resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(containerRef.value)

  const el = renderer.domElement
  el.addEventListener('pointerdown', onPointerDown)
  el.addEventListener('pointermove', onPointerMove)
  el.addEventListener('pointerup', onPointerUp)
  el.addEventListener('pointercancel', onPointerUp)
  document.addEventListener('visibilitychange', onVisibilityChange)

  requestRender()
})

onUnmounted(() => {
  cancelAnimationFrame(rafId)
  document.removeEventListener('visibilitychange', onVisibilityChange)
  resizeObserver?.disconnect()
  const el = renderer?.domElement
  if (el) {
    el.removeEventListener('pointerdown', onPointerDown)
    el.removeEventListener('pointermove', onPointerMove)
    el.removeEventListener('pointerup', onPointerUp)
    el.removeEventListener('pointercancel', onPointerUp)
  }
  scene?.traverse((obj) => {
    obj.geometry?.dispose?.()
    if (obj.material) {
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
      for (const m of mats) {
        m.map?.dispose?.()
        m.dispose?.()
      }
    }
  })
  renderer?.dispose()
  renderer = null
  plates = []
  tokens = []
  lotuses = []
})
</script>

<template>
  <div ref="containerRef" class="planet-sphere">
    <!-- 悬浮标签：跟随 3D 大陆投影定位，本身也可点击 -->
    <button
      v-for="(label, i) in labels"
      :key="label.key"
      type="button"
      class="planet-label"
      :class="{ 'planet-label--visible': label.visible, 'planet-label--active': label.active }"
      :style="{ transform: `translate(-50%, 0) translate(${label.x}px, ${label.y}px)` }"
      @click="emit('select', modules[i])"
    >
      <span class="planet-label__name">{{ modules[i].name }}</span>
      <span class="planet-label__desc">{{ modules[i].desc }}</span>
    </button>
  </div>
</template>

<style scoped>
.planet-sphere {
  position: absolute;
  inset: 0;
  overflow: hidden;
}
.planet-sphere :deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
  touch-action: none;
}

/* —— 大陆悬浮标签 —— */
.planet-label {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(250, 244, 228, 0.88);
  border: 1px solid rgba(122, 74, 43, 0.3);
  box-shadow: 0 4px 14px rgba(74, 44, 31, 0.18);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--dur-base) ease, border-color var(--dur-fast) ease,
    background var(--dur-fast) ease;
  white-space: nowrap;
}
.planet-label--visible {
  opacity: 1;
  pointer-events: auto;
}
.planet-label--active {
  border-color: var(--color-gold);
  background: #faf0da;
}
.planet-label__name {
  font-family: var(--font-serif);
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.14em;
  color: var(--color-brown-dark);
}
.planet-label__desc {
  font-size: 10px;
  letter-spacing: 0.08em;
  color: var(--color-ink-soft);
}
</style>

<script setup>
/**
 * 廉洁展馆 3D 场景（全屏沉浸式）
 * - 按需渲染：仅在拖动/悬停/切换时渲染，静止零功耗
 * - FPS 兜底：检测到连续慢帧自动降低 pixelRatio（适配国产无GPU终端）
 * - 交互：拖动环视（水平+俯仰），点击画框看详情，点击侧门换展厅
 */
import { onMounted, onUnmounted, ref, watch } from 'vue'
import * as THREE from 'three'
import { buildRoom, ROOM } from '@/utils/exhibition/roomBuilder'
import { initTextureQuality } from '@/utils/exhibition/textures'

const props = defineProps({
  rooms: { type: Array, required: true },
  activeRoomId: { type: String, required: true },
})
const emit = defineEmits(['select-panel', 'enter-room', 'webgl-fail'])

const containerRef = ref(null)

let renderer
let scene
let camera
let resizeObserver
let rafId = 0
let cameraZ = 5.6
let yaw = 0
let pitch = 0
let pickTargets = []
let hovered = null
const roomGroups = new Map()
const roomTargets = new Map()
const raycaster = new THREE.Raycaster()
const pointerNdc = new THREE.Vector2()
const lookTarget = new THREE.Vector3()
const drag = { active: false, pointerId: null, lastX: 0, lastY: 0, moved: 0 }

// FPS 兜底：连续慢帧自动降档
const DPR_LEVELS = [1.5, 1.25, 1]
let dprLevel = 0
let lastFrameAt = 0
let slowFrames = 0

const YAW_LIMIT = 1.05
const PITCH_LIMIT = 0.3
const EYE_HEIGHT = 2.0

function updateCamera() {
  camera.position.set(0, EYE_HEIGHT, cameraZ)
  const cosPitch = Math.cos(pitch)
  lookTarget.set(
    Math.sin(yaw) * cosPitch,
    EYE_HEIGHT + Math.sin(pitch),
    cameraZ - Math.cos(yaw) * cosPitch
  )
  camera.lookAt(lookTarget)
  camera.updateMatrixWorld()
}

function degradeQuality() {
  if (dprLevel >= DPR_LEVELS.length - 1) return
  dprLevel += 1
  renderer.setPixelRatio(DPR_LEVELS[dprLevel])
  console.info(`[廉洁展馆] 检测到慢帧，渲染精度降至 ${DPR_LEVELS[dprLevel]}`)
  resize()
}

function noteFrameTiming() {
  const now = performance.now()
  if (lastFrameAt) {
    const delta = now - lastFrameAt
    // 连续渲染期间的慢帧才计数（空闲按需渲染不受影响）
    if (delta > 55) {
      slowFrames += 1
      if (slowFrames >= 8) {
        slowFrames = 0
        degradeQuality()
      }
    } else {
      slowFrames = Math.max(0, slowFrames - 1)
    }
  }
  lastFrameAt = now
}

function requestRender() {
  if (!renderer || rafId) return
  rafId = requestAnimationFrame(() => {
    rafId = 0
    if (!renderer) return
    noteFrameTiming()
    updateCamera()
    renderer.render(scene, camera)
  })
}

function setHovered(target) {
  if (hovered === target) return
  if (hovered?.userData.material) hovered.userData.material.emissiveIntensity = 0
  hovered = target
  if (hovered?.userData.material) hovered.userData.material.emissiveIntensity = 0.4
  if (renderer) {
    renderer.domElement.style.cursor = drag.active ? 'grabbing' : hovered ? 'pointer' : 'grab'
  }
  requestRender()
}

function setActiveRoom(roomId) {
  for (const [id, group] of roomGroups) group.visible = id === roomId
  pickTargets = roomTargets.get(roomId) || []
  yaw = 0
  pitch = 0
  setHovered(null)
  requestRender()
}

function setNdc(event) {
  const rect = renderer.domElement.getBoundingClientRect()
  pointerNdc.set(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1
  )
}

function pick(event) {
  if (!renderer || !pickTargets.length) return null
  setNdc(event)
  raycaster.setFromCamera(pointerNdc, camera)
  const hits = raycaster.intersectObjects(pickTargets, false)
  return hits[0]?.object || null
}

function onPointerDown(event) {
  if (event.pointerType === 'mouse' && event.button !== 0) return
  drag.active = true
  drag.pointerId = event.pointerId
  drag.lastX = event.clientX
  drag.lastY = event.clientY
  drag.moved = 0
  renderer.domElement.setPointerCapture(event.pointerId)
  setHovered(null)
  renderer.domElement.style.cursor = 'grabbing'
}

function onPointerMove(event) {
  if (!drag.active) {
    if (event.pointerType === 'mouse') setHovered(pick(event))
    return
  }
  if (event.pointerId !== drag.pointerId) return
  const dx = event.clientX - drag.lastX
  const dy = event.clientY - drag.lastY
  drag.lastX = event.clientX
  drag.lastY = event.clientY
  drag.moved += Math.abs(dx) + Math.abs(dy)
  yaw = THREE.MathUtils.clamp(yaw - dx * 0.0028, -YAW_LIMIT, YAW_LIMIT)
  pitch = THREE.MathUtils.clamp(pitch - dy * 0.002, -PITCH_LIMIT, PITCH_LIMIT)
  requestRender()
}

function onPointerUp(event) {
  if (!drag.active || event.pointerId !== drag.pointerId) return
  const isClick = event.type === 'pointerup' && drag.moved < 8
  drag.active = false
  drag.pointerId = null
  if (renderer.domElement.hasPointerCapture(event.pointerId)) {
    renderer.domElement.releasePointerCapture(event.pointerId)
  }
  const target = isClick ? pick(event) : null
  if (target?.userData.kind === 'panel') emit('select-panel', target.userData.panel)
  if (target?.userData.kind === 'room') emit('enter-room', target.userData.targetRoomId)
  setHovered(event.pointerType === 'mouse' ? target : null)
}

function onPointerLeave() {
  if (!drag.active) setHovered(null)
}

function resize() {
  const element = containerRef.value
  if (!element || !renderer) return
  const width = element.clientWidth
  const height = element.clientHeight
  if (!width || !height) return
  renderer.setSize(width, height)
  camera.aspect = width / height
  // 依据视口宽高自适应机位：保证后墙画框整体入画，远近有上下限
  const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
  const fitWidth = ROOM.width / 2 / (tan * camera.aspect) - ROOM.depth / 2 + 0.4
  const fitHeight = 3.7 / tan - ROOM.depth / 2
  cameraZ = THREE.MathUtils.clamp(Math.max(fitWidth, fitHeight), 2.6, 8.5)
  camera.updateProjectionMatrix()
  requestRender()
}

watch(
  () => props.activeRoomId,
  (roomId) => {
    if (scene) setActiveRoom(roomId)
  }
)

onMounted(() => {
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, DPR_LEVELS[0]))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.05
    renderer.domElement.style.cursor = 'grab'
    renderer.domElement.setAttribute('aria-hidden', 'true')
    containerRef.value.appendChild(renderer.domElement)
    initTextureQuality(renderer)

    scene = new THREE.Scene()
    scene.background = new THREE.Color('#ded0b6')
    camera = new THREE.PerspectiveCamera(55, 1, 0.1, 80)
    scene.add(new THREE.AmbientLight(0xfff4df, 1.25))
    const keyLight = new THREE.DirectionalLight(0xffe5ba, 2)
    keyLight.position.set(-3, 7, 6)
    scene.add(keyLight)
    const fillLight = new THREE.DirectionalLight(0xe4eddf, 0.65)
    fillLight.position.set(4, 3, 1)
    scene.add(fillLight)

    for (const room of props.rooms) {
      const { group, targets } = buildRoom(room, props.rooms)
      roomGroups.set(room.id, group)
      roomTargets.set(room.id, targets)
      scene.add(group)
    }
    setActiveRoom(props.activeRoomId)
    resize()
    resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(containerRef.value)

    const canvas = renderer.domElement
    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerup', onPointerUp)
    canvas.addEventListener('pointercancel', onPointerUp)
    canvas.addEventListener('pointerleave', onPointerLeave)
  } catch (error) {
    console.warn('[廉洁展馆] 3D 场景初始化失败', error)
    emit('webgl-fail')
  }
})

onUnmounted(() => {
  cancelAnimationFrame(rafId)
  resizeObserver?.disconnect()
  const canvas = renderer?.domElement
  if (canvas) {
    canvas.removeEventListener('pointerdown', onPointerDown)
    canvas.removeEventListener('pointermove', onPointerMove)
    canvas.removeEventListener('pointerup', onPointerUp)
    canvas.removeEventListener('pointercancel', onPointerUp)
    canvas.removeEventListener('pointerleave', onPointerLeave)
  }
  const geometries = new Set()
  const materials = new Set()
  const textures = new Set()
  scene?.traverse((object) => {
    if (object.geometry) geometries.add(object.geometry)
    if (object.material) {
      const objectMaterials = Array.isArray(object.material) ? object.material : [object.material]
      objectMaterials.forEach((material) => {
        materials.add(material)
        if (material.map) textures.add(material.map)
      })
    }
  })
  textures.forEach((texture) => texture.dispose())
  materials.forEach((material) => material.dispose())
  geometries.forEach((geometry) => geometry.dispose())
  renderer?.dispose()
  canvas?.remove()
  roomGroups.clear()
  roomTargets.clear()
  pickTargets = []
})
</script>

<template>
  <div ref="containerRef" class="exhibition-scene" />
</template>

<style scoped>
.exhibition-scene {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: #ded0b6;
}

.exhibition-scene :deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
  touch-action: none;
}
</style>

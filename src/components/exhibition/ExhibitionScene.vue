<script setup>
import { onMounted, onUnmounted, ref, watch } from 'vue'
import * as THREE from 'three'

const props = defineProps({
  rooms: { type: Array, required: true },
  activeRoomId: { type: String, required: true },
})
const emit = defineEmits(['select-panel', 'enter-room'])

const containerRef = ref(null)
const sceneError = ref('')

let renderer
let scene
let camera
let resizeObserver
let rafId = 0
let yaw = 0
let cameraZ = 6.4
let pickTargets = []
let hovered = null
const roomGroups = new Map()
const roomTargets = new Map()
const raycaster = new THREE.Raycaster()
const pointerNdc = new THREE.Vector2()
const lookTarget = new THREE.Vector3()
const drag = { active: false, pointerId: null, lastX: 0, lastY: 0, moved: 0 }

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

function makeTexture(canvas) {
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 4)
  return texture
}

function createPanelTexture(panel, room, index) {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 640
  const ctx = canvas.getContext('2d')
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
  gradient.addColorStop(0, '#faf4e6')
  gradient.addColorStop(1, '#eee0c5')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.strokeStyle = '#b8863f'
  ctx.lineWidth = 7
  ctx.strokeRect(18, 18, 988, 604)
  ctx.lineWidth = 2
  ctx.strokeRect(32, 32, 960, 576)

  ctx.fillStyle = room.accent
  ctx.fillRect(58, 50, 238, 62)
  ctx.fillStyle = '#f4ead8'
  ctx.font = '30px "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(panel.category, 177, 82)
  ctx.fillStyle = room.accent
  ctx.fillRect(882, 46, 82, 82)
  ctx.fillStyle = '#f4ead8'
  ctx.font = '700 44px "SimSun", serif'
  ctx.fillText(room.seal, 923, 88)

  ctx.textAlign = 'left'
  ctx.fillStyle = '#4a2c1f'
  ctx.font = '700 62px "Noto Serif SC", "SimSun", serif'
  drawLines(ctx, panel.title, 62, 202, 880, 78, 2)
  ctx.fillStyle = '#57473a'
  ctx.font = '36px "Microsoft YaHei", sans-serif'
  drawLines(ctx, panel.summary, 62, 382, 880, 56, 2)

  ctx.strokeStyle = 'rgba(122, 74, 43, 0.35)'
  ctx.beginPath()
  ctx.moveTo(62, 530)
  ctx.lineTo(962, 530)
  ctx.stroke()
  ctx.fillStyle = room.accent
  ctx.font = '28px "Microsoft YaHei", sans-serif'
  ctx.fillText(`第 ${index + 1} 展板`, 62, 570)
  ctx.textAlign = 'right'
  ctx.fillText('点击展板 · 阅览详情', 962, 570)
  return makeTexture(canvas)
}

function createPlaqueTexture(room) {
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
  ctx.font = '700 76px "Noto Serif SC", "SimSun", serif'
  ctx.fillText(room.name, 512, 100)
  ctx.font = '30px "Noto Serif SC", "SimSun", serif'
  ctx.fillText(room.subtitle, 512, 184)
  return makeTexture(canvas)
}

function createDoorTexture(nextRoom) {
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
  ctx.font = '700 64px "Noto Serif SC", "SimSun", serif'
  ctx.fillText(nextRoom.name, 384, 220)
  ctx.fillStyle = '#57473a'
  ctx.font = '30px "Microsoft YaHei", sans-serif'
  ctx.fillText('点击进入 →', 384, 398)
  return makeTexture(canvas)
}

function createFloorTexture() {
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

function buildRoom(room) {
  const group = new THREE.Group()
  const targets = []
  const wallMaterial = new THREE.MeshStandardMaterial({ color: '#eadfc9', roughness: 0.95 })
  const trimMaterial = new THREE.MeshStandardMaterial({ color: '#5d3d29', roughness: 0.85 })
  const goldMaterial = new THREE.MeshStandardMaterial({ color: '#b8863f', roughness: 0.65 })

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(9, 9),
    new THREE.MeshStandardMaterial({ map: createFloorTexture(), roughness: 0.9 })
  )
  floor.rotation.x = -Math.PI / 2
  group.add(floor)

  const backWall = new THREE.Mesh(new THREE.BoxGeometry(9, 4.6, 0.12), wallMaterial)
  backWall.position.set(0, 2.3, -4.5)
  group.add(backWall)
  for (const side of [-1, 1]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.12, 4.6, 9), wallMaterial)
    wall.position.set(side * 4.5, 2.3, 0)
    group.add(wall)
    const baseboard = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.16, 9), trimMaterial)
    baseboard.position.set(side * 4.41, 0.08, 0)
    group.add(baseboard)
  }
  const backBaseboard = new THREE.Mesh(new THREE.BoxGeometry(9, 0.16, 0.1), trimMaterial)
  backBaseboard.position.set(0, 0.08, -4.4)
  group.add(backBaseboard)

  const plaque = new THREE.Mesh(
    new THREE.PlaneGeometry(4.4, 1.1),
    new THREE.MeshBasicMaterial({ map: createPlaqueTexture(room), toneMapped: false })
  )
  plaque.position.set(0, 3.68, -4.42)
  group.add(plaque)

  room.panels.forEach((panel, index) => {
    const panelGroup = new THREE.Group()
    panelGroup.position.set((index - 1) * 2.65, 2.05, -4.34)
    const frameMaterial = new THREE.MeshStandardMaterial({
      color: '#b8863f',
      emissive: room.accent,
      emissiveIntensity: 0,
      roughness: 0.6,
    })
    const frame = new THREE.Mesh(new THREE.BoxGeometry(2.43, 1.66, 0.09), frameMaterial)
    panelGroup.add(frame)
    const surface = new THREE.Mesh(
      new THREE.PlaneGeometry(2.27, 1.5),
      new THREE.MeshBasicMaterial({ map: createPanelTexture(panel, room, index), toneMapped: false })
    )
    surface.position.z = 0.051
    panelGroup.add(surface)
    const hitArea = new THREE.Mesh(
      new THREE.PlaneGeometry(2.58, 1.82),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    )
    hitArea.position.z = 0.075
    hitArea.userData = { kind: 'panel', panel, frame }
    panelGroup.add(hitArea)
    targets.push(hitArea)
    group.add(panelGroup)
  })

  const nextRoom = props.rooms.find((item) => item.id !== room.id) || room
  const doorGroup = new THREE.Group()
  doorGroup.position.set(4.4, 0, -2.35)
  doorGroup.rotation.y = -Math.PI / 2
  const doorFrameMaterial = new THREE.MeshStandardMaterial({
    color: '#b8863f',
    emissive: nextRoom.accent,
    emissiveIntensity: 0,
    roughness: 0.65,
  })
  const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(1.95, 3.05, 0.12), doorFrameMaterial)
  doorFrame.position.set(0, 1.52, 0)
  doorGroup.add(doorFrame)
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.72, 2.82, 0.1), trimMaterial)
  door.position.set(0, 1.43, 0.08)
  doorGroup.add(door)
  const doorSign = new THREE.Mesh(
    new THREE.PlaneGeometry(1.46, 0.92),
    new THREE.MeshBasicMaterial({ map: createDoorTexture(nextRoom), toneMapped: false })
  )
  doorSign.position.set(0, 1.82, 0.135)
  doorGroup.add(doorSign)
  const doorHandle = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), goldMaterial)
  doorHandle.position.set(0.58, 1.1, 0.18)
  doorGroup.add(doorHandle)
  const doorHit = new THREE.Mesh(
    new THREE.PlaneGeometry(2.05, 3.15),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
  )
  doorHit.position.set(0, 1.55, 0.2)
  doorHit.userData = { kind: 'room', targetRoomId: nextRoom.id, frame: doorFrame }
  doorGroup.add(doorHit)
  targets.push(doorHit)
  group.add(doorGroup)

  roomGroups.set(room.id, group)
  roomTargets.set(room.id, targets)
  scene.add(group)
}

function updateCamera() {
  camera.position.set(0, 2.05, cameraZ)
  lookTarget.set(Math.sin(yaw) * 6, 2.05, -4)
  camera.lookAt(lookTarget)
  camera.updateMatrixWorld()
}

function requestRender() {
  if (!renderer || rafId) return
  rafId = requestAnimationFrame(() => {
    rafId = 0
    if (!renderer) return
    updateCamera()
    renderer.render(scene, camera)
  })
}

function setHovered(target) {
  if (hovered === target) return
  if (hovered) hovered.userData.frame.material.emissiveIntensity = 0
  hovered = target
  if (hovered) hovered.userData.frame.material.emissiveIntensity = 0.4
  if (renderer) {
    renderer.domElement.style.cursor = drag.active ? 'grabbing' : hovered ? 'pointer' : 'grab'
  }
  requestRender()
}

function setActiveRoom(roomId) {
  for (const [id, group] of roomGroups) group.visible = id === roomId
  pickTargets = roomTargets.get(roomId) || []
  yaw = 0
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
  yaw = THREE.MathUtils.clamp(yaw - dx * 0.0025, -0.28, 0.28)
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
  const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
  cameraZ = Math.max(6.4, 5 / (tan * camera.aspect) - 4.3)
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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.05
    renderer.domElement.style.cursor = 'grab'
    renderer.domElement.setAttribute('aria-hidden', 'true')
    containerRef.value.appendChild(renderer.domElement)

    scene = new THREE.Scene()
    scene.background = new THREE.Color('#ded0b6')
    camera = new THREE.PerspectiveCamera(50, 1, 0.1, 80)
    scene.add(new THREE.AmbientLight(0xfff4df, 1.25))
    const keyLight = new THREE.DirectionalLight(0xffe5ba, 2)
    keyLight.position.set(-3, 7, 6)
    scene.add(keyLight)
    const fillLight = new THREE.DirectionalLight(0xe4eddf, 0.65)
    fillLight.position.set(4, 3, 1)
    scene.add(fillLight)
    props.rooms.forEach(buildRoom)
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
    sceneError.value = '当前设备未能加载 3D 展厅，可使用下方展板目录阅读。'
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
  <div ref="containerRef" class="exhibition-scene">
    <p v-if="sceneError" class="exhibition-scene__error">{{ sceneError }}</p>
  </div>
</template>

<style scoped>
.exhibition-scene {
  position: relative;
  width: 100%;
  height: clamp(300px, 72vw, 430px);
  overflow: hidden;
  border-radius: calc(var(--radius-lg) - 6px);
  background: #ded0b6;
}

.exhibition-scene :deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
  touch-action: pan-y;
}

.exhibition-scene__error {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  padding: var(--gap-lg);
  color: var(--color-brown-dark);
  text-align: center;
}
</style>

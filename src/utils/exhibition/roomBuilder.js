/**
 * 廉洁展馆 · 展厅构建器
 * 按展厅数据搭建 Three.js 展厅：地面/墙面/吊顶/牌匾/画框/通往邻厅的门，
 * 以及装饰元素：墙裙、红毯、展签、对联、前言板、顶部射灯。
 * 画框位置由 panel.layout 声明（见 data/exhibition/*），构建器只负责落位。
 */
import * as THREE from 'three'
import {
  createCalligraphyTexture,
  createCarpetTexture,
  createDecalTexture,
  createDoorTexture,
  createFloorTexture,
  createLabelTexture,
  createPanelTexture,
  createPlaqueTexture,
  createPrefaceTexture,
  createReliefTexture,
  createWallTexture,
} from './textures'

/** 房间常量：宽 9m、高 4.6m、深 9m（前侧开敞，相机位于开敞一侧） */
export const ROOM = { width: 9, height: 4.6, depth: 9 }

const FRAME_DEPTH = 0.09
const BACK_FACE = -ROOM.depth / 2 + 0.06
const SIDE_FACE = ROOM.width / 2 - 0.06

/** 画框在指定墙面上的落位（含朝向），z 前伸使画面浮出墙面 */
function placeOnWall(node, layout) {
  if (layout.wall === 'left') {
    node.position.set(-SIDE_FACE + 0.045, layout.y, layout.z)
    node.rotation.y = Math.PI / 2
  } else if (layout.wall === 'right') {
    node.position.set(SIDE_FACE - 0.045, layout.y, layout.z)
    node.rotation.y = -Math.PI / 2
  } else {
    node.position.set(layout.x, layout.y, BACK_FACE + 0.045)
  }
}

/** 平面元素在墙面上的落位（贴画/书法等无框内容） */
function placeFlatOnWall(node, layout, offset = 0.02) {
  if (layout.wall === 'left') {
    node.position.set(-SIDE_FACE + offset, layout.y, layout.z)
    node.rotation.y = Math.PI / 2
  } else if (layout.wall === 'right') {
    node.position.set(SIDE_FACE - offset, layout.y, layout.z)
    node.rotation.y = -Math.PI / 2
  } else {
    node.position.set(layout.x, layout.y, BACK_FACE + offset)
  }
}

/** 单个画框：木质底托 + 描金外框 + 画面 + 下方展签；书法类名言无框直接上墙 */
function createPanelNode(panel, room, index, targets) {
  const { w, h } = panel.layout
  const group = new THREE.Group()

  let hoverMaterial = null
  if (panel.kind === 'calligraphy') {
    // 名言书法：透明底竖排大字，无框无展签
    const surface = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({
        map: createCalligraphyTexture(panel, room),
        transparent: true,
        toneMapped: false,
      })
    )
    group.add(surface)
  } else if (panel.kind === 'scroll') {
    // 卷轴画框：细木框 + 左右卷轴杆 + 展签
    const frameMaterial = new THREE.MeshStandardMaterial({
      color: '#3d2a1c',
      emissive: room.accent,
      emissiveIntensity: 0,
      roughness: 0.7,
    })
    const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.1, h + 0.1, 0.06), frameMaterial)
    frame.position.z = 0.02
    group.add(frame)
    hoverMaterial = frameMaterial

    const surface = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ map: createPanelTexture(panel, room, index), toneMapped: false })
    )
    surface.position.z = 0.02 + 0.036
    group.add(surface)

    const rodMaterial = new THREE.MeshStandardMaterial({ color: '#2f2016', roughness: 0.6 })
    for (const side of [-1, 1]) {
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, h + 0.3, 10), rodMaterial)
      rod.position.set(side * (w / 2 + 0.07), 0, 0.03)
      group.add(rod)
    }

    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(0.56, 0.14),
      new THREE.MeshBasicMaterial({ map: createLabelTexture(panel.title), toneMapped: false })
    )
    label.position.set(0, -(h / 2 + 0.26), 0.035)
    group.add(label)
  } else {
    // 木质底托（比金框大一圈，形成双层框效果）
    const backPlate = new THREE.Mesh(
      new THREE.BoxGeometry(w + 0.24, h + 0.24, 0.06),
      new THREE.MeshStandardMaterial({ color: '#5d3d29', roughness: 0.8 })
    )
    backPlate.position.z = 0.015
    group.add(backPlate)

    const frameMaterial = new THREE.MeshStandardMaterial({
      color: '#b8863f',
      emissive: room.accent,
      emissiveIntensity: 0,
      roughness: 0.6,
    })
    const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.14, h + 0.14, FRAME_DEPTH), frameMaterial)
    frame.position.z = 0.03
    group.add(frame)
    hoverMaterial = frameMaterial

    const surface = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ map: createPanelTexture(panel, room, index), toneMapped: false })
    )
    surface.position.z = 0.03 + FRAME_DEPTH / 2 + 0.006
    group.add(surface)

    // 展签
    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(0.56, 0.14),
      new THREE.MeshBasicMaterial({ map: createLabelTexture(panel.title), toneMapped: false })
    )
    label.position.set(0, -(h / 2 + 0.26), 0.035)
    group.add(label)
  }

  const hitArea = new THREE.Mesh(
    new THREE.PlaneGeometry(w + 0.22, h + 0.22),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
  )
  hitArea.position.z = 0.1
  hitArea.userData = { kind: 'panel', panel, material: hoverMaterial }
  group.add(hitArea)
  targets.push(hitArea)

  placeOnWall(group, panel.layout)
  return group
}

/** 顶部射灯：吊顶筒灯 + 照向墙面的光柱（透明圆锥，无实时光照开销）
 * spec: { wall, at, ty } — at 为主墙 x 或侧墙 z，ty 为光柱落点高度 */
function createSpotNode(spec, color) {
  const group = new THREE.Group()
  // 灯位：墙面前方 0.9m、吊顶下沿
  const out = 0.9
  let fx
  let fz
  let tx
  let tz
  if (spec.wall === 'left') {
    fx = -SIDE_FACE + out
    fz = spec.at
    tx = -SIDE_FACE + 0.1
    tz = spec.at
  } else if (spec.wall === 'right') {
    fx = SIDE_FACE - out
    fz = spec.at
    tx = SIDE_FACE - 0.1
    tz = spec.at
  } else {
    fx = spec.at
    fz = BACK_FACE + out
    tx = spec.at
    tz = BACK_FACE + 0.1
  }
  const fy = ROOM.height - 0.12

  const fixture = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.09, 0.1, 12),
    new THREE.MeshStandardMaterial({ color: '#4a3a2c', roughness: 0.6 })
  )
  fixture.position.set(fx, ROOM.height - 0.06, fz)
  group.add(fixture)
  const bulb = new THREE.Mesh(
    new THREE.CircleGeometry(0.055, 12),
    new THREE.MeshBasicMaterial({ color: '#fff6e2' })
  )
  bulb.position.set(fx, ROOM.height - 0.115, fz)
  bulb.rotation.x = Math.PI / 2
  group.add(bulb)

  const from = new THREE.Vector3(fx, fy, fz)
  const to = new THREE.Vector3(tx, spec.ty, tz)
  const length = from.distanceTo(to)
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(0.52, length, 16, 1, true),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.045,
      depthWrite: false,
      side: THREE.FrontSide,
      blending: THREE.AdditiveBlending,
    })
  )
  cone.position.lerpVectors(from, to, 0.5)
  cone.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    from.clone().sub(to).normalize()
  )
  group.add(cone)
  return group
}

/** 射灯布点：主墙按列 3 个，左右侧墙各 1 个（取该墙画框中心） */
function planSpots(room) {
  const specs = []
  const backPanels = room.panels.filter((panel) => panel.layout.wall === 'back')
  const columns = [...new Set(backPanels.map((panel) => panel.layout.x))].sort((a, b) => a - b)
  const avgY =
    backPanels.reduce((sum, panel) => sum + panel.layout.y, 0) / (backPanels.length || 1)
  for (const x of columns.slice(0, 3)) {
    specs.push({ wall: 'back', at: x, ty: avgY })
  }
  for (const wall of ['left', 'right']) {
    const sidePanels = room.panels.filter((panel) => panel.layout.wall === wall)
    if (!sidePanels.length) continue
    const avgZ = sidePanels.reduce((sum, panel) => sum + panel.layout.z, 0) / sidePanels.length
    const avgSideY = sidePanels.reduce((sum, panel) => sum + panel.layout.y, 0) / sidePanels.length
    specs.push({ wall, at: avgZ, ty: avgSideY })
  }
  return specs
}

function createDoorNode(nextRoom, targets, layout = { wall: 'right', z: 1.9 }) {
  const group = new THREE.Group()
  const trimMaterial = new THREE.MeshStandardMaterial({ color: '#5d3d29', roughness: 0.85 })
  const goldMaterial = new THREE.MeshStandardMaterial({ color: '#b8863f', roughness: 0.65 })

  const frameMaterial = new THREE.MeshStandardMaterial({
    color: '#b8863f',
    emissive: nextRoom.accent,
    emissiveIntensity: 0,
    roughness: 0.65,
  })
  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.95, 3.05, 0.12), frameMaterial)
  frame.position.set(0, 1.52, 0)
  group.add(frame)

  const door = new THREE.Mesh(new THREE.BoxGeometry(1.72, 2.82, 0.1), trimMaterial)
  door.position.set(0, 1.43, 0.08)
  group.add(door)

  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(1.46, 0.92),
    new THREE.MeshBasicMaterial({ map: createDoorTexture(nextRoom), toneMapped: false })
  )
  sign.position.set(0, 1.82, 0.135)
  group.add(sign)

  const handle = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), goldMaterial)
  handle.position.set(0.58, 1.1, 0.18)
  group.add(handle)

  const hit = new THREE.Mesh(
    new THREE.PlaneGeometry(2.05, 3.15),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
  )
  hit.position.set(0, 1.55, 0.2)
  hit.userData = { kind: 'room', targetRoomId: nextRoom.id, material: frameMaterial }
  group.add(hit)
  targets.push(hit)

  if (layout.wall === 'left') {
    group.position.set(-(ROOM.width / 2 - 0.1), 0, layout.z)
    group.rotation.y = Math.PI / 2
  } else {
    group.position.set(ROOM.width / 2 - 0.1, 0, layout.z)
    group.rotation.y = -Math.PI / 2
  }
  return group
}

/** 墙裙 + 腰线：低护墙板避免大面积平涂 */
function createWainscot() {
  const group = new THREE.Group()
  const panelMaterial = new THREE.MeshStandardMaterial({ color: '#d3c3a2', roughness: 0.9 })
  const railMaterial = new THREE.MeshStandardMaterial({ color: '#8a6b45', roughness: 0.7 })
  const H = 0.42

  const back = new THREE.Mesh(new THREE.BoxGeometry(ROOM.width, H, 0.03), panelMaterial)
  back.position.set(0, H / 2, BACK_FACE + 0.015)
  group.add(back)
  const backRail = new THREE.Mesh(new THREE.BoxGeometry(ROOM.width, 0.06, 0.05), railMaterial)
  backRail.position.set(0, H + 0.03, BACK_FACE + 0.02)
  group.add(backRail)

  for (const side of [-1, 1]) {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.03, H, ROOM.depth), panelMaterial)
    panel.position.set(side * (SIDE_FACE - 0.015), H / 2, 0)
    group.add(panel)
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, ROOM.depth), railMaterial)
    rail.position.set(side * (SIDE_FACE - 0.02), H + 0.03, 0)
    group.add(rail)
  }
  return group
}

/** 中央红毯导引 */
function createCarpet() {
  const carpet = new THREE.Mesh(
    new THREE.PlaneGeometry(2.3, 7.6),
    new THREE.MeshStandardMaterial({ map: createCarpetTexture(), roughness: 0.95 })
  )
  carpet.rotation.x = -Math.PI / 2
  carpet.position.set(0, 0.01, -0.3)
  return carpet
}

/** 廉洁元素贴画：透明底贴片，直接贴于墙面空档处；relief 为圆形浮雕 */
function createDecalNode(decal, room) {
  if (decal.type === 'relief') return createReliefNode(decal)
  const node = new THREE.Mesh(
    new THREE.PlaneGeometry(decal.w, decal.h),
    new THREE.MeshBasicMaterial({
      map: createDecalTexture(decal, room),
      transparent: true,
      toneMapped: false,
    })
  )
  placeFlatOnWall(node, decal)
  return node
}

/** 圆形铜浮雕：铜盘 + 木环 + 托架，凸出墙面 */
function createReliefNode(decal) {
  const group = new THREE.Group()
  const r = decal.w / 2
  const disk = new THREE.Mesh(
    new THREE.CircleGeometry(r, 32),
    new THREE.MeshStandardMaterial({ map: createReliefTexture(), roughness: 0.55, metalness: 0.35 })
  )
  disk.position.z = 0.05
  group.add(disk)
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(r + 0.03, 0.045, 10, 32),
    new THREE.MeshStandardMaterial({ color: '#3d2a1c', roughness: 0.6 })
  )
  ring.position.z = 0.05
  group.add(ring)
  const bracket = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.1, 0.16),
    new THREE.MeshStandardMaterial({ color: '#3d2a1c', roughness: 0.7 })
  )
  bracket.position.set(0, -r - 0.02, 0.0)
  group.add(bracket)
  placeFlatOnWall(group, decal, 0.03)
  return group
}

/** 前言竖版：暗红落地竖版，位置由 room.prefaceLayout 声明（非交互） */
function createPrefaceNode(room) {
  const { w, h } = room.prefaceLayout
  const node = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: createPrefaceTexture(room), toneMapped: false })
  )
  placeFlatOnWall(node, room.prefaceLayout, 0.03)
  return node
}

/** 警示厅中央装置：悬挂青铜警钟（参考警示教育展馆的悬钟造景） */
function createBellNode() {
  const group = new THREE.Group()
  const bronze = new THREE.MeshStandardMaterial({
    color: '#7d5f38',
    metalness: 0.55,
    roughness: 0.5,
    side: THREE.DoubleSide,
  })
  // 钟体剖面：自钟口向上收窄
  const profile = [
    [0.02, 0], [0.52, 0.02], [0.58, 0.08], [0.5, 0.18], [0.44, 0.55],
    [0.4, 0.95], [0.32, 1.2], [0.14, 1.34], [0.06, 1.44],
  ].map(([x, y]) => new THREE.Vector2(x, y))
  const bell = new THREE.Mesh(new THREE.LatheGeometry(profile, 28), bronze)
  const rimY = 2.45
  bell.position.set(0, rimY, -1.3)
  group.add(bell)

  // 钟口内锤
  const clapper = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 12, 10),
    new THREE.MeshStandardMaterial({ color: '#4a3a2c', roughness: 0.6 })
  )
  clapper.position.set(0, rimY + 0.12, -1.3)
  group.add(clapper)

  // 悬链
  const bellTop = rimY + 1.44
  const chain = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, ROOM.height - bellTop, 8),
    clapper.material
  )
  chain.position.set(0, (ROOM.height + bellTop) / 2, -1.3)
  group.add(chain)
  return group
}

/** 搭建整间展厅，返回 { group, targets }；targets 供射线拾取 */
export function buildRoom(room, rooms) {
  const group = new THREE.Group()
  const targets = []
  const wallMaterial = new THREE.MeshStandardMaterial({
    map: createWallTexture(),
    roughness: 0.95,
  })
  const trimMaterial = new THREE.MeshStandardMaterial({ color: '#5d3d29', roughness: 0.85 })

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM.width, ROOM.depth),
    new THREE.MeshStandardMaterial({ map: createFloorTexture(), roughness: 0.9 })
  )
  floor.rotation.x = -Math.PI / 2
  group.add(floor)
  group.add(createCarpet())

  // 吊顶 + 回形灯带（参考展馆顶灯造型，纯几何体低成本实现）
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM.width, ROOM.depth),
    new THREE.MeshStandardMaterial({ color: '#f2ead9', roughness: 0.98 })
  )
  ceiling.rotation.x = Math.PI / 2
  ceiling.position.y = ROOM.height
  group.add(ceiling)
  const lightStrip = new THREE.Mesh(
    new THREE.BoxGeometry(ROOM.width * 0.62, 0.04, ROOM.depth * 0.62),
    new THREE.MeshBasicMaterial({ color: '#fff6e2' })
  )
  lightStrip.position.y = ROOM.height - 0.08
  group.add(lightStrip)

  const backWall = new THREE.Mesh(
    new THREE.BoxGeometry(ROOM.width, ROOM.height, 0.12),
    wallMaterial
  )
  backWall.position.set(0, ROOM.height / 2, -ROOM.depth / 2)
  group.add(backWall)

  for (const side of [-1, 1]) {
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, ROOM.height, ROOM.depth),
      wallMaterial
    )
    wall.position.set((side * ROOM.width) / 2, ROOM.height / 2, 0)
    group.add(wall)
    const baseboard = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.16, ROOM.depth),
      trimMaterial
    )
    baseboard.position.set((side * ROOM.width) / 2 - side * 0.09, 0.08, 0)
    group.add(baseboard)
    const crown = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, ROOM.depth), trimMaterial)
    crown.position.set((side * ROOM.width) / 2 - side * 0.09, ROOM.height - 0.06, 0)
    group.add(crown)
  }

  const backBaseboard = new THREE.Mesh(
    new THREE.BoxGeometry(ROOM.width, 0.16, 0.1),
    trimMaterial
  )
  backBaseboard.position.set(0, 0.08, -ROOM.depth / 2 + 0.09)
  group.add(backBaseboard)
  const backCrown = new THREE.Mesh(new THREE.BoxGeometry(ROOM.width, 0.12, 0.1), trimMaterial)
  backCrown.position.set(0, ROOM.height - 0.06, -ROOM.depth / 2 + 0.09)
  group.add(backCrown)

  group.add(createWainscot())

  const plaque = new THREE.Mesh(
    new THREE.PlaneGeometry(3.6, 0.9),
    new THREE.MeshBasicMaterial({ map: createPlaqueTexture(room), toneMapped: false })
  )
  plaque.position.set(0, 3.95, BACK_FACE + 0.02)
  group.add(plaque)
  group.add(createPrefaceNode(room))
  room.decals?.forEach((decal) => group.add(createDecalNode(decal, room)))
  if (room.centerpiece === 'bell') group.add(createBellNode())

  room.panels.forEach((panel, index) => {
    group.add(createPanelNode(panel, room, index, targets))
  })
  planSpots(room).forEach((spec) => {
    group.add(createSpotNode(spec, '#ffedc8'))
  })

  const nextRoom = rooms.find((item) => item.id !== room.id) || room
  group.add(createDoorNode(nextRoom, targets, room.doorLayout))

  return { group, targets }
}

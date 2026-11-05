import {
  ARM_BASE,
  type Box,
  type CloudPoint,
  FIXTURES,
  iso,
  PATH,
  PATH_LENGTH,
  poseAt,
  type Pose,
  ROOM,
  SCAN_RANGE,
  UNIT,
  VIEW,
  WORK_ZONE,
} from './storeModel'

/* ================= timeline ================= */

export const CYCLE = 19
const T_SCAN = 11.5
const T_RECON = 15

export interface SceneState {
  t: number
  stage: 0 | 1 | 2
  scanS: number
  pose: Pose
  gait: number
  moving: boolean
  recon: number
  sim: number
  fade: number
  progress: number
}

const easeInOut = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2)
const clamp01 = (x: number) => Math.max(0, Math.min(1, x))

export function sceneAt(time: number): SceneState {
  const t = ((time % CYCLE) + CYCLE) % CYCLE
  const scanP = clamp01(t / T_SCAN)
  // 앞뒤만 살짝 감속하고 중간은 거의 일정한 속도
  const eased = scanP < 0.08 ? easeInOut(scanP / 0.16) * 0.08 : scanP > 0.92 ? 0.92 + easeInOut((scanP - 0.84) / 0.16 - 0.5) * 0.08 : scanP
  const scanS = clamp01(eased) * PATH_LENGTH
  const stage: SceneState['stage'] = t < T_SCAN ? 0 : t < T_RECON ? 1 : 2
  return {
    t,
    stage,
    scanS,
    pose: poseAt(scanS),
    gait: scanS * 7.5,
    moving: t < T_SCAN,
    recon: clamp01((t - T_SCAN) / (T_RECON - T_SCAN)),
    sim: clamp01((t - T_RECON) / (CYCLE - T_RECON - 0.8)),
    fade: t > CYCLE - 0.7 ? clamp01((CYCLE - t) / 0.7) : 1,
    progress: t / CYCLE,
  }
}

/** 정지 화면용 상태 (reduced motion, 또는 결과만 보여줄 때) */
export function finalScene(): SceneState {
  const s = sceneAt(T_RECON + 2.4)
  return { ...s, fade: 1 }
}

/* ================= canvas helpers ================= */

export interface Viewport {
  k: number
  dpr: number
}

/** 장면 범위를 캔버스 크기에 맞춰 넣고, zoom/focus가 있으면 그 지점을 중심으로 확대한다. */
export function fitScene(
  ctx: CanvasRenderingContext2D,
  cssW: number,
  cssH: number,
  dpr: number,
  zoom = 1,
  focus?: { x: number; y: number },
): Viewport {
  const base = Math.min(cssW / VIEW.w, cssH / VIEW.h)
  const k = base * zoom
  const cx = focus ? iso(focus.x, focus.y, 0) : [VIEW.x + VIEW.w / 2, VIEW.y + VIEW.h / 2]
  const ox = cssW / 2 - cx[0] * k
  const oy = cssH / 2 - cx[1] * k
  ctx.setTransform(dpr * k, 0, 0, dpr * k, dpr * ox, dpr * oy)
  return { k, dpr }
}

type P3 = [number, number, number]

function poly(ctx: CanvasRenderingContext2D, pts: P3[]) {
  ctx.beginPath()
  pts.forEach(([x, y, z], i) => {
    const [sx, sy] = iso(x, y, z)
    if (i) ctx.lineTo(sx, sy)
    else ctx.moveTo(sx, sy)
  })
  ctx.closePath()
}

function floorEllipse(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  const [sx, sy] = iso(x, y, 0)
  ctx.beginPath()
  ctx.ellipse(sx, sy, r * 1.2247 * UNIT, r * 0.7071 * UNIT, 0, 0, Math.PI * 2)
}

function shade(hex: string, f: number) {
  const n = parseInt(hex.slice(1), 16)
  const r = Math.min(255, Math.round(((n >> 16) & 255) * f))
  const g = Math.min(255, Math.round(((n >> 8) & 255) * f))
  const bl = Math.min(255, Math.round((n & 255) * f))
  return `rgb(${r},${g},${bl})`
}

/* ================= REAL (concept illustration) ================= */

const BASE: Record<Box['kind'], string> = {
  shelf: '#3b414b',
  gondola: '#3f4650',
  fridge: '#2e3a44',
  counter: '#5e4a3a',
  table: '#7d838d',
  item: '#999999',
  leg: '#4a4f57',
  pos: '#23272d',
}

const PRODUCT_COLORS = ['#a56f4e', '#6f8eae', '#b9a271', '#7d9a77', '#9c6878', '#c6c0b3', '#5f7f8f', '#b08a5e']

/** 선반 정면에 놓일 상품 블록 (고정 시드) */
const PRODUCTS = (() => {
  let seed = 7
  const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  const list: { fx: Box; x0: number; x1: number; z0: number; z1: number; c: string }[] = []
  for (const f of FIXTURES) {
    if (f.kind !== 'shelf' && f.kind !== 'gondola') continue
    for (let lv = 0.06; lv < f.z1 - 0.3; lv += 0.42) {
      let x = f.x0 + 0.05
      while (x < f.x1 - 0.12) {
        const w = 0.1 + r() * 0.22
        const h = 0.14 + r() * 0.2
        if (r() > 0.12) list.push({ fx: f, x0: x, x1: Math.min(x + w, f.x1 - 0.04), z0: lv + 0.03, z1: lv + 0.03 + h, c: PRODUCT_COLORS[Math.floor(r() * PRODUCT_COLORS.length)] })
        x += w + 0.03
      }
    }
  }
  return list
})()

function depthKey(f: Box) {
  return (f.x0 + f.x1) / 2 + (f.y0 + f.y1) / 2 + f.z0 * 100
}
const SORTED = [...FIXTURES].sort((a, c) => depthKey(a) - depthKey(c))

function drawBoxReal(ctx: CanvasRenderingContext2D, f: Box) {
  const c = f.color ?? BASE[f.kind]
  const { x0, y0, x1, y1, z0, z1 } = f
  // +x face
  poly(ctx, [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]])
  ctx.fillStyle = shade(c, 0.72)
  ctx.fill()
  // +y face (front)
  poly(ctx, [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]])
  ctx.fillStyle = shade(c, 0.92)
  ctx.fill()
  // top
  poly(ctx, [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]])
  ctx.fillStyle = shade(c, 1.25)
  ctx.fill()

  if (f.kind === 'shelf' || f.kind === 'gondola') {
    // 상품
    for (const p of PRODUCTS) {
      if (p.fx !== f) continue
      poly(ctx, [[p.x0, y1 + 0.001, p.z0], [p.x1, y1 + 0.001, p.z0], [p.x1, y1 + 0.001, p.z1], [p.x0, y1 + 0.001, p.z1]])
      ctx.fillStyle = shade(p.c, 0.78)
      ctx.fill()
    }
    // 선반 단
    ctx.strokeStyle = shade(c, 1.6)
    ctx.lineWidth = 1.1
    for (let lv = 0.06; lv < z1; lv += 0.42) {
      const a = iso(x0, y1, lv)
      const d = iso(x1, y1, lv)
      ctx.beginPath()
      ctx.moveTo(a[0], a[1])
      ctx.lineTo(d[0], d[1])
      ctx.stroke()
    }
  }
  if (f.kind === 'fridge') {
    // 유리문 3칸과 내부 조명
    const n = 3
    for (let i = 0; i < n; i++) {
      const ya = y0 + ((y1 - y0) * i) / n + 0.04
      const yb = y0 + ((y1 - y0) * (i + 1)) / n - 0.04
      poly(ctx, [[x1 + 0.001, ya, 0.15], [x1 + 0.001, yb, 0.15], [x1 + 0.001, yb, z1 - 0.12], [x1 + 0.001, ya, z1 - 0.12]])
      ctx.fillStyle = 'rgba(150, 215, 235, 0.16)'
      ctx.fill()
      ctx.strokeStyle = 'rgba(190, 230, 245, 0.35)'
      ctx.lineWidth = 0.8
      ctx.stroke()
      for (let lv = 0.4; lv < z1 - 0.2; lv += 0.38) {
        for (let k = 0; k < 4; k++) {
          const yy = ya + ((yb - ya) * (k + 0.5)) / 4
          const [sx, sy] = iso(x1, yy, lv + 0.08)
          ctx.fillStyle = PRODUCT_COLORS[(i * 4 + k + Math.round(lv * 10)) % PRODUCT_COLORS.length]
          ctx.globalAlpha = 0.55
          ctx.fillRect(sx - 2.2, sy - 6, 4.4, 6)
          ctx.globalAlpha = 1
        }
      }
    }
  }
  if (f.kind === 'counter') {
    poly(ctx, [[x0, y1 + 0.001, z1 - 0.06], [x1, y1 + 0.001, z1 - 0.06], [x1, y1 + 0.001, z1], [x0, y1 + 0.001, z1]])
    ctx.fillStyle = shade(c, 1.45)
    ctx.fill()
  }
  if (f.kind === 'pos') {
    poly(ctx, [[x0 + 0.03, y1 + 0.001, z0 + 0.1], [x1 - 0.03, y1 + 0.001, z0 + 0.1], [x1 - 0.03, y1 + 0.001, z1 - 0.03], [x0 + 0.03, y1 + 0.001, z1 - 0.03]])
    ctx.fillStyle = 'rgba(120, 200, 230, 0.55)'
    ctx.fill()
  }
}

function drawRoomReal(ctx: CanvasRenderingContext2D) {
  const { w, d, h } = ROOM
  // floor
  poly(ctx, [[0, 0, 0], [w, 0, 0], [w, d, 0], [0, d, 0]])
  const [gx0, gy0] = iso(0, 0, 0)
  const [gx1, gy1] = iso(w, d, 0)
  const g = ctx.createLinearGradient(gx0, gy0, gx1, gy1)
  g.addColorStop(0, '#2b2f36')
  g.addColorStop(1, '#22262c')
  ctx.fillStyle = g
  ctx.fill()
  // tiles
  ctx.strokeStyle = 'rgba(255,255,255,0.045)'
  ctx.lineWidth = 0.7
  ctx.beginPath()
  for (let x = 0.6; x < w; x += 0.6) {
    const a = iso(x, 0, 0), c = iso(x, d, 0)
    ctx.moveTo(a[0], a[1]); ctx.lineTo(c[0], c[1])
  }
  for (let y = 0.6; y < d; y += 0.6) {
    const a = iso(0, y, 0), c = iso(w, y, 0)
    ctx.moveTo(a[0], a[1]); ctx.lineTo(c[0], c[1])
  }
  ctx.stroke()
  // walls
  poly(ctx, [[0, 0, 0], [0, d, 0], [0, d, h], [0, 0, h]])
  ctx.fillStyle = '#1d2026'
  ctx.fill()
  poly(ctx, [[0, 0, 0], [w, 0, 0], [w, 0, h], [0, 0, h]])
  ctx.fillStyle = '#23262d'
  ctx.fill()
  // skirting + top edge
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'
  ctx.lineWidth = 1
  poly(ctx, [[0, d, h], [0, 0, h], [w, 0, h]])
  ctx.stroke()
  // ceiling light pools on floor
  for (const [lx, ly] of [[2.2, 1.4], [5.2, 1.4], [2.6, 4.0], [6.2, 3.2], [6.9, 1.7]] as const) {
    const [sx, sy] = iso(lx, ly, 0)
    ctx.save()
    ctx.translate(sx, sy)
    ctx.scale(1, 0.577)
    const rg = ctx.createRadialGradient(0, 0, 0, 0, 0, 1.6 * UNIT)
    rg.addColorStop(0, 'rgba(255, 236, 205, 0.10)')
    rg.addColorStop(1, 'rgba(255, 236, 205, 0)')
    ctx.fillStyle = rg
    ctx.beginPath()
    ctx.arc(0, 0, 1.6 * UNIT, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
  // entrance threshold
  const { x0: dx0, x1: dx1 } = ROOM.door
  poly(ctx, [[dx0, d - 0.04, 0], [dx1, d - 0.04, 0], [dx1, d + 0.12, 0], [dx0, d + 0.12, 0]])
  ctx.fillStyle = 'rgba(200, 210, 222, 0.22)'
  ctx.fill()
  // front wall stubs (cutaway)
  ctx.strokeStyle = 'rgba(200,210,222,0.18)'
  ctx.lineWidth = 1
  poly(ctx, [[0, d, 0], [dx0, d, 0]])
  ctx.stroke()
  poly(ctx, [[dx1, d, 0], [w, d, 0], [w, 0, 0]])
  ctx.stroke()
}

/* ---------- Go2 (단순화한 일러스트, 실제 형상 복제 아님) ---------- */

function robotLocal(p: Pose, lx: number, ly: number, z: number): P3 {
  const c = Math.cos(p.heading)
  const s = Math.sin(p.heading)
  return [p.x + lx * c - ly * s, p.y + lx * s + ly * c, z]
}

export function drawRobot(ctx: CanvasRenderingContext2D, p: Pose, gait: number, mode: 'real' | 'ghost', vp: Viewport) {
  const L = 0.36
  const Wd = 0.15
  const zb = 0.27
  const zt = 0.4
  const corner = (sx: number, sy: number, z: number) => robotLocal(p, sx * L, sy * Wd, z)
  const lw = 1.4 / vp.k

  // legs: hip → knee → foot
  const legs: [number, number, number][] = [
    [0.78, 1, 0],
    [0.78, -1, Math.PI],
    [-0.78, 1, Math.PI],
    [-0.78, -1, 0],
  ]
  const drawLegs = (front: boolean) => {
    for (const [fx, fy, ph] of legs) {
      // 화면 앞쪽(+x+y)에 있는 다리는 몸통 뒤에 그린다
      const hip = robotLocal(p, fx * L, fy * Wd, zb + 0.02)
      const isFront = hip[0] + hip[1] > p.x + p.y
      if (isFront !== front) continue
      const swing = Math.sin(gait + ph)
      const lift = Math.max(0, Math.cos(gait + ph)) * 0.05
      const knee = robotLocal(p, fx * L - 0.07 + swing * 0.03, fy * (Wd + 0.035), 0.15 + lift)
      const foot = robotLocal(p, fx * L + swing * 0.07, fy * (Wd + 0.035), lift)
      const a = iso(...hip), k = iso(...knee), f = iso(...foot)
      ctx.beginPath()
      ctx.moveTo(a[0], a[1])
      ctx.lineTo(k[0], k[1])
      ctx.lineTo(f[0], f[1])
      if (mode === 'real') {
        ctx.strokeStyle = front ? '#b8bec7' : '#8d939c'
        ctx.lineWidth = 3.2
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.stroke()
        ctx.fillStyle = '#1b1e22'
        ctx.beginPath()
        ctx.arc(f[0], f[1], 1.9, 0, Math.PI * 2)
        ctx.fill()
      } else {
        ctx.strokeStyle = 'rgba(159, 230, 247, 0.85)'
        ctx.lineWidth = lw
        ctx.stroke()
      }
    }
  }

  // shadow
  if (mode === 'real') {
    const [sx, sy] = iso(p.x, p.y, 0)
    ctx.save()
    ctx.translate(sx, sy)
    ctx.scale(1, 0.55)
    ctx.fillStyle = 'rgba(0,0,0,0.32)'
    ctx.beginPath()
    ctx.arc(0, 0, 0.42 * UNIT, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  drawLegs(false)

  const top: P3[] = [corner(1, 1, zt), corner(1, -1, zt), corner(-1, -1, zt), corner(-1, 1, zt)]
  const faces: { pts: P3[]; nx: number; ny: number; f: number }[] = []
  const sides: [number, number, number, number][] = [
    [1, 1, 1, -1],
    [1, -1, -1, -1],
    [-1, -1, -1, 1],
    [-1, 1, 1, 1],
  ]
  for (const [ax, ay, bx, by] of sides) {
    const pa = corner(ax, ay, zb), pb = corner(bx, by, zb)
    const mx = (ax + bx) / 2, my = (ay + by) / 2
    const n = robotLocal({ ...p, x: 0, y: 0 }, mx, my, 0)
    faces.push({ pts: [pa, pb, corner(bx, by, zt), corner(ax, ay, zt)], nx: n[0], ny: n[1], f: mx !== 0 ? 0.78 : 0.9 })
  }
  for (const face of faces) {
    if (face.nx + face.ny <= 0) continue
    poly(ctx, face.pts)
    if (mode === 'real') {
      ctx.fillStyle = shade('#c3c8cf', face.f)
      ctx.fill()
    } else {
      ctx.strokeStyle = 'rgba(159, 230, 247, 0.9)'
      ctx.lineWidth = lw
      ctx.stroke()
    }
  }
  poly(ctx, top)
  if (mode === 'real') {
    ctx.fillStyle = '#d6dae0'
    ctx.fill()
    // 등 라인
    const a = iso(...robotLocal(p, -0.25, 0, zt + 0.001)), c = iso(...robotLocal(p, 0.22, 0, zt + 0.001))
    ctx.strokeStyle = '#8f959e'
    ctx.lineWidth = 1.2
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(c[0], c[1]); ctx.stroke()
  } else {
    ctx.strokeStyle = 'rgba(159, 230, 247, 0.9)'
    ctx.lineWidth = lw
    ctx.stroke()
  }

  // head + 센서 (전면 카메라, 아래쪽 LiDAR 돔)
  const head = iso(...robotLocal(p, L + 0.05, 0, 0.33))
  const dome = iso(...robotLocal(p, L + 0.07, 0, 0.27))
  if (mode === 'real') {
    ctx.fillStyle = '#aeb4bc'
    ctx.beginPath(); ctx.arc(head[0], head[1], 4.4, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#121418'
    ctx.beginPath(); ctx.arc(dome[0], dome[1] + 1, 3.6, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#7fd8f2'
    ctx.beginPath(); ctx.arc(head[0], head[1] - 0.5, 1.3, 0, Math.PI * 2); ctx.fill()
  } else {
    ctx.strokeStyle = 'rgba(159, 230, 247, 0.9)'
    ctx.lineWidth = lw
    ctx.beginPath(); ctx.arc(head[0], head[1], 3.6, 0, Math.PI * 2); ctx.stroke()
  }

  drawLegs(true)
}

function drawScanFx(ctx: CanvasRenderingContext2D, st: SceneState) {
  const p = st.pose
  // 카메라 시야 (바닥 투영)
  const apex = robotLocal(p, 0.42, 0, 0)
  const len = 2.1
  const spread = 0.62
  const l = robotLocal(p, 0.42 + len, len * Math.tan(spread), 0)
  const r = robotLocal(p, 0.42 + len, -len * Math.tan(spread), 0)
  poly(ctx, [apex, l, r])
  const a = iso(...apex)
  const m = iso(...robotLocal(p, 0.42 + len, 0, 0))
  const g = ctx.createLinearGradient(a[0], a[1], m[0], m[1])
  g.addColorStop(0, 'rgba(95, 212, 240, 0.30)')
  g.addColorStop(1, 'rgba(95, 212, 240, 0)')
  ctx.fillStyle = g
  ctx.fill()

  // LiDAR 링 펄스
  for (let i = 0; i < 2; i++) {
    const ph = ((st.t * 0.9 + i * 0.5) % 1)
    floorEllipse(ctx, p.x, p.y, 0.3 + ph * SCAN_RANGE)
    ctx.strokeStyle = `rgba(95, 212, 240, ${0.5 * (1 - ph)})`
    ctx.lineWidth = 1.1
    ctx.stroke()
  }
  floorEllipse(ctx, p.x, p.y, SCAN_RANGE)
  ctx.setLineDash([3, 5])
  ctx.strokeStyle = 'rgba(95, 212, 240, 0.22)'
  ctx.lineWidth = 0.9
  ctx.stroke()
  ctx.setLineDash([])
}

function drawTrail(ctx: CanvasRenderingContext2D, st: SceneState, color: string, future = true) {
  ctx.lineWidth = 1.2
  ctx.lineCap = 'round'
  // 지나온 길
  ctx.beginPath()
  const step = 0.15
  for (let s = 0; s <= st.scanS; s += step) {
    const q = poseAt(s)
    const [x, y] = iso(q.x, q.y, 0.01)
    if (s === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.strokeStyle = color
  ctx.setLineDash([2, 4])
  ctx.stroke()
  if (future) {
    ctx.beginPath()
    for (let s = st.scanS; s <= PATH_LENGTH; s += step) {
      const q = poseAt(s)
      const [x, y] = iso(q.x, q.y, 0.01)
      if (s === st.scanS) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.strokeStyle = 'rgba(160, 190, 220, 0.16)'
    ctx.stroke()
  }
  ctx.setLineDash([])
}

export function drawReal(ctx: CanvasRenderingContext2D, st: SceneState, vp: Viewport, opts: { scanFx?: boolean } = {}) {
  drawRoomReal(ctx)
  if (opts.scanFx !== false && st.stage === 0) {
    drawTrail(ctx, st, 'rgba(95, 212, 240, 0.55)')
    drawScanFx(ctx, st)
  }
  const robotKey = st.pose.x * 2 + st.pose.y * 2
  let drawn = false
  for (const f of SORTED) {
    const key = (f.x0 + f.x1) + (f.y0 + f.y1) + f.z0 * 200
    if (!drawn && robotKey < key) {
      drawRobot(ctx, st.pose, st.moving ? st.gait : 0, 'real', vp)
      drawn = true
    }
    drawBoxReal(ctx, f)
  }
  if (!drawn) drawRobot(ctx, st.pose, st.moving ? st.gait : 0, 'real', vp)
}

/* ================= DIGITAL (point cloud twin) ================= */

const BANDS = 7
const BAND_COLORS = Array.from({ length: BANDS }, (_, i) => {
  const t = i / (BANDS - 1)
  // 낮은 곳: 짙은 파랑 → 중간: 시안 → 높은 곳: 흰색
  const c0 = [52, 98, 190], c1 = [95, 212, 240], c2 = [236, 246, 252]
  const mix = (a: number[], b2: number[], u: number) => a.map((v, j) => Math.round(v + (b2[j] - v) * u))
  const c = t < 0.55 ? mix(c0, c1, t / 0.55) : mix(c1, c2, (t - 0.55) / 0.45)
  return `rgb(${c[0]},${c[1]},${c[2]})`
})

export interface PreparedCloud {
  bands: CloudPoint[][]
}

export function prepareCloud(points: CloudPoint[]): PreparedCloud {
  const bands: CloudPoint[][] = Array.from({ length: BANDS }, () => [])
  for (const p of points) {
    if (!Number.isFinite(p.reveal)) continue
    const i = Math.min(BANDS - 1, Math.floor((p.z / ROOM.h) * BANDS * 1.25))
    bands[i].push(p)
  }
  return { bands }
}

function boxEdges(f: Box): [P3, P3][] {
  const { x0, y0, x1, y1, z0, z1 } = f
  const c: P3[] = [
    [x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0],
    [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1],
  ]
  const e = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]]
  return e.map(([a, b2]) => [c[a], c[b2]])
}

export interface TwinOptions {
  path?: boolean
  zones?: boolean
  obstacles?: boolean
  labels?: boolean
  /** true면 시간과 상관없이 오버레이를 모두 표시 */
  forceOverlays?: boolean
}

export function drawTwin(ctx: CanvasRenderingContext2D, st: SceneState, cloud: PreparedCloud, vp: Viewport, opts: TwinOptions = {}) {
  const { w, d, h } = ROOM
  const px = 1 / vp.k
  ctx.globalAlpha = st.fade

  // 바닥 그리드와 방 윤곽
  ctx.strokeStyle = 'rgba(95, 212, 240, 0.06)'
  ctx.lineWidth = px
  ctx.beginPath()
  for (let x = 0; x <= w + 0.001; x += 0.5) {
    const a = iso(x, 0, 0), c = iso(x, d, 0)
    ctx.moveTo(a[0], a[1]); ctx.lineTo(c[0], c[1])
  }
  for (let y = 0; y <= d + 0.001; y += 0.5) {
    const a = iso(0, y, 0), c = iso(w, y, 0)
    ctx.moveTo(a[0], a[1]); ctx.lineTo(c[0], c[1])
  }
  ctx.stroke()
  ctx.strokeStyle = 'rgba(95, 212, 240, 0.2)'
  poly(ctx, [[0, d, 0], [0, 0, 0], [w, 0, 0]])
  ctx.stroke()
  poly(ctx, [[0, d, h], [0, 0, h], [w, 0, h]])
  ctx.stroke()

  // 점
  const dot = 1.3
  for (let bi = 0; bi < cloud.bands.length; bi++) {
    ctx.fillStyle = BAND_COLORS[bi]
    for (const p of cloud.bands[bi]) {
      if (p.reveal > st.scanS) continue
      ctx.fillRect(p.px - dot / 2, p.py - dot / 2, dot, dot)
    }
  }
  // 방금 관측된 점은 밝게
  if (st.stage === 0) {
    ctx.fillStyle = '#ffffff'
    for (const band of cloud.bands) {
      for (const p of band) {
        const age = st.scanS - p.reveal
        if (age >= 0 && age < 0.45) ctx.fillRect(p.px - dot, p.py - dot, dot * 2, dot * 2)
      }
    }
  }

  const overlays = opts.forceOverlays ? 1 : st.recon

  // 재구성: 와이어프레임
  if (overlays > 0) {
    ctx.strokeStyle = `rgba(159, 230, 247, ${0.55 * overlays})`
    ctx.lineWidth = px
    ctx.beginPath()
    for (const f of FIXTURES) {
      if (f.kind === 'leg') continue
      for (const [a, c] of boxEdges(f)) {
        const A = iso(...a), B = iso(...c)
        ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1])
      }
    }
    ctx.stroke()
  }

  const simA = opts.forceOverlays ? 1 : st.sim

  if (opts.obstacles && simA > 0) {
    ctx.fillStyle = `rgba(231, 180, 92, ${0.09 * simA})`
    ctx.strokeStyle = `rgba(231, 180, 92, ${0.45 * simA})`
    ctx.lineWidth = px
    ctx.setLineDash([3 * px, 3 * px])
    for (const f of FIXTURES) {
      if (f.z0 > 0 || f.kind === 'leg') continue
      const m = 0.22
      poly(ctx, [[f.x0 - m, f.y0 - m, 0], [f.x1 + m, f.y0 - m, 0], [f.x1 + m, f.y1 + m, 0], [f.x0 - m, f.y1 + m, 0]])
      ctx.fill()
      ctx.stroke()
    }
    ctx.setLineDash([])
  }

  if (opts.path !== false && (st.stage === 0 || simA > 0)) {
    drawTrail(ctx, st.stage === 0 ? st : { ...st, scanS: PATH_LENGTH }, `rgba(95, 212, 240, ${st.stage === 0 ? 0.7 : 0.6 * simA})`, false)
  }

  if (opts.zones !== false && simA > 0) {
    const z = WORK_ZONE
    const pulse = 0.5 + 0.5 * Math.sin(st.t * 3)
    poly(ctx, [[z.x0, z.y0, 0.01], [z.x1, z.y0, 0.01], [z.x1, z.y1, 0.01], [z.x0, z.y1, 0.01]])
    ctx.fillStyle = `rgba(95, 212, 240, ${(0.1 + pulse * 0.06) * simA})`
    ctx.fill()
    ctx.strokeStyle = `rgba(95, 212, 240, ${0.9 * simA})`
    ctx.lineWidth = 1.3 * px
    ctx.stroke()
    // 작업대 높이의 도달 범위
    const [ax, ay] = iso(ARM_BASE.x, ARM_BASE.y, 0.85)
    ctx.save()
    ctx.translate(ax, ay)
    ctx.scale(1, 0.577)
    ctx.beginPath()
    ctx.arc(0, 0, ARM_BASE.reach * 1.2247 * UNIT, 0, Math.PI * 2)
    ctx.restore()
    ctx.setLineDash([4 * px, 3 * px])
    ctx.strokeStyle = `rgba(236, 246, 252, ${0.8 * simA})`
    ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = `rgba(236, 246, 252, ${simA})`
    ctx.beginPath()
    ctx.arc(ax, ay, 2.6 * px, 0, Math.PI * 2)
    ctx.fill()
    if (opts.labels !== false) label(ctx, z.label, iso(z.x1, z.y1, 0)[0] + 6 * px, iso(z.x1, z.y1, 0)[1] + 2 * px, vp, `rgba(159, 230, 247, ${simA})`)
  }

  if (opts.labels && overlays > 0.5) {
    for (const f of FIXTURES) {
      if (!f.label || f.kind === 'table') continue
      const [lx, ly] = iso((f.x0 + f.x1) / 2, (f.y0 + f.y1) / 2, f.z1 + 0.12)
      label(ctx, f.label, lx, ly, vp, `rgba(170, 184, 200, ${(overlays - 0.5) * 2})`, true)
    }
  }

  drawRobot(ctx, st.pose, st.moving ? st.gait : 0, 'ghost', vp)
  ctx.globalAlpha = 1
}

function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, vp: Viewport, color: string, center = false) {
  const size = 9.5 / vp.k
  ctx.font = `500 ${size}px "JetBrains Mono", ui-monospace, monospace`
  ctx.textAlign = center ? 'center' : 'left'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = color
  ctx.fillText(text, x, y)
}

/** 경로 전체 (Problem 섹션 평면도 등에서 사용) */
export const PATH_POINTS = PATH

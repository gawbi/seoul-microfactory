/*
 * 컨셉 시각화용 가상 매장 모델.
 * 실제 스캔 데이터가 아니라, 8m x 6m 소형 매장을 가정해 직접 만든 형상이다.
 * 실사풍 뷰(REAL)와 포인트 클라우드 뷰(DIGITAL)가 모두 이 데이터를 쓰기 때문에 두 화면의 좌표가 정확히 맞는다.
 * 단위: m. x = 매장 가로, y = 매장 세로(입구 쪽이 +), z = 높이.
 */

export const ROOM = { w: 8, d: 6, h: 2.7, door: { x0: 2.9, x1: 4.7 } }

export type FixtureKind = 'shelf' | 'gondola' | 'fridge' | 'counter' | 'table' | 'item' | 'leg' | 'pos'

export interface Box {
  id: string
  kind: FixtureKind
  x0: number
  y0: number
  x1: number
  y1: number
  z0: number
  z1: number
  color?: string
  label?: string
}

const b = (id: string, kind: FixtureKind, x0: number, y0: number, x1: number, y1: number, z1: number, z0 = 0, extra: Partial<Box> = {}): Box => ({
  id, kind, x0, y0, x1, y1, z0, z1, ...extra,
})

export const FIXTURES: Box[] = [
  b('shelf-a', 'shelf', 0.3, 0.08, 3.3, 0.5, 1.9, 0, { label: 'WALL SHELF' }),
  b('shelf-b', 'shelf', 3.7, 0.08, 5.9, 0.5, 1.9, 0, { label: 'WALL SHELF' }),
  b('fridge', 'fridge', 0.08, 2.9, 0.62, 5.0, 2.0, 0, { label: 'COOLER' }),
  b('gondola', 'gondola', 1.5, 2.1, 3.7, 2.75, 1.35, 0, { label: 'GONDOLA' }),
  b('counter', 'counter', 5.3, 3.9, 7.5, 4.55, 1.0, 0, { label: 'COUNTER' }),
  b('pos', 'pos', 5.55, 4.1, 5.85, 4.35, 1.28, 1.0),
  // 작업 테이블: 상판 + 다리
  b('table', 'table', 6.5, 1.0, 7.75, 2.5, 0.85, 0.8, { label: 'WORK TABLE' }),
  b('leg-1', 'leg', 6.55, 1.05, 6.62, 1.12, 0.8),
  b('leg-2', 'leg', 7.63, 1.05, 7.7, 1.12, 0.8),
  b('leg-3', 'leg', 6.55, 2.38, 6.62, 2.45, 0.8),
  b('leg-4', 'leg', 7.63, 2.38, 7.7, 2.45, 0.8),
  // 작업대 위 소형 물체 (Pick & Place 대상)
  b('item-1', 'item', 6.75, 1.35, 6.93, 1.5, 0.98, 0.85, { color: '#c08a5a' }),
  b('item-2', 'item', 7.05, 1.25, 7.17, 1.37, 1.0, 0.85, { color: '#7c9cc0' }),
  b('item-3', 'item', 7.0, 1.8, 7.3, 2.05, 0.93, 0.85, { color: '#a7b38a' }),
  b('item-4', 'item', 6.9, 4.05, 7.08, 4.2, 1.14, 1.0, { color: '#c4a26a' }),
]

/** 자동화 후보 작업 영역 (디지털 트윈에서 강조) */
export const WORK_ZONE = { x0: 6.3, y0: 0.85, x1: 7.9, y1: 2.65, label: 'TASK ZONE · PICK & PLACE' }
/** SO-ARM101 가상 배치 위치와 대략적인 도달 반경 (시각화용 근사값) */
export const ARM_BASE = { x: 7.15, y: 2.2, reach: 0.4 }

/** Go2 스캔 경로 (매장 밖 → 입구 → 통로 → 작업대 앞) */
export const PATH: [number, number][] = [
  [3.8, 7.3],
  [3.8, 5.3],
  [4.35, 3.3],
  [4.6, 1.35],
  [1.1, 1.35],
  [1.05, 3.4],
  [4.8, 3.35],
  [5.85, 2.75],
  [6.05, 1.75],
]

/* ---------- path sampling ---------- */

const segs = PATH.slice(1).map((p, i) => {
  const a = PATH[i]
  const len = Math.hypot(p[0] - a[0], p[1] - a[1])
  return { a, b: p, len }
})
export const PATH_LENGTH = segs.reduce((s, g) => s + g.len, 0)

export interface Pose {
  x: number
  y: number
  heading: number
}

/** 경로 위 거리 s(m)에서의 위치와 진행 방향. 모서리는 부드럽게 돌도록 방향을 보간한다. */
export function poseAt(s: number): Pose {
  const d = Math.max(0, Math.min(PATH_LENGTH, s))
  let acc = 0
  for (let i = 0; i < segs.length; i++) {
    const g = segs[i]
    if (d <= acc + g.len || i === segs.length - 1) {
      const t = g.len ? (d - acc) / g.len : 0
      const x = g.a[0] + (g.b[0] - g.a[0]) * t
      const y = g.a[1] + (g.b[1] - g.a[1]) * t
      let heading = Math.atan2(g.b[1] - g.a[1], g.b[0] - g.a[0])
      // 다음 구간으로 넘어가기 0.35m 전부터 방향을 섞는다
      const remain = g.len - (d - acc)
      const next = segs[i + 1]
      if (next && remain < 0.35) {
        const h2 = Math.atan2(next.b[1] - next.a[1], next.b[0] - next.a[0])
        heading = lerpAngle(heading, h2, (1 - remain / 0.35) * 0.5)
      }
      const prev = segs[i - 1]
      const done = d - acc
      if (prev && done < 0.35) {
        const h0 = Math.atan2(prev.b[1] - prev.a[1], prev.b[0] - prev.a[0])
        heading = lerpAngle(heading, h0, (1 - done / 0.35) * 0.5)
      }
      return { x, y, heading }
    }
    acc += g.len
  }
  const last = PATH[PATH.length - 1]
  return { x: last[0], y: last[1], heading: 0 }
}

function lerpAngle(a: number, b2: number, t: number) {
  let d = b2 - a
  while (d > Math.PI) d -= Math.PI * 2
  while (d < -Math.PI) d += Math.PI * 2
  return a + d * t
}

/* ---------- isometric projection ---------- */

const C30 = Math.cos(Math.PI / 6)
export const UNIT = 56 // 1m 당 화면 단위

export function iso(x: number, y: number, z = 0): [number, number] {
  return [(x - y) * C30 * UNIT, ((x + y) * 0.5 - z) * UNIT]
}

/** 장면 전체가 들어가는 화면 범위 */
export const VIEW = (() => {
  const pts = [
    iso(0, 0, ROOM.h),
    iso(ROOM.w, 0, ROOM.h),
    iso(0, ROOM.d, ROOM.h),
    iso(ROOM.w, ROOM.d, 0),
    iso(0, ROOM.d, 0),
    iso(ROOM.w, 0, 0),
    iso(3.8, 7.3, 0),
  ]
  const xs = pts.map((p) => p[0])
  const ys = pts.map((p) => p[1])
  const pad = 18
  return {
    x: Math.min(...xs) - pad,
    y: Math.min(...ys) - pad,
    w: Math.max(...xs) - Math.min(...xs) + pad * 2,
    h: Math.max(...ys) - Math.min(...ys) + pad * 2,
  }
})()

/* ---------- synthetic point cloud ---------- */

export interface CloudPoint {
  px: number
  py: number
  z: number
  /** 이 점이 처음 "관측"되는 경로 위치 (m). 관측되지 않으면 Infinity */
  reveal: number
  surface: 'floor' | 'wall' | 'fixture'
}

function rng(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const SCAN_RANGE = 2.6

/**
 * 매장 표면에서 점을 뽑고, 로봇 경로에서 얼마나 가까운지로 관측 시점을 정한다.
 * 실제 LiDAR 모델링이 아니라 "걸어가며 공간이 채워진다"는 개념을 보여주기 위한 근사다.
 */
export function buildCloud(density = 1): CloudPoint[] {
  const r = rng(20261105)
  const out: { x: number; y: number; z: number; surface: CloudPoint['surface'] }[] = []
  const insideFootprint = (x: number, y: number) =>
    FIXTURES.some((f) => f.z0 === 0 && x > f.x0 && x < f.x1 && y > f.y0 && y < f.y1)

  const area = (n: number) => Math.round(n * density)

  // floor
  for (let i = 0; i < area(2000); i++) {
    const x = r() * ROOM.w
    const y = r() * ROOM.d
    if (!insideFootprint(x, y)) out.push({ x, y, z: 0, surface: 'floor' })
  }
  // back walls (x = 0, y = 0)
  for (let i = 0; i < area(900); i++) out.push({ x: r() * ROOM.w, y: 0, z: r() * ROOM.h, surface: 'wall' })
  for (let i = 0; i < area(650); i++) out.push({ x: 0, y: r() * ROOM.d, z: r() * ROOM.h, surface: 'wall' })

  // fixtures: 위 + 보이는 두 면 + 뒤쪽 두 면 일부
  for (const f of FIXTURES) {
    const sx = f.x1 - f.x0
    const sy = f.y1 - f.y0
    const sz = f.z1 - f.z0
    const n = (a: number) => Math.max(2, Math.round(a * 95 * density))
    for (let i = 0; i < n(sx * sy); i++) out.push({ x: f.x0 + r() * sx, y: f.y0 + r() * sy, z: f.z1, surface: 'fixture' })
    for (let i = 0; i < n(sx * sz); i++) out.push({ x: f.x0 + r() * sx, y: f.y1, z: f.z0 + r() * sz, surface: 'fixture' })
    for (let i = 0; i < n(sy * sz); i++) out.push({ x: f.x1, y: f.y0 + r() * sy, z: f.z0 + r() * sz, surface: 'fixture' })
    for (let i = 0; i < n(sy * sz) * 0.5; i++) out.push({ x: f.x0, y: f.y0 + r() * sy, z: f.z0 + r() * sz, surface: 'fixture' })
    // 선반 단 (선반류만)
    if (f.kind === 'shelf' || f.kind === 'gondola') {
      for (let lv = 0.4; lv < sz; lv += 0.42) {
        for (let i = 0; i < n(sx * 0.08); i++) out.push({ x: f.x0 + r() * sx, y: f.y1 - r() * 0.05, z: lv, surface: 'fixture' })
      }
    }
  }

  // 관측 시점 계산
  const step = 0.12
  const samples: [number, number, number][] = []
  for (let s = 0; s <= PATH_LENGTH; s += step) {
    const p = poseAt(s)
    samples.push([p.x, p.y, s])
  }
  const R2 = SCAN_RANGE * SCAN_RANGE
  return out.map((p) => {
    let reveal = Infinity
    for (const [sx, sy, s] of samples) {
      const dx = p.x - sx
      const dy = p.y - sy
      if (dx * dx + dy * dy < R2) {
        reveal = s
        break
      }
    }
    const [px, py] = iso(p.x, p.y, p.z)
    return { px, py, z: p.z, reveal, surface: p.surface }
  })
}

export { SCAN_RANGE }

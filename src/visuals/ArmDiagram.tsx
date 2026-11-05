import { useEffect, useRef } from 'react'
import { useReducedMotion } from '../hooks/useReducedMotion'

/*
 * SO-ARM101 Pick & Place 개념도 (측면). 실제 로봇 형상이 아니라 2링크 팔로 단순화한 그림이다.
 * 역기구학으로 손끝 경로를 따라가게 해서 동작이 자연스럽게 보이도록 했다.
 */

const BASE = { x: 100, y: 236 }
const L1 = 124
const L2 = 110
const WRIST = 26
const TABLE = 262
const PICK = { x: 196, y: 260 }
const PLACE = { x: 300, y: 260 }
const HOME = { x: 170, y: 118 }

type Pt = { x: number; y: number }
const KEYS: { at: number; p: Pt; grip: boolean }[] = [
  { at: 0, p: HOME, grip: false },
  { at: 0.14, p: { x: PICK.x, y: 168 }, grip: false },
  { at: 0.24, p: PICK, grip: false },
  { at: 0.3, p: PICK, grip: true },
  { at: 0.4, p: { x: PICK.x, y: 168 }, grip: true },
  { at: 0.58, p: { x: PLACE.x, y: 168 }, grip: true },
  { at: 0.68, p: PLACE, grip: true },
  { at: 0.74, p: PLACE, grip: false },
  { at: 0.84, p: { x: PLACE.x, y: 168 }, grip: false },
  { at: 1, p: HOME, grip: false },
]
const DURATION = 7

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

function sample(u: number) {
  for (let i = 0; i < KEYS.length - 1; i++) {
    const a = KEYS[i], b = KEYS[i + 1]
    if (u >= a.at && u <= b.at) {
      const t = ease((u - a.at) / (b.at - a.at || 1))
      return { p: { x: a.p.x + (b.p.x - a.p.x) * t, y: a.p.y + (b.p.y - a.p.y) * t }, grip: a.grip, phase: i }
    }
  }
  return { p: HOME, grip: false, phase: 0 }
}

function ik(t: Pt) {
  const dx = t.x - BASE.x
  const dy = t.y - BASE.y
  const d = Math.min(Math.hypot(dx, dy), L1 + L2 - 0.01)
  const a = Math.atan2(dy, dx)
  const cos = (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d)
  // 작업 지점이 모두 베이스 오른쪽에 있으므로 팔꿈치는 항상 위쪽 해를 쓴다
  const sh = a - Math.acos(Math.max(-1, Math.min(1, cos)))
  const elbow = { x: BASE.x + Math.cos(sh) * L1, y: BASE.y + Math.sin(sh) * L1 }
  return elbow
}

export function ArmDiagram({ className, title }: { className?: string; title: string }) {
  const reduced = useReducedMotion()
  const svg = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const el = svg.current
    if (!el) return
    const q = <T extends Element>(sel: string) => el.querySelector(sel) as T
    const l1 = q<SVGLineElement>('[data-l1]')
    const l2 = q<SVGLineElement>('[data-l2]')
    const j1 = q<SVGCircleElement>('[data-j1]')
    const j2 = q<SVGCircleElement>('[data-j2]')
    const grip = q<SVGGElement>('[data-grip]')
    const fl = q<SVGLineElement>('[data-fl]')
    const fr = q<SVGLineElement>('[data-fr]')
    const obj = q<SVGRectElement>('[data-obj]')
    const status = q<SVGTextElement>('[data-status]')

    const render = (u: number) => {
      const { p, grip: g, phase } = sample(u)
      const w = { x: p.x, y: p.y - WRIST }
      const e = ik(w)
      l1.setAttribute('x2', `${e.x}`)
      l1.setAttribute('y2', `${e.y}`)
      l2.setAttribute('x1', `${e.x}`)
      l2.setAttribute('y1', `${e.y}`)
      l2.setAttribute('x2', `${p.x}`)
      l2.setAttribute('y2', `${w.y}`)
      j1.setAttribute('cx', `${e.x}`)
      j1.setAttribute('cy', `${e.y}`)
      j2.setAttribute('cx', `${p.x}`)
      j2.setAttribute('cy', `${w.y}`)
      grip.setAttribute('transform', `translate(${p.x} ${w.y})`)
      const open = g ? 9 : 14
      fl.setAttribute('x1', `${-open}`)
      fl.setAttribute('x2', `${-open}`)
      fr.setAttribute('x1', `${open}`)
      fr.setAttribute('x2', `${open}`)
      // 물체 위치
      let ox = PICK.x
      let oy = TABLE - 18
      if (phase >= 3 && phase <= 6) {
        ox = p.x
        oy = p.y - 16
      } else if (phase >= 7) {
        ox = PLACE.x
      }
      obj.setAttribute('x', `${ox - 9}`)
      obj.setAttribute('y', `${Math.min(oy, TABLE - 18)}`)
      status.textContent = phase < 3 ? 'APPROACH' : phase < 7 ? 'GRASP · TRANSFER' : 'RELEASE · RETURN'
    }

    if (reduced) {
      render(0.5)
      return
    }
    let raf = 0
    let start = 0
    let visible = false
    const loop = (now: number) => {
      if (!start) start = now
      render((((now - start) / 1000) % DURATION) / DURATION)
      raf = requestAnimationFrame(loop)
    }
    const io = new IntersectionObserver(([en]) => {
      visible = en.isIntersecting
      if (visible && !raf) raf = requestAnimationFrame(loop)
      if (!visible && raf) {
        cancelAnimationFrame(raf)
        raf = 0
      }
    })
    io.observe(el)
    render(0)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [reduced])

  return (
    <svg ref={svg} className={className} viewBox="0 0 420 300" role="img" aria-label={title}>
      <defs>
        <pattern id="arm-grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(150,180,215,0.06)" />
        </pattern>
      </defs>
      <rect width="420" height="300" fill="url(#arm-grid)" />
      {/* table */}
      <line x1="40" y1={TABLE} x2="390" y2={TABLE} stroke="rgba(232,238,245,0.55)" strokeWidth="2" />
      <line x1="60" y1={TABLE} x2="60" y2="296" stroke="rgba(232,238,245,0.25)" />
      <line x1="370" y1={TABLE} x2="370" y2="296" stroke="rgba(232,238,245,0.25)" />
      {/* pick / place targets */}
      {[
        { p: PICK, t: 'PICK' },
        { p: PLACE, t: 'PLACE' },
      ].map(({ p, t }) => (
        <g key={t}>
          <rect x={p.x - 16} y={TABLE - 2} width="32" height="4" fill="rgba(95,212,240,0.5)" />
          <text x={p.x} y={TABLE + 20} textAnchor="middle" fill="var(--muted)" style={{ font: '500 10px var(--font-mono)', letterSpacing: '.1em' }}>
            {t}
          </text>
        </g>
      ))}
      {/* reach envelope */}
      <path d={`M ${BASE.x} ${BASE.y - (L1 + L2)} A ${L1 + L2} ${L1 + L2} 0 0 1 ${BASE.x + L1 + L2} ${BASE.y}`} fill="none" stroke="rgba(95,212,240,0.16)" strokeDasharray="3 5" />
      {/* object */}
      <rect data-obj x={PICK.x - 9} y={TABLE - 18} width="18" height="18" fill="#c08a5a" stroke="rgba(0,0,0,.3)" />
      {/* base */}
      <rect x={BASE.x - 22} y={BASE.y} width="44" height={TABLE - BASE.y} fill="#2a323d" stroke="rgba(232,238,245,0.35)" />
      {/* links */}
      <line data-l1 x1={BASE.x} y1={BASE.y} x2={BASE.x} y2={BASE.y - L1} stroke="#d4d9e0" strokeWidth="13" strokeLinecap="round" />
      <line data-l2 x1={BASE.x} y1={BASE.y - L1} x2={HOME.x} y2={HOME.y - WRIST} stroke="#b9c0c9" strokeWidth="10" strokeLinecap="round" />
      <circle cx={BASE.x} cy={BASE.y} r="8" fill="var(--bg)" stroke="var(--cyan)" strokeWidth="1.5" />
      <circle data-j1 cx={BASE.x} cy={BASE.y - L1} r="6.5" fill="var(--bg)" stroke="var(--cyan)" strokeWidth="1.5" />
      <g data-grip>
        <line data-fl x1="-14" y1="2" x2="-14" y2="22" stroke="#d4d9e0" strokeWidth="4" strokeLinecap="round" />
        <line data-fr x1="14" y1="2" x2="14" y2="22" stroke="#d4d9e0" strokeWidth="4" strokeLinecap="round" />
        <rect x="-17" y="-3" width="34" height="7" rx="2" fill="#9aa2ac" />
      </g>
      <circle data-j2 cx={HOME.x} cy={HOME.y - WRIST} r="5" fill="var(--bg)" stroke="var(--cyan)" strokeWidth="1.5" />
      <text data-status x="404" y="28" textAnchor="end" fill="var(--cyan)" style={{ font: '500 10.5px var(--font-mono)', letterSpacing: '.12em' }}>
        APPROACH
      </text>
    </svg>
  )
}

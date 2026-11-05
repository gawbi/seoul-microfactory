import { BrainCircuit, Box, ClipboardCheck, Grab, Layers, PawPrint, Radar, Route, Store, type LucideIcon } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { MediaSlot } from '../components/MediaSlot'
import { KindTag, Reveal, SectionHeader, StatusBadge } from '../components/ui'
import { MEDIA } from '../data/media'
import { LANES, WORKFLOW, type Lane } from '../data/project'
import { ArmDiagram } from '../visuals/ArmDiagram'
import { PlanView } from '../visuals/PlanView'
import { ReconDiagram } from '../visuals/ReconDiagram'
import s from './Workflow.module.css'

const ICONS: Record<string, LucideIcon> = {
  'real-world': Store,
  go2: PawPrint,
  acquisition: Radar,
  reconstruction: Box,
  twin: Layers,
  analysis: BrainCircuit,
  deployment: Route,
  'so-arm': Grab,
  validation: ClipboardCheck,
}

/* 데스크톱 그리드 열 위치 (1열은 레인 이름). DIGITAL 레인은 오른쪽에서 왼쪽으로 흐른다. */
const COL: Record<string, number> = {
  'real-world': 2,
  go2: 3,
  acquisition: 4,
  reconstruction: 5,
  twin: 4,
  analysis: 3,
  deployment: 2,
  'so-arm': 2,
  validation: 3,
}

const EDGES: { from: string; to: string; feedback?: boolean }[] = [
  ...WORKFLOW.slice(1).map((n, i) => ({ from: WORKFLOW[i].id, to: n.id })),
  { from: 'validation', to: 'twin', feedback: true },
]

type Rect = { l: number; r: number; t: number; b: number; cx: number; cy: number }

function route(a: Rect, b: Rect, feedback?: boolean) {
  if (feedback) return `M ${a.r} ${a.cy} H ${b.cx} V ${b.b + 6}`
  if (Math.abs(a.cy - b.cy) < 8) return b.cx > a.cx ? `M ${a.r} ${a.cy} H ${b.l - 6}` : `M ${a.l} ${a.cy} H ${b.r + 6}`
  if (Math.abs(a.cx - b.cx) < 8) return `M ${a.cx} ${a.b} V ${b.t - 6}`
  return `M ${a.r} ${a.cy} H ${b.cx} V ${b.t - 6}`
}

function NodeVisual({ id }: { id: string }) {
  switch (id) {
    case 'go2':
      return <MediaSlot item={MEDIA.go2Front} showCaption={false} sizes="(max-width: 860px) 100vw, 40vw" />
    case 'acquisition':
      return <MediaSlot item={MEDIA.go2Operation} showCaption={false} sizes="(max-width: 860px) 100vw, 40vw" />
    case 'reconstruction':
      return <ReconDiagram title="점 데이터를 메시로 바꾸는 개념도" />
    case 'so-arm':
    case 'validation':
      return <ArmDiagram title="로봇 팔 Pick & Place 개념 애니메이션" />
    case 'real-world':
      return <PlanView dims labels title="가상 매장 평면도" />
    case 'analysis':
      return <PlanView zones obstacles dims={false} title="충돌 여유 영역과 자동화 후보 영역이 표시된 평면도" />
    default:
      return <PlanView path zones dims={false} title="스캔 경로와 로봇 배치 후보가 표시된 평면도" />
  }
}

export function Workflow() {
  const [sel, setSel] = useState('go2')
  const graph = useRef<HTMLDivElement>(null)
  const nodes = useRef<Record<string, HTMLButtonElement | null>>({})
  const [paths, setPaths] = useState<{ d: string; key: string; from: string; to: string; feedback?: boolean; label?: [number, number] }[]>([])
  const [size, setSize] = useState({ w: 0, h: 0 })
  const node = WORKFLOW.find((n) => n.id === sel)!
  const idx = WORKFLOW.findIndex((n) => n.id === sel)

  const measure = () => {
    const g = graph.current
    if (!g) return
    const gr = g.getBoundingClientRect()
    if (window.innerWidth <= 860) {
      setPaths([])
      return
    }
    const rect = (id: string): Rect | null => {
      const el = nodes.current[id]
      if (!el) return null
      const r = el.getBoundingClientRect()
      const l = r.left - gr.left, t = r.top - gr.top
      return { l, t, r: l + r.width, b: t + r.height, cx: l + r.width / 2, cy: t + r.height / 2 }
    }
    setSize({ w: gr.width, h: gr.height })
    setPaths(
      EDGES.map((e) => {
        const a = rect(e.from), b = rect(e.to)
        if (!a || !b) return null
        return {
          key: `${e.from}>${e.to}`,
          from: e.from,
          to: e.to,
          d: route(a, b, e.feedback),
          feedback: e.feedback,
          label: e.feedback ? ([a.r + 12, a.cy - 8] as [number, number]) : undefined,
        }
      }).filter((p): p is NonNullable<typeof p> => !!p),
    )
  }

  useLayoutEffect(measure, [])
  useEffect(() => {
    const ro = new ResizeObserver(() => measure())
    if (graph.current) ro.observe(graph.current)
    document.fonts?.ready.then(measure)
    return () => ro.disconnect()
  }, [])

  const linked = new Set(EDGES.filter((e) => e.from === sel || e.to === sel).flatMap((e) => [e.from, e.to]))

  const onKey = (e: KeyboardEvent) => {
    const dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!dir) return
    e.preventDefault()
    const n = WORKFLOW[(idx + dir + WORKFLOW.length) % WORKFLOW.length]
    setSel(n.id)
    nodes.current[n.id]?.focus()
  }

  const lanes: Lane[] = ['REAL', 'DIGITAL', 'PHYSICAL']

  return (
    <section id="workflow" className="section" aria-labelledby="workflow-title">
      <div className="container">
        <SectionHeader
          index="04"
          label="System workflow"
          title={<span id="workflow-title">현실의 매장에서 출발해, 다시 현실로 돌아옵니다.</span>}
          lead="각 단계를 눌러 보면 무엇을 받아서 무엇을 넘기는지 볼 수 있습니다. 실제 결과가 시뮬레이션과 다르면, 그 차이가 다시 디지털 트윈으로 돌아갑니다."
        />
        <Reveal>
          <div className={s.graph} ref={graph} role="group" aria-label="시스템 아키텍처 단계 선택">
            {lanes.map((lane) => {
              const meta = LANES.find((l) => l.id === lane)!
              return (
                <div key={lane} className={`${s.lane} ${lane === 'PHYSICAL' ? s.lanePhysical : ''}`}>
                  <div className={s.laneLabel}>
                    <span className="mono">{meta.label}</span>
                    <span>{meta.caption}</span>
                  </div>
                  {WORKFLOW.filter((n) => n.lane === lane).map((n) => {
                    const Icon = ICONS[n.id]
                    const i = WORKFLOW.indexOf(n)
                    return (
                      <button
                        key={n.id}
                        ref={(el) => void (nodes.current[n.id] = el)}
                        type="button"
                        className={s.node}
                        style={{ gridColumn: COL[n.id] }}
                        aria-pressed={sel === n.id}
                        data-linked={sel !== n.id && linked.has(n.id)}
                        tabIndex={sel === n.id ? 0 : -1}
                        onClick={() => setSel(n.id)}
                        onKeyDown={onKey}
                      >
                        <span className={s.nodeIcon} aria-hidden="true">
                          <Icon size={16} strokeWidth={1.6} />
                        </span>
                        <span className={s.nodeNo}>{String(i + 1).padStart(2, '0')}</span>
                        <span className={s.nodeLabel}>{n.label}</span>
                      </button>
                    )
                  })}
                </div>
              )
            })}
            {paths.length > 0 && (
              <svg className={s.wires} viewBox={`0 0 ${size.w} ${size.h}`} aria-hidden="true">
                <defs>
                  <marker id="wf-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                    <path d="M0 0 L8 4 L0 8 z" fill="var(--line-3)" />
                  </marker>
                  <marker id="wf-arrow-on" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                    <path d="M0 0 L8 4 L0 8 z" fill="var(--cyan)" />
                  </marker>
                </defs>
                {paths.map((p) => {
                  const on = p.from === sel || p.to === sel
                  return (
                    <g key={p.key}>
                      <path d={p.d} className={s.wire} data-on={on} data-feedback={!!p.feedback} markerEnd={`url(#${on ? 'wf-arrow-on' : 'wf-arrow'})`} />
                      {p.label && (
                        <text x={p.label[0]} y={p.label[1]} className={s.feedbackLabel}>
                          SIM ↔ REAL FEEDBACK
                        </text>
                      )}
                    </g>
                  )
                })}
              </svg>
            )}
          </div>

          <div className={s.detail} aria-live="polite">
            <div className={s.detailVisual}>
              {!['go2', 'acquisition'].includes(node.id) && <KindTag kind="CONCEPT" className={s.detailTag} />}
              <NodeVisual id={node.id} />
            </div>
            <div className={s.detailBody}>
              <div className={s.detailHead}>
                <span className="mono">STEP {String(idx + 1).padStart(2, '0')}</span>
                <h3>{node.label}</h3>
                <StatusBadge status={node.status} />
              </div>
              <p className={s.role}>{node.role}</p>
              <div className={s.io}>
                <div>
                  <span className="mono">Input</span>
                  <ul>
                    {node.inputs.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <span className="mono">Output</span>
                  <ul>
                    {node.outputs.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
          <p className={s.hint}>방향키로 단계를 옮겨 다닐 수 있습니다.</p>
        </Reveal>
      </div>
    </section>
  )
}

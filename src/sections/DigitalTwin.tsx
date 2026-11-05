import { Crosshair, MoveHorizontal, Pause, Play, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import { MediaSlot } from '../components/MediaSlot'
import { KindTag, Reveal, SectionHeader } from '../components/ui'
import { MEDIA } from '../data/media'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { getCloud } from '../visuals/cloud'
import { SceneCanvas } from '../visuals/SceneCanvas'
import { useSceneClock } from '../visuals/sceneClock'
import { drawReal, drawTwin } from '../visuals/sceneRenderer'
import { WORK_ZONE } from '../visuals/storeModel'
import s from './DigitalTwin.module.css'

type Mode = 'real' | 'split' | 'digital'
const ZOOMS = [1, 1.6, 2.4]
const STAGE_NAME = ['SCANNING', 'RECONSTRUCTION', 'SIMULATION']
const SIM_FACTS: [string, string][] = [
  ['Locomotion', 'Isaac Sim 내장 Go2 강화학습 보행 정책 (물리 기반)'],
  ['LiDAR', '범용 회전형 시뮬레이션 모델 · 포인트는 실제 센서 출력이 아님'],
  ['Gimbal', '회전 구조만 표현한 단순화 모델'],
  ['Grasp', 'SO-101 집게 접촉·마찰만 사용, 보조 고정 없음'],
  ['Speed', '스캔 구간 3배속, 나머지 실시간'],
]
const TASK_FOCUS = { x: (WORK_ZONE.x0 + WORK_ZONE.x1) / 2, y: (WORK_ZONE.y0 + WORK_ZONE.y1) / 2 }

export function DigitalTwin() {
  const root = useRef<HTMLDivElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const finePointer = useMediaQuery('(hover: hover) and (pointer: fine)')
  const [paused, setPaused] = useState(false)
  const clock = useSceneClock(root, reduced, paused)
  const cloud = useMemo(() => getCloud(), [])
  const [mode, setMode] = useState<Mode>('split')
  const [split, setSplit] = useState(50)
  const [zoomI, setZoomI] = useState(0)
  const [focusTask, setFocusTask] = useState(false)
  const [ov, setOv] = useState({ path: true, zones: true, obstacles: false, labels: true })
  const statusRef = useRef<HTMLSpanElement>(null)

  useEffect(
    () =>
      clock.subscribe((st) => {
        if (statusRef.current) statusRef.current.textContent = `${STAGE_NAME[st.stage]} · T+${st.t.toFixed(1).padStart(4, '0')}s`
      }),
    [clock],
  )

  // 일시정지 중에 표시 항목을 바꿔도 바로 다시 그린다
  useEffect(() => clock.emit(clock.last), [ov, clock])

  const zoom = ZOOMS[zoomI]
  const focus = focusTask ? TASK_FOCUS : undefined

  const onMove = (e: PointerEvent) => {
    if (reduced || !finePointer || !stage.current) return
    const r = stage.current.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    stage.current.style.setProperty('--ry', `${x * 3}deg`)
    stage.current.style.setProperty('--rx', `${-y * 2.2}deg`)
  }
  const onLeave = () => {
    stage.current?.style.setProperty('--ry', '0deg')
    stage.current?.style.setProperty('--rx', '0deg')
  }

  const toggle = (k: keyof typeof ov) => setOv((o) => ({ ...o, [k]: !o[k] }))
  const simReady = !!MEDIA.simDemo.src

  return (
    <section id="twin" className="section" aria-labelledby="twin-title">
      <div className="container">
        <SectionHeader
          index="05"
          label="Digital twin"
          title={<span id="twin-title">같은 매장, 두 개의 상태.</span>}
          lead="왼쪽은 우리가 보는 매장, 오른쪽은 로봇이 이해하는 매장입니다. 가운데 손잡이를 끌어 두 화면을 겹쳐 보세요. 로봇이 지나간 자리부터 공간이 채워지고, 그 위에 작업 영역이 올라갑니다."
        />
        <Reveal>
          <div className={s.viewer} ref={root}>
            <div className={s.toolbar}>
              <div className={s.group}>
                <div className={s.seg} role="group" aria-label="보기 모드">
                  {(['real', 'split', 'digital'] as Mode[]).map((m) => (
                    <button key={m} type="button" className="pressable" aria-pressed={mode === m} onClick={() => setMode(m)}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <div className={s.group} role="group" aria-label="디지털 트윈 표시 항목">
                <button type="button" className={`pressable ${s.tool}`} aria-pressed={ov.path} onClick={() => toggle('path')}>
                  Path
                </button>
                <button type="button" className={`pressable ${s.tool}`} aria-pressed={ov.zones} onClick={() => toggle('zones')}>
                  Task zone
                </button>
                <button type="button" className={`pressable ${s.tool}`} aria-pressed={ov.obstacles} onClick={() => toggle('obstacles')}>
                  Clearance
                </button>
                <button type="button" className={`pressable ${s.tool}`} aria-pressed={ov.labels} onClick={() => toggle('labels')}>
                  Labels
                </button>
              </div>
              <div className={s.group} role="group" aria-label="카메라">
                <button type="button" className={`pressable ${s.tool} ${s.iconTool}`} onClick={() => setZoomI((z) => Math.max(0, z - 1))} disabled={zoomI === 0} aria-label="축소">
                  <ZoomOut size={15} />
                </button>
                <button type="button" className={`pressable ${s.tool} ${s.iconTool}`} onClick={() => setZoomI((z) => Math.min(ZOOMS.length - 1, z + 1))} disabled={zoomI === ZOOMS.length - 1} aria-label="확대">
                  <ZoomIn size={15} />
                </button>
                <button
                  type="button"
                  className={`pressable ${s.tool}`}
                  aria-pressed={focusTask}
                  onClick={() => {
                    setFocusTask((f) => !f)
                    setZoomI((z) => (focusTask ? 0 : Math.max(z, 1)))
                  }}
                >
                  <Crosshair size={14} /> Task zone
                </button>
                {!reduced && (
                  <>
                    <button type="button" className={`pressable ${s.tool} ${s.iconTool}`} onClick={() => setPaused((p) => !p)} aria-label={paused ? '재생' : '일시정지'}>
                      {paused ? <Play size={15} /> : <Pause size={15} />}
                    </button>
                    <button
                      type="button"
                      className={`pressable ${s.tool}`}
                      onClick={() => {
                        clock.restart()
                        setPaused(false)
                      }}
                    >
                      <RotateCcw size={14} /> Replay scan
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className={s.stageWrap} onPointerMove={onMove} onPointerLeave={onLeave}>
              <div ref={stage} className={`${s.stage} ${s[`mode_${mode}`]}`} style={{ '--split': `${split}%` } as CSSProperties}>
                <SceneCanvas
                  clock={clock}
                  className={s.layer}
                  zoom={zoom}
                  focus={focus}
                  label="포인트 클라우드로 표현한 가상 매장의 디지털 트윈. 로봇 경로, 작업 영역, 충돌 여유 영역을 켜고 끌 수 있다."
                  draw={(ctx, st, vp) => drawTwin(ctx, st, cloud, vp, ov)}
                />
                <div className={`${s.layer} ${s.realLayer}`} style={{ background: 'var(--bg)' }}>
                  <SceneCanvas
                    clock={clock}
                    className={s.layer}
                    zoom={zoom}
                    focus={focus}
                    label="사족보행 로봇이 가상 매장 안을 걸으며 스캔하는 일러스트"
                    draw={(ctx, st, vp) => drawReal(ctx, st, vp)}
                  />
                </div>

                {mode !== 'real' && mode !== 'digital' && (
                  <>
                    <input
                      className={s.range}
                      type="range"
                      min={0}
                      max={100}
                      value={split}
                      onChange={(e) => setSplit(Number(e.target.value))}
                      aria-label="실제/디지털 비교 위치"
                    />
                    <div className={s.handle} aria-hidden="true">
                      <span>
                        <MoveHorizontal size={16} />
                      </span>
                    </div>
                  </>
                )}
                {mode !== 'digital' && (
                  <div className={`${s.corner} ${s.cornerL}`}>
                    <span className={s.cornerLabel}>REAL ENVIRONMENT</span>
                  </div>
                )}
                {mode !== 'real' && (
                  <div className={`${s.corner} ${s.cornerR}`}>
                    <span className={s.cornerLabel}>VIRTUAL ENVIRONMENT</span>
                  </div>
                )}
              </div>
            </div>

            <div className={`mono ${s.footer}`}>
              <span>
                <b ref={statusRef}>SCANNING</b>
              </span>
              <span className={s.legend}>
                <span>
                  <i style={{ background: 'linear-gradient(90deg,#3462be,#5fd4f0,#ecf6fc)' }} />
                  Point height
                </span>
                <span>
                  <i style={{ border: '1px solid var(--cyan)', background: 'var(--cyan-a)' }} />
                  Task zone
                </span>
                <span>
                  <i style={{ border: '1px dashed var(--amber)' }} />
                  Clearance 0.22 m
                </span>
              </span>
              <KindTag kind="CONCEPT" />
            </div>
          </div>
        </Reveal>

        <Reveal className={s.sim}>
          <div className={s.simHead}>
            <p className={`mono ${s.simKicker}`}>
              <KindTag kind="SIMULATION" /> NVIDIA Isaac Sim 6.2
            </p>
            <h3>위의 장면을 실제 물리 시뮬레이션으로 돌렸습니다.</h3>
            <p>
              같은 8 × 6 m 매장을 Isaac Sim에 만들고, Go2가 직접 걸으며 스캔한 뒤 SO-101이 작업대의 상자를 옮기는 과정까지 한 번에 실행했습니다. 실제 매장이나 실제 로봇을 찍은 영상은 아닙니다.
            </p>
          </div>
          <div className={`${s.video} ${simReady ? s.videoReady : ''}`}>
            <MediaSlot item={MEDIA.simDemo} showTag={false} />
          </div>
          <ul className={s.facts}>
            {SIM_FACTS.map(([k, v]) => (
              <li key={k}>
                <span className="mono">{k}</span>
                {v}
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal className={s.compare}>
          <div className={s.compareHead}>
            <h3>Real robot · Simulation</h3>
            <p>왼쪽은 실제 Go2(짐벌 없는 기본형) 사진, 오른쪽은 Isaac Sim 속 Go2 모델에 단순화한 짐벌 카메라를 얹은 화면입니다.</p>
          </div>
          <div className={s.side}>
            <span className={`mono ${s.sideLabel}`}>Real robot</span>
            <MediaSlot item={MEDIA.go2Side} sizes="(max-width: 760px) 100vw, 50vw" />
          </div>
          <div className={s.side}>
            <span className={`mono ${s.sideLabel}`}>Simulation</span>
            <MediaSlot item={MEDIA.simGo2} sizes="(max-width: 760px) 100vw, 50vw" />
          </div>
        </Reveal>

        <Reveal className={s.gallery}>
          {[MEDIA.simStore, MEDIA.simCloud, MEDIA.simTwin, MEDIA.simArm].map((m) => (
            <MediaSlot key={m.id} item={m} sizes="(max-width: 760px) 100vw, 25vw" />
          ))}
        </Reveal>
      </div>
    </section>
  )
}

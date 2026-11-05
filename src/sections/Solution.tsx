import { ArrowRight, Info } from 'lucide-react'
import { useRef, useState, type KeyboardEvent } from 'react'
import { MediaSlot } from '../components/MediaSlot'
import { KindTag, Reveal, SectionHeader, StatusBadge } from '../components/ui'
import { MEDIA } from '../data/media'
import { MODULES, type ModuleId } from '../data/project'
import { ArmDiagram } from '../visuals/ArmDiagram'
import { PlanView } from '../visuals/PlanView'
import { ReconDiagram } from '../visuals/ReconDiagram'
import s from './Solution.module.css'

function Visual({ id }: { id: ModuleId }) {
  if (id === 'scanner') {
    return (
      <div className={s.photos}>
        <MediaSlot item={MEDIA.go2Sensor} sizes="(max-width: 960px) 100vw, 36vw" />
        <MediaSlot item={MEDIA.go2Side} sizes="(max-width: 960px) 100vw, 32vw" />
      </div>
    )
  }
  return (
    <div className={s.diagram}>
      <KindTag kind="CONCEPT" className={s.visualTag} />
      {id === 'reconstruction' && <ReconDiagram title="선반 하나를 예로 든 점 데이터에서 메시로의 변환 개념도" />}
      {id === 'twin' && (
        <PlanView path zones obstacles dims={false} title="디지털 트윈 분석 개념도. 스캔 경로, 집기 주변 충돌 여유 영역, 작업 테이블의 자동화 후보 영역과 로봇 팔 도달 범위가 표시되어 있다." />
      )}
      {id === 'validation' && <ArmDiagram title="로봇 팔이 작업대 위 물체를 집어 옆 위치로 옮기는 Pick & Place 개념 애니메이션" />}
    </div>
  )
}

export function Solution() {
  const [active, setActive] = useState<ModuleId>('scanner')
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  const mod = MODULES.find((m) => m.id === active)!

  const onKey = (e: KeyboardEvent, i: number) => {
    const dir = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0
    if (!dir) return
    e.preventDefault()
    const n = (i + dir + MODULES.length) % MODULES.length
    setActive(MODULES[n].id)
    tabs.current[n]?.focus()
  }

  return (
    <section id="solution" className="section" aria-labelledby="solution-title">
      <div className="container">
        <SectionHeader
          index="03"
          label="Our solution"
          title={<span id="solution-title">스캔하고, 복원하고, 시험하고, 확인합니다.</span>}
          lead="네 개의 모듈이 한 줄로 이어집니다. 앞 단계의 결과물이 다음 단계의 입력이 되고, 마지막 실제 검증 결과는 다시 디지털 트윈을 고치는 데 쓰입니다."
        />
        <Reveal className={s.layout}>
          <div className={s.tabs} role="tablist" aria-label="핵심 모듈" aria-orientation="vertical">
            {MODULES.map((m, i) => (
              <button
                key={m.id}
                ref={(el) => void (tabs.current[i] = el)}
                role="tab"
                id={`tab-${m.id}`}
                aria-selected={active === m.id}
                aria-controls="module-panel"
                tabIndex={active === m.id ? 0 : -1}
                className={`pressable ${s.tab}`}
                onClick={() => setActive(m.id)}
                onKeyDown={(e) => onKey(e, i)}
              >
                <span className={s.tabIndex}>{m.index}</span>
                <span className={s.tabName}>{m.name}</span>
              </button>
            ))}
          </div>

          <div className={s.panel} key={mod.id} id="module-panel" role="tabpanel" aria-labelledby={`tab-${mod.id}`}>
            <div className={s.visual}>
              <Visual id={mod.id} />
            </div>
            <div className={s.body}>
              <div className={s.head}>
                <h3>{mod.name}</h3>
                <StatusBadge status={mod.status} />
              </div>
              <p className={s.summary}>{mod.summary}</p>
              <ul className={s.points}>
                {mod.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
              <div className={s.flow} aria-label="데이터 흐름">
                <div className={s.flowCell}>
                  <span className="mono">Input</span>
                  <p>{mod.flow.input}</p>
                </div>
                <div className={s.arrow} aria-hidden="true">
                  <ArrowRight size={14} />
                </div>
                <div className={s.flowCell}>
                  <span className="mono">Process</span>
                  <p>{mod.flow.process}</p>
                </div>
                <div className={s.arrow} aria-hidden="true">
                  <ArrowRight size={14} />
                </div>
                <div className={s.flowCell}>
                  <span className="mono">Output</span>
                  <p>{mod.flow.output}</p>
                </div>
              </div>
              {mod.note && (
                <p className={s.note}>
                  <Info size={14} aria-hidden="true" />
                  {mod.note}
                </p>
              )}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

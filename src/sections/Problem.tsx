import { useState } from 'react'
import { KindTag, Reveal, SectionHeader } from '../components/ui'
import { PROBLEMS } from '../data/project'
import { PlanView } from '../visuals/PlanView'
import s from './Problem.module.css'

export function Problem() {
  const [active, setActive] = useState<string>('01')
  return (
    <section id="problem" className="section" aria-labelledby="problem-title">
      <div className="container">
        <SectionHeader
          index="02"
          label="The problem"
          title={<span id="problem-title">로봇은 준비됐는데, 매장은 아직 준비가 안 됐습니다.</span>}
          lead="작은 매장이 로봇을 들이기 어려운 건 로봇 성능 때문만이 아닙니다. 공간과 업무를 로봇의 언어로 옮겨 줄 과정이 빠져 있습니다."
        />
        <div className={s.grid}>
          <Reveal className={s.planWrap}>
            <div className={`mono ${s.planHead}`}>
              <span>Store floor plan</span>
              <KindTag kind="CONCEPT" />
            </div>
            <PlanView
              className={s.plan}
              markers={PROBLEMS.map((p) => ({ no: p.no, ...p.marker }))}
              active={active}
              onMarker={setActive}
              title="8m x 6m 가상 매장 평면도. 벽 선반, 곤돌라, 냉장고, 계산대, 작업 테이블이 있고, 네 가지 문제 지점이 번호로 표시되어 있다."
            />
          </Reveal>
          <ol className={s.list}>
            {PROBLEMS.map((p, i) => (
              <Reveal
                as="li"
                key={p.no}
                delay={i * 60}
                className={s.item}
              >
                <div
                  className={s.row}
                  data-active={active === p.no}
                  tabIndex={0}
                  onMouseEnter={() => setActive(p.no)}
                  onFocus={() => setActive(p.no)}
                >
                  <span className={s.no}>{p.no}</span>
                  <h3>{p.title}</h3>
                  <p>{p.body}</p>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}

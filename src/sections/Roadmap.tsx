import { Reveal, SectionHeader, StatusBadge } from '../components/ui'
import { ROADMAP, ROADMAP_UPDATED } from '../data/roadmap'
import s from './Roadmap.module.css'

export function Roadmap() {
  return (
    <section id="roadmap" className="section" aria-labelledby="roadmap-title">
      <div className="container">
        <SectionHeader
          index="09"
          label="Roadmap"
          title={<span id="roadmap-title">다섯 단계로 나눠 하나씩 검증합니다.</span>}
          lead="각 단계는 앞 단계의 결과물이 있어야 시작할 수 있습니다. 진행 상황은 실제로 끝낸 작업만 체크합니다."
        />
        <Reveal as="div">
          <ol className={s.list}>
            {ROADMAP.map((p) => (
              <li className={s.phase} key={p.no} data-status={p.status}>
                <div className={`mono ${s.rail}`}>
                  <span className={s.dot} aria-hidden="true" />
                  Phase {p.no}
                </div>
                <h3>
                  <span>{p.title}</span>
                  <span className="mono">{p.titleEn}</span>
                </h3>
                <p className={s.goal}>{p.goal}</p>
                <ul className={s.tasks}>
                  {p.tasks.map((t) => (
                    <li key={t.label}>
                      <span className={s.check} data-done={t.done} aria-label={t.done ? '완료' : '미완료'} />
                      {t.label}
                    </li>
                  ))}
                </ul>
                <div className={s.foot}>
                  <p className={s.deliverable}>
                    <b>Deliverable</b>
                    {p.deliverable}
                  </p>
                  <StatusBadge status={p.status} />
                </div>
              </li>
            ))}
          </ol>
          <p className={`mono ${s.updated}`}>Last updated · {ROADMAP_UPDATED}</p>
        </Reveal>
      </div>
    </section>
  )
}

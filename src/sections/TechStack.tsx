import { Reveal, SectionHeader, TechBadge } from '../components/ui'
import { TECH_STACK } from '../data/project'
import s from './TechStack.module.css'

export function TechStack() {
  return (
    <section id="stack" className="section" aria-labelledby="stack-title">
      <div className="container">
        <SectionHeader
          index="08"
          label="Tech stack"
          title={<span id="stack-title">쓰고 있는 것과 쓸 예정인 것을 나눠 적었습니다.</span>}
          lead="아직 손대지 않은 기술은 Planned, 필요할 때 도입을 검토할 기술은 Under consideration으로 표시했습니다."
        />
        <Reveal className={s.grid}>
          {TECH_STACK.map((cat) => (
            <div className={s.col} key={cat.category}>
              <h3 className="mono">{cat.category}</h3>
              {cat.items.map((it) => (
                <div className={s.item} key={it.name}>
                  <span className={s.name}>{it.name}</span>
                  {it.note && <span className={s.note}>{it.note}</span>}
                  <TechBadge status={it.status} />
                </div>
              ))}
            </div>
          ))}
        </Reveal>
        <p className={s.legend}>
          <span>
            <TechBadge status="IN_USE" /> 이 사이트나 현재 작업에 실제로 쓰는 중
          </span>
          <span>
            <TechBadge status="PLANNED" /> 계획에 포함, 아직 적용 전
          </span>
          <span>
            <TechBadge status="CONSIDERING" /> 필요에 따라 검토
          </span>
        </p>
      </div>
    </section>
  )
}

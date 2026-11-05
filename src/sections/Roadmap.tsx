import { Check } from 'lucide-react'
import { StatusText } from '../components/ui'
import { ROADMAP, ROADMAP_UPDATED } from '../data/roadmap'
import s from './Roadmap.module.css'

export function Roadmap() {
  return (
    <section id="roadmap" className="section" aria-labelledby="roadmap-title">
      <div className="container">
        <div className={s.head}>
          <h2 id="roadmap-title" className="h2">
            지금은 세 번째 단계에 있습니다.
          </h2>
          <p className={s.updated}>{ROADMAP_UPDATED} 기준. 끝낸 일만 체크합니다.</p>
        </div>
        <ol className={s.track}>
          {ROADMAP.map((p) => {
            const done = p.tasks.filter((t) => t.done).length
            return (
              <li key={p.no} className={s.phase} data-status={p.status}>
                <span className={`wide num ${s.no}`}>{Number(p.no)}</span>
                <h3>{p.title}</h3>
                <p className={s.goal}>{p.goal}</p>
                <ul className={s.tasks} aria-label={`세부 작업 ${p.tasks.length}개 중 ${done}개 완료`}>
                  {p.tasks.map((t) => (
                    <li key={t.label} data-done={t.done}>
                      <span className={s.box} aria-hidden="true">
                        {t.done && <Check size={12} strokeWidth={3} />}
                      </span>
                      <span>
                        {t.label}
                        {t.done && <span className="sr-only"> (완료)</span>}
                      </span>
                    </li>
                  ))}
                </ul>
                <StatusText status={p.status} note={`결과물: ${p.deliverable}`} />
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}

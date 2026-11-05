import { INTRO } from '../data/project'
import s from './Intro.module.css'

export function Intro() {
  return (
    <section id="intro" className="section" aria-labelledby="intro-title">
      <div className={`container ${s.grid}`}>
        <h2 id="intro-title" className={s.statement}>
          {INTRO.statement.map((l) => (
            <span key={l}>{l}</span>
          ))}
        </h2>
        <div className={s.text}>
          {INTRO.paragraphs.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
      </div>
    </section>
  )
}

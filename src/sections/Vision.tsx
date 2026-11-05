import { Reveal } from '../components/ui'
import { VISION } from '../data/project'
import s from './Vision.module.css'

export function Vision() {
  return (
    <section className={s.vision} aria-labelledby="vision-title">
      <Reveal className={`container ${s.inner}`}>
        <p className={`mono ${s.index}`}>10 / Final vision</p>
        <h2 id="vision-title" className={s.title}>
          {VISION.title}
        </h2>
        <p className={s.body}>{VISION.body}</p>
        <blockquote className={s.quote}>“{VISION.quote}”</blockquote>
        <div className={s.cta}>
          <a href="#workflow">System workflow</a>
          <a href="#roadmap">Roadmap</a>
        </div>
      </Reveal>
    </section>
  )
}

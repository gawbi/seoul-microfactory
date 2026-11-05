import { Film as FilmPlayer, Picture } from '../components/ui'
import { MEDIA } from '../data/media'
import { FILM, NIGHT } from '../data/project'
import s from './Film.module.css'

export function Film() {
  return (
    <>
      <section id="film" className={`night section ${s.section}`} aria-labelledby="film-title">
        <div className="container">
          <div className={s.head}>
            <h2 id="film-title" className="h2">
              {FILM.title}
            </h2>
            <p className={s.meta}>NVIDIA Isaac Sim 6.2, 가상 매장 8 × 6 m, 53초</p>
          </div>
          <FilmPlayer item={MEDIA.simDemo} />
          <dl className={s.facts}>
            {FILM.facts.map((f) => (
              <div key={f.k}>
                <dt>{f.k}</dt>
                <dd>{f.v}</dd>
              </div>
            ))}
          </dl>

          <div className={s.stills}>
            <Picture item={MEDIA.cineCloud} tone="night" className={s.big} sizes="(max-width: 900px) 100vw, 66vw" />
            <Picture item={MEDIA.cineSide} tone="night" sizes="(max-width: 900px) 100vw, 33vw" />
            <Picture item={MEDIA.cineArmWide} tone="night" sizes="(max-width: 900px) 100vw, 33vw" />
          </div>
        </div>
      </section>

      <section className={`night ${s.door}`} aria-labelledby="night-title">
        <Picture item={MEDIA.cineDoor} tone="night" className={s.doorImg} caption={false} sizes="100vw" position="50% 60%" />
        <div className={`container ${s.doorText}`}>
          <h2 id="night-title" className="h2">
            {NIGHT.title}
          </h2>
          <p>{NIGHT.body}</p>
          <p className={s.doorCredit}>Isaac Sim 렌더. {MEDIA.cineDoor.caption}</p>
        </div>
      </section>
    </>
  )
}

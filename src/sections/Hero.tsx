import { useEffect, useRef, useState } from 'react'
import { asset } from '../config/site'
import { MEDIA } from '../data/media'
import { HERO } from '../data/project'
import { useReducedMotion } from '../hooks/useReducedMotion'
import s from './Hero.module.css'

/**
 * 첫 화면. Isaac Sim 패스 트레이싱으로 렌더한 통로 장면이 화면을 채운다.
 * 이 페이지에서 움직임을 쓰는 곳은 여기 한 군데다 (영상, 그리고 처음 한 번 올라오는 제목).
 */
export function Hero() {
  const ref = useRef<HTMLVideoElement>(null)
  const reduced = useReducedMotion()
  const [ready, setReady] = useState(false)
  const film = MEDIA.heroFilm
  const [src] = useState(() => (typeof window !== 'undefined' && window.innerWidth < 900 ? 'assets/cinematic/hero-960.mp4' : film.src))

  // 영상이 늦게 와도 제목은 1.2초 안에 올라온다
  useEffect(() => {
    const t = window.setTimeout(() => setReady(true), 1200)
    return () => window.clearTimeout(t)
  }, [])

  useEffect(() => {
    const v = ref.current
    if (!v) return
    if (reduced) {
      v.pause()
      return
    }
    // 화면 밖에서는 멈춰 둔다
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? v.play().catch(() => undefined) : v.pause()))
    io.observe(v)
    return () => io.disconnect()
  }, [reduced])

  return (
    <header id="top" className={`night ${s.hero}`} data-ready={ready}>
      <video
        ref={ref}
        className={s.video}
        src={asset(src)}
        poster={asset(film.poster!)}
        muted
        loop
        playsInline
        autoPlay={!reduced}
        preload="auto"
        aria-label={film.alt}
        onLoadedData={() => setReady(true)}
      />
      <div className={s.shade} aria-hidden="true" />
      <div className={`container ${s.content}`}>
        <h1 className={`wide ${s.mark}`}>
          {HERO.lines.map((l, i) => (
            <span key={l} className={s.line} style={{ ['--i' as string]: i }}>
              <span>{l}</span>
            </span>
          ))}
        </h1>
        <div className={s.copy}>
          <p className={s.lead}>{HERO.lead}</p>
          <p className={s.body}>{HERO.body}</p>
          <p className={s.credit}>{HERO.credit}</p>
        </div>
      </div>
    </header>
  )
}

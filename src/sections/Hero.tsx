import { ArrowRight } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { KindTag } from '../components/ui'
import { asset } from '../config/site'
import { CREDITS, MEDIA } from '../data/media'
import { HERO } from '../data/project'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { getCloud } from '../visuals/cloud'
import { SceneCanvas } from '../visuals/SceneCanvas'
import { useSceneClock } from '../visuals/sceneClock'
import { drawTwin } from '../visuals/sceneRenderer'
import s from './Hero.module.css'

const photo = MEDIA.go2Hero
const credit = CREDITS.find((c) => c.id === photo.creditId)!

/* 크롭한 사진 기준 센서 위치 (0~1). public/assets/images/go2/go2-hero.webp 에 맞춘 값 */
const CALLOUTS = [
  { label: 'FRONT CAMERA', x: 0.514, y: 0.5 },
  { label: '4D LIDAR', x: 0.508, y: 0.61 },
]

export function Hero() {
  const root = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const clock = useSceneClock(root, reduced)
  const cloud = useMemo(() => getCloud(), [])
  const [stage, setStage] = useState(reduced ? 2 : 0)
  const fills = useRef<(HTMLSpanElement | null)[]>([])

  useEffect(
    () =>
      clock.subscribe((st) => {
        setStage((prev) => (prev === st.stage ? prev : st.stage))
        const progress = [st.stage > 0 ? 1 : st.t / 11.5, st.stage > 1 ? 1 : st.recon, st.sim]
        fills.current.forEach((el, i) => {
          if (el) el.style.width = `${Math.min(1, progress[i]) * 100}%`
        })
      }),
    [clock],
  )

  return (
    <section className={s.hero} id="top" aria-labelledby="hero-title">
      <div className={`container ${s.wrap}`}>
        <div className={s.copy}>
          <p className={`mono ${s.eyebrow}`}>
            <span>{HERO.eyebrow[0]}</span>
            <span>{HERO.eyebrow[1]}</span>
          </p>
          <h1 id="hero-title" className={s.title}>
            Making Every Store <em>Robot&#8209;Ready.</em>
          </h1>
          <p className={s.lead}>{HERO.lead}</p>
          <p className={s.body}>{HERO.body}</p>
          <div className={s.ctas}>
            <a className={`pressable ${s.btn} ${s.primary}`} href="#solution">
              프로젝트 소개 <ArrowRight size={15} />
            </a>
            <a className={`pressable ${s.btn} ${s.ghost}`} href="#workflow">
              시스템 아키텍처 <ArrowRight size={15} />
            </a>
          </div>
          <p className={`mono ${s.meta}`}>
            <span>
              <b>Stage</b> Concept
            </span>
            <span>Unitree Go2 Ent-MTPTZ</span>
            <span>NVIDIA Isaac Sim</span>
            <span>SO-ARM101</span>
          </p>
        </div>

        <div className={s.visual} ref={root}>
          <div className={`mono ${s.bar}`}>
            <span>Real robot → Digital twin</span>
            <span>Store model 8.0 × 6.0 m</span>
          </div>
          <div className={s.panes}>
            <div className={s.pane}>
              <div className={s.paneHead}>
                <KindTag kind="REAL_PHOTO" />
              </div>
              <div className={s.photo}>
                <img
                  src={asset(photo.src)}
                  srcSet={photo.srcSet.map((v) => `${asset(v.src)} ${v.width}w`).join(', ')}
                  sizes="(max-width: 640px) 100vw, (max-width: 1080px) 46vw, 30vw"
                  width={photo.width}
                  height={photo.height}
                  alt={photo.alt}
                  fetchPriority="high"
                />
                <div className={s.corners} aria-hidden="true" />
                {!reduced && <div className={s.scanline} aria-hidden="true" />}
                {CALLOUTS.map((c) => (
                  <div key={c.label} className={s.callout} style={{ left: `${c.x * 100}%`, top: `${c.y * 100}%` }} aria-hidden="true">
                    <i />
                    <b />
                    <span>{c.label}</span>
                  </div>
                ))}
                <a className={s.credit} href={credit.pageUrl} target="_blank" rel="noreferrer noopener">
                  Photo · {credit.author.split(' (')[0]} · {credit.license}
                </a>
              </div>
            </div>

            <div className={s.link} aria-hidden="true">
              {!reduced && (
                <div className={s.packets}>
                  <i />
                  <i />
                  <i />
                  <i />
                </div>
              )}
              <span className={s.linkLabel}>DATA</span>
            </div>

            <div className={`${s.pane} ${s.twinPane}`}>
              <div className={s.paneHead}>
                <KindTag kind="CONCEPT" />
                <span className={s.paneLabel}>Digital twin</span>
              </div>
              <SceneCanvas
                clock={clock}
                zoom={1.12}
                className={s.twin}
                label="가상 매장이 포인트 클라우드로 채워지는 컨셉 애니메이션. 로봇이 지나간 자리부터 점이 생기고, 이어서 집기 윤곽과 작업 영역이 표시된다."
                draw={(ctx, st, vp) => drawTwin(ctx, st, cloud, vp, { labels: false })}
              />
            </div>
          </div>
          <div className={s.status} role="status" aria-live="off">
            {HERO.stages.map((name, i) => (
              <div key={name} className={s.stage} data-active={stage === i} data-done={stage > i}>
                <span>{name}</span>
                <em>{stage === i ? 'ACTIVE' : stage > i ? 'DONE' : 'QUEUED'}</em>
                <span className={s.fill} ref={(el) => void (fills.current[i] = el)} />
              </div>
            ))}
          </div>
          <p className={s.note}>왼쪽은 실제 Go2(짐벌 없는 기본형) 사진, 오른쪽은 가상 매장으로 만든 컨셉 애니메이션입니다. 실제 스캔 데이터가 아닙니다.</p>
        </div>
      </div>
    </section>
  )
}

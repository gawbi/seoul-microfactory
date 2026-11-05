import { MEDIA } from '../data/media'
import { STEPS } from '../data/project'
import { Picture, StatusText } from '../components/ui'
import s from './Process.module.css'

const STEP_MEDIA = {
  gimbal: { item: MEDIA.cineGimbal, pos: '50% 50%' },
  cloud: { item: MEDIA.cineCloudAisle, pos: '58% 50%' },
  arm: { item: MEDIA.cineArm, pos: '50% 50%' },
} as const

export function Process() {
  return (
    <section id="process" className={`section ${s.section}`} aria-labelledby="process-title">
      <div className="container">
        <div className={s.head}>
          <h2 id="process-title" className="h2">
            재고, 옮기고, 해 보고, 확인합니다.
          </h2>
          <p className={s.lead}>앞 단계의 결과가 다음 단계의 재료가 됩니다. 마지막 확인 결과는 다시 가상 매장을 고치는 데 씁니다.</p>
        </div>

        <ol className={s.steps}>
          {STEPS.map((step, i) => {
            const m = step.media ? STEP_MEDIA[step.media] : null
            return (
              <li key={step.id} className={s.step}>
                {m ? (
                  <Picture item={m.item} className={s.media} sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 25vw" caption={false} position={m.pos} />
                ) : (
                  <div className={s.pending}>
                    <p>실물 영상은 검증을 마친 뒤 이 자리에 올립니다.</p>
                  </div>
                )}
                <div className={s.text}>
                  <span className={`wide num ${s.no}`} aria-hidden="true">
                    {i + 1}
                  </span>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                  <StatusText status={step.status} note={step.statusNote} />
                </div>
              </li>
            )
          })}
        </ol>
        <p className={s.footnote}>사진 세 장은 모두 Isaac Sim 6.2에서 가상 매장을 렌더링한 것입니다. 실제 매장이나 실제 로봇을 찍은 사진이 아닙니다.</p>
      </div>
    </section>
  )
}

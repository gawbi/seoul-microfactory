import { Picture } from '../components/ui'
import { MEDIA } from '../data/media'
import { EXPERIMENT_LOG, METRICS } from '../data/validation'
import s from './Evidence.module.css'

export function Evidence() {
  const sim = EXPERIMENT_LOG.filter((e) => e.kind === 'SIMULATION')
  const real = EXPERIMENT_LOG.filter((e) => e.kind === 'REAL')
  return (
    <section id="evidence" className={`section ${s.section}`} aria-labelledby="evidence-title">
      <div className="container">
        <h2 id="evidence-title" className={`h2 ${s.title}`}>
          확인한 것과 아직인 것을 나눠 적습니다.
        </h2>

        <div className={s.cols}>
          <div className={s.col}>
            <h3>시뮬레이션에서 확인한 것</h3>
            <p className={s.colLead}>Isaac Sim 6.2 가상 매장에서 SO-101로 작업대 위 3 cm 상자를 집어 트레이에 옮겼습니다.</p>
            <table className={s.log}>
              <thead>
                <tr>
                  <th scope="col">날짜</th>
                  <th scope="col">결과</th>
                  <th scope="col">기록</th>
                </tr>
              </thead>
              <tbody>
                {sim.map((e) => (
                  <tr key={e.task}>
                    <td className="num">{e.date}</td>
                    <td className="num">
                      {e.success}/{e.trials} 성공
                    </td>
                    <td>{e.note.replace('Isaac Sim 6.2. ', '')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className={s.small}>시도 횟수가 적어서 성공률로 부르지 않습니다. 반복 실험을 늘린 뒤 성공률을 적겠습니다.</p>
          </div>

          <div className={s.col}>
            <h3>실제 로봇으로는 아직</h3>
            <p className={s.colLead}>
              실제 매장 스캔과 SO-ARM101 실험은 하지 않았습니다. {real.length === 0 && '아래 항목은 실험을 마친 뒤 숫자로 채웁니다.'}
            </p>
            <ul className={s.metrics}>
              {METRICS.map((m) => (
                <li key={m.id}>
                  <div>
                    <strong>{m.label}</strong>
                    <span>{m.method}</span>
                  </div>
                  <em className="num">{m.value === null ? '측정 전' : `${m.value} ${m.unit}`}</em>
                </li>
              ))}
            </ul>
            <Picture item={MEDIA.go2Front} className={s.photo} sizes="(max-width: 900px) 100vw, 40vw" />
          </div>
        </div>
      </div>
    </section>
  )
}

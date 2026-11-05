import { StatusText } from '../components/ui'
import { REPORT } from '../data/project'
import s from './Report.module.css'

const won = (n: number | null) => (n === null ? '산출 전' : `${n.toLocaleString('ko-KR')}원`)

export function Report() {
  const total = REPORT.quote.every((q) => q.amount !== null) ? REPORT.quote.reduce((a, q) => a + (q.amount ?? 0), 0) : null
  return (
    <section id="report" className="section" aria-labelledby="report-title">
      <div className={`container ${s.grid}`}>
        <div className={s.text}>
          <h2 id="report-title" className="h2">
            {REPORT.title}
          </h2>
          <p className={s.lead}>{REPORT.body}</p>
          <ul className={s.basis}>
            {REPORT.basis.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
          <StatusText status={REPORT.status} note="진단서 양식만 정해진 상태입니다. 금액은 아직 넣지 않았습니다." />
        </div>

        <div className={s.paperWrap}>
          <article className={s.paper} aria-label="매장 진단서 견본">
            <span className={s.stamp} aria-hidden="true">
              견본
            </span>
            <header className={s.paperHead}>
              <p className="wide">SEOUL MICROFACTORY</p>
              <h3>매장 진단서</h3>
              <p>{REPORT.sample}</p>
            </header>

            <div className={s.block}>
              <h4>진단</h4>
              <dl>
                {REPORT.diagnosis.map((d) => (
                  <div key={d.k} className={s.row}>
                    <dt>{d.k}</dt>
                    <dd>{d.v}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className={s.block}>
              <h4>추천 로봇</h4>
              <dl>
                {REPORT.robots.map((r) => (
                  <div key={r.name} className={s.row}>
                    <dt>{r.name}</dt>
                    <dd>{r.fit}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className={s.block}>
              <h4>도입 견적</h4>
              <table className={s.quote}>
                <tbody>
                  {REPORT.quote.map((q) => (
                    <tr key={q.item}>
                      <th scope="row">
                        {q.item}
                        <span>{q.detail}</span>
                      </th>
                      <td className="num">{won(q.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th scope="row">합계</th>
                    <td className="num">{won(total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <p className={s.paperFoot}>금액은 공급사 단가와 설치 범위가 정해진 뒤에 채웁니다.</p>
          </article>
        </div>
      </div>
    </section>
  )
}

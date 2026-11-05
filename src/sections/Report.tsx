import { KindTag, Reveal, SectionHeader, StatusBadge } from '../components/ui'
import { REPORT } from '../data/project'
import s from './Report.module.css'

const STEPS = [
  { t: '매장 진단', b: '스캔한 공간과 작업 관찰 기록을 합쳐, 로봇이 다닐 수 있는 곳과 맡을 만한 일을 추립니다.' },
  { t: '로봇 매칭', b: '후보 작업마다 필요한 도달 거리, 들어 올릴 무게, 설치 공간을 보고 맞는 로봇 등급을 고릅니다.' },
  { t: '가상 검증', b: '디지털 트윈에 추천 로봇을 놓고 실제로 작업이 되는지 먼저 돌려 봅니다. 안 되는 조합은 여기서 빠집니다.' },
  { t: '도입 견적', b: '통과한 조합으로 본체, 그리퍼, 설치, 셋업, 유지보수 항목을 나눠 견적을 냅니다.' },
]

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`

export function Report() {
  const total = REPORT.quote.every((q) => q.amount !== null) ? REPORT.quote.reduce((a, q) => a + (q.amount ?? 0), 0) : null
  return (
    <section id="report" className="section" aria-labelledby="report-title">
      <div className="container">
        <SectionHeader
          index="06"
          label="Robot-ready report"
          title={<span id="report-title">어떤 로봇을, 얼마에 들일 수 있는지까지.</span>}
          lead="분석은 점주가 판단할 수 있는 형태로 끝나야 합니다. 매장 진단, 추천 로봇, 도입 견적을 한 장의 리포트로 정리해 드립니다."
        />
        <div className={s.grid}>
          <Reveal className={s.doc}>
            <div className={s.docHead}>
              <div className={s.docTitle}>
                <strong>ROBOT-READY REPORT</strong>
                <span>{REPORT.sample}</span>
              </div>
              <KindTag kind="CONCEPT" />
            </div>

            <div className={s.block}>
              <p className={`mono ${s.blockTitle}`}>
                <span>01</span>
                <span>Store diagnosis</span>
              </p>
              <dl className={s.kv}>
                {REPORT.diagnosis.map((d) => (
                  <div key={d.k} style={{ display: 'contents' }}>
                    <dt>{d.k}</dt>
                    <dd>{d.v}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className={s.block}>
              <p className={`mono ${s.blockTitle}`}>
                <span>02</span>
                <span>Recommended robots</span>
              </p>
              <ol className={s.robots}>
                {REPORT.robots.map((r, i) => (
                  <li key={r.name} className={s.robot}>
                    <span className={s.rank}>{String(i + 1).padStart(2, '0')}</span>
                    <b>{r.name}</b>
                    <em>{r.note}</em>
                    <small>{r.fit}</small>
                  </li>
                ))}
              </ol>
            </div>

            <div className={s.block}>
              <p className={`mono ${s.blockTitle}`}>
                <span>03</span>
                <span>Deployment quote</span>
              </p>
              <table className={s.quote}>
                <tbody>
                  {REPORT.quote.map((q) => (
                    <tr key={q.item}>
                      <td>{q.item}</td>
                      <td>{q.detail}</td>
                      <td>{q.amount === null ? <span className={s.tbd}>산출 전</span> : won(q.amount)}</td>
                    </tr>
                  ))}
                  <tr className={s.total}>
                    <td>합계</td>
                    <td />
                    <td>{total === null ? <span className={s.tbd}>산출 전</span> : won(total)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Reveal>

          <Reveal className={s.side} delay={80}>
            <StatusBadge status={REPORT.status} />
            <ol className={s.steps}>
              {STEPS.map((st, i) => (
                <li key={st.t}>
                  <span>{String(i + 1).padStart(2, '0')}</span>
                  <h3>{st.t}</h3>
                  <p>{st.b}</p>
                </li>
              ))}
            </ol>
            <div className={s.basis}>
              <strong className="mono">견적 기준</strong>
              {REPORT.basis.map((b) => (
                <p key={b}>{b}</p>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

import { MediaSlot } from '../components/MediaSlot'
import { KindTag, Reveal, SectionHeader, StatusBadge } from '../components/ui'
import { MEDIA } from '../data/media'
import { MODULES } from '../data/project'
import { EXPERIMENT_LOG, METRICS, TASK_EXAMPLES } from '../data/validation'
import { ArmDiagram } from '../visuals/ArmDiagram'
import s from './RobotValidation.module.css'

const status = MODULES.find((m) => m.id === 'validation')!.status

export function RobotValidation() {
  return (
    <section id="validation" className="section" aria-labelledby="validation-title">
      <div className="container">
        <SectionHeader
          index="07"
          label="Robot validation"
          title={<span id="validation-title">시뮬레이션의 답을 실제 로봇 팔로 확인합니다.</span>}
          lead="가상 환경에서 고른 작업이 실제로도 되는지는 직접 해 봐야 압니다. 오픈소스 매니퓰레이터 SO-ARM101로 같은 작업을 반복하고, 결과를 시뮬레이션과 나란히 기록합니다."
        />
        <div className={s.top}>
          <Reveal>
            <div className={s.armBox}>
              <KindTag kind="CONCEPT" className={s.armTag} />
              <ArmDiagram title="SO-ARM101로 작업대 위 물체를 집어 옮기는 Pick & Place 과정을 단순화한 애니메이션" />
              <div className={`mono ${s.armFoot}`}>
                <span>Pick &amp; Place · side view</span>
                <span>Simplified 2-link model</span>
              </div>
            </div>
          </Reveal>
          <Reveal className={s.role} delay={80}>
            <StatusBadge status={status} />
            <p>
              SO-ARM101은 LeRobot 생태계에서 많이 쓰는 오픈소스 로봇 팔로, 관절 5개와 그리퍼로 이루어져 있습니다. 매장 작업대에 올려도 부담 없는 크기라서, 소상공인 매장에 실제로 들어갈 수 있는 수준의 로봇으로 검증한다는 의미가 있습니다.
            </p>
            <ul className={s.tasks}>
              {TASK_EXAMPLES.map((t, i) => (
                <li key={t.title}>
                  <span>T{i + 1}</span>
                  <h3>{t.title}</h3>
                  <p>{t.body}</p>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>

        <Reveal>
          <div className={s.metricsHead}>
            <h3>Validation results</h3>
            <p>실제 로봇 실험 전입니다. 아래 지표는 실제 SO-ARM101로 측정한 값만 채웁니다.</p>
          </div>
          <div className={s.metrics}>
            {METRICS.map((m) => (
              <div className={s.metric} key={m.id}>
                <span className="mono">{m.label}</span>
                {m.value === null ? (
                  <span className={s.empty}>Not yet measured</span>
                ) : (
                  <span className={s.value}>
                    {m.value}
                    <small> {m.unit}</small>
                  </span>
                )}
                <p>{m.method}</p>
              </div>
            ))}
          </div>

          <div className={s.log}>
            <div className={`mono ${s.logHead}`}>
              <span>Experiment log</span>
              <span>{EXPERIMENT_LOG.length} entries</span>
            </div>
            <div className={s.tableWrap}>
              {EXPERIMENT_LOG.length === 0 ? (
                <p className={s.tableEmpty}>기록된 실험이 없습니다.</p>
              ) : (
                <table className={s.table}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Task</th>
                      <th>Kind</th>
                      <th>Success / Trials</th>
                      <th>Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {EXPERIMENT_LOG.map((e) => (
                      <tr key={`${e.date}-${e.task}`}>
                        <td>{e.date}</td>
                        <td>{e.task}</td>
                        <td>{e.kind}</td>
                        <td>
                          {e.success} / {e.trials}
                        </td>
                        <td>{e.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className={s.videoRow}>
            <div>
              <span className={`mono ${s.rowLabel}`}>Simulation · 완료</span>
              <MediaSlot item={MEDIA.simArm} sizes="(max-width: 760px) 100vw, 50vw" />
            </div>
            <div>
              <span className={`mono ${s.rowLabel}`}>Real robot · 예정</span>
              <MediaSlot item={MEDIA.soArmVideo} />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

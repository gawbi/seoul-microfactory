import { SITE } from '../config/site'
import { CREDITS, MEDIA } from '../data/media'
import { CLOSING, TECH_STACK } from '../data/project'
import { TECH_STATUS_LABEL } from '../data/types'
import s from './Footer.module.css'

/** 이 사이트에 실제로 나오는 사진만 출처를 적는다. */
const USED_PHOTOS = [MEDIA.go2Front]

export function Footer() {
  const credits = CREDITS.filter((c) => USED_PHOTOS.some((m) => m.creditId === c.id))
  return (
    <footer className={`night ${s.footer}`}>
      <div className="container">
        <div className={s.closing}>
          <p className={s.closingTitle}>{CLOSING.title}</p>
          <p className={s.closingBody}>{CLOSING.body}</p>
        </div>

        <div className={s.cols}>
          <div className={s.stack}>
            <h2>쓰고 있는 것과 쓸 것</h2>
            <dl>
              {TECH_STACK.map((g) => (
                <div key={g.category}>
                  <dt>{g.category}</dt>
                  <dd>
                    {g.items.map((t, i) => (
                      <span key={t.name} data-status={t.status}>
                        {t.name}
                        <small> {TECH_STATUS_LABEL[t.status]}</small>
                        {i < g.items.length - 1 && <span aria-hidden="true">, </span>}
                      </span>
                    ))}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className={s.notes}>
            <h2>이미지에 대해</h2>
            <p>
              Isaac Sim 렌더는 모두 가상 매장 시뮬레이션입니다. 매장 배치는 실측이 아닌 가정이고, Go2 등의 짐벌은 단순화한 모델입니다. 렌더 스크립트는 저장소의 <code>sim/</code> 폴더에 있습니다.
            </p>
            {credits.map((c) => (
              <p key={c.id}>
                실제 사진:{' '}
                <a href={c.pageUrl} target="_blank" rel="noreferrer noopener">
                  {c.title}
                </a>
                , {c.author},{' '}
                <a href={c.licenseUrl} target="_blank" rel="noreferrer noopener">
                  {c.license}
                </a>
                . {c.modified}. 짐벌이 없는 Go2 기본형입니다.
              </p>
            ))}
            {SITE.repoUrl && (
              <p>
                <a href={SITE.repoUrl} target="_blank" rel="noreferrer noopener">
                  GitHub 저장소 보기
                </a>
              </p>
            )}
          </div>
        </div>

        <div className={s.base}>
          <p className="wide">SEOUL MICROFACTORY</p>
          <p>
            Unitree와 Go2는 Unitree Robotics, NVIDIA와 Isaac Sim은 NVIDIA Corporation의 상표입니다. 이 프로젝트는 두 회사와 제휴 관계가 없습니다. © {SITE.year}
          </p>
        </div>
      </div>
    </footer>
  )
}

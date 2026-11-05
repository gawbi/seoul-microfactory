import { SITE } from '../config/site'
import { CREDITS } from '../data/media'
import { Logo } from './Logo'
import s from './Footer.module.css'

export function Footer() {
  return (
    <footer className={s.footer} id="credits">
      <div className="container">
        <div className={s.top}>
          <div className={s.brand}>
            <p>
              <Logo size={20} /> SEOUL MICROFACTORY
            </p>
            <p>소상공인 매장을 위한 Physical AI 프로젝트. 기획·개발 단계이며, 표시된 상태값은 실제 진행 상황에 맞춰 갱신합니다.</p>
            {SITE.repoUrl && (
              <a href={SITE.repoUrl} target="_blank" rel="noreferrer noopener">
                GitHub repository
              </a>
            )}
          </div>
          <div className={s.credits}>
            <h3 className="mono">Image credits</h3>
            <ul>
              {CREDITS.map((c) => (
                <li key={c.id}>
                  <a href={c.pageUrl} target="_blank" rel="noreferrer noopener">
                    “{c.title}”
                  </a>
                  <a href={c.licenseUrl} target="_blank" rel="noreferrer noopener">
                    {c.license}
                  </a>
                  <small>
                    {c.author} · {c.modified}
                  </small>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className={s.legal}>
          <p>
            Unitree, Go2는 Unitree Robotics의, NVIDIA와 Isaac Sim은 NVIDIA Corporation의 상표입니다. 이 프로젝트는 두 회사와 제휴 관계가 없습니다.
          </p>
          <p>
            © {SITE.year} SEOUL MICROFACTORY
          </p>
        </div>
      </div>
    </footer>
  )
}

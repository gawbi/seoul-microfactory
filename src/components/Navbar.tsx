import { Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { NAV } from '../data/project'
import { useActiveSection } from '../hooks/useActiveSection'
import s from './Navbar.module.css'

const IDS = NAV.map((n) => n.id)

export function Navbar() {
  const active = useActiveSection(IDS)
  const [open, setOpen] = useState(false)
  const [onHero, setOnHero] = useState(true)

  useEffect(() => {
    const on = () => setOnHero(window.scrollY < window.innerHeight - 64)
    on()
    window.addEventListener('scroll', on, { passive: true })
    window.addEventListener('resize', on)
    return () => {
      window.removeEventListener('scroll', on)
      window.removeEventListener('resize', on)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <nav className={s.nav} data-hero={onHero && !open} aria-label="주요 섹션">
      <div className={`container ${s.inner}`}>
        <a href="#top" className={`wide ${s.brand}`} aria-label="SEOUL MICROFACTORY 처음으로">
          SEOUL MICROFACTORY
        </a>
        <ul className={s.links}>
          {NAV.map((n) => (
            <li key={n.id}>
              <a href={`#${n.id}`} aria-current={active === n.id}>
                {n.label}
              </a>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className={`pressable ${s.toggle}`}
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? '메뉴 닫기' : '메뉴 열기'}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
      <div id="mobile-menu" className={s.sheet} data-open={open} inert={!open}>
        <ul>
          {NAV.map((n) => (
            <li key={n.id}>
              <a href={`#${n.id}`} aria-current={active === n.id} onClick={() => setOpen(false)}>
                {n.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}

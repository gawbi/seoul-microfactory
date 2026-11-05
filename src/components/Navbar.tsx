import { Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { NAV } from '../data/project'
import { useActiveSection } from '../hooks/useActiveSection'
import { Logo } from './Logo'
import s from './Navbar.module.css'

const IDS = NAV.map((n) => n.id)

export function Navbar() {
  const active = useActiveSection(IDS)
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 12)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <nav className={`${s.nav} ${scrolled || open ? s.scrolled : ''}`} aria-label="주요 섹션">
      <div className={`container ${s.inner}`}>
        <a href="#top" className={s.brand} aria-label="SEOUL MICROFACTORY 처음으로">
          <Logo />
          <span>SEOUL MICROFACTORY</span>
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
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>
      <div id="mobile-menu" className={s.sheet} data-open={open} inert={!open}>
        <ul>
          {NAV.map((n, i) => (
            <li key={n.id}>
              <a href={`#${n.id}`} aria-current={active === n.id} onClick={() => setOpen(false)}>
                {n.label}
                <span>{String(i + 2).padStart(2, '0')}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}

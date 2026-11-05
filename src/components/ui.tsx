import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { MEDIA_KIND_LABEL, STATUS_LABEL, TECH_STATUS_LABEL, type MediaKind, type Status, type TechStatus } from '../data/types'
import s from './ui.module.css'

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`${s.badge} ${s[status]}`} title="진행 상태">
      {STATUS_LABEL[status]}
    </span>
  )
}

export function TechBadge({ status }: { status: TechStatus }) {
  return <span className={`${s.badge} ${s[status]}`}>{TECH_STATUS_LABEL[status]}</span>
}

export function KindTag({ kind, className = '', video = false }: { kind: MediaKind; className?: string; video?: boolean }) {
  return (
    <span className={`${s.kind} ${s[`kind_${kind}`]} ${className}`}>
      <i aria-hidden="true" />
      {video && kind === 'REAL_PHOTO' ? 'Real footage' : MEDIA_KIND_LABEL[kind]}
    </span>
  )
}

export function SectionHeader({ index, label, title, lead }: { index: string; label: string; title: ReactNode; lead?: ReactNode }) {
  return (
    <Reveal as="header" className={s.header}>
      <p className={`mono ${s.index}`}>
        {index} / {label}
      </p>
      <h2 className={s.title}>{title}</h2>
      {lead && <p className={s.lead}>{lead}</p>}
    </Reveal>
  )
}

/** 화면에 들어올 때 한 번 떠오르는 효과. reduced motion이면 CSS에서 바로 보인다. */
export function Reveal({
  as: Tag = 'div',
  delay = 0,
  className = '',
  children,
  style,
}: {
  as?: 'div' | 'header' | 'section' | 'article' | 'li' | 'figure'
  delay?: number
  className?: string
  children: ReactNode
  style?: CSSProperties
}) {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.classList.add('is-visible')
          io.disconnect()
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <Tag
      ref={ref as never}
      className={`reveal ${className}`}
      style={{ ...style, ['--reveal-delay' as string]: `${delay}ms` }}
    >
      {children}
    </Tag>
  )
}

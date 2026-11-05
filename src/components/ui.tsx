import { Pause, Play } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { asset } from '../config/site'
import { CREDITS, type MediaItem } from '../data/media'
import { STATUS_LABEL, type Status } from '../data/types'
import { useReducedMotion } from '../hooks/useReducedMotion'
import s from './ui.module.css'

/** 진행 상태. 가격표처럼 작은 표시 하나와 한국어 설명. */
export function StatusText({ status, note }: { status: Status; note?: string }) {
  return (
    <p className={s.status} data-status={status}>
      <i aria-hidden="true" />
      <span>
        <strong>{STATUS_LABEL[status]}</strong>
        {note && <span className={s.note}>{note}</span>}
      </span>
    </p>
  )
}

const KIND_TEXT = {
  SIMULATION: 'Isaac Sim 렌더',
  REAL_PHOTO: '실제 사진',
  CONCEPT: '설명용 그림',
  RECONSTRUCTION: '재구성 결과',
} as const

/** 이미지 + 캡션. 캡션 앞에는 항상 출처 종류(렌더/실제 사진)를 붙인다. */
export function Picture({
  item,
  sizes = '100vw',
  priority = false,
  className = '',
  caption = true,
  tone = 'day',
  position,
}: {
  item: MediaItem
  sizes?: string
  priority?: boolean
  className?: string
  caption?: boolean
  tone?: 'day' | 'night'
  /** object-position (자를 때 남길 위치) */
  position?: string
}) {
  const credit = item.creditId ? CREDITS.find((c) => c.id === item.creditId) : undefined
  return (
    <figure className={`${s.figure} ${className}`} data-tone={tone}>
      <div className={s.frame}>
        <img
          src={asset(item.src!)}
          srcSet={item.srcSet?.map((v) => `${asset(v.src)} ${v.width}w`).join(', ')}
          sizes={sizes}
          width={item.width}
          height={item.height}
          alt={item.alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          style={position ? { objectPosition: position } : undefined}
          {...(priority ? { fetchPriority: 'high' as const } : {})}
        />
      </div>
      {caption && (
        <figcaption className={s.caption}>
          <span className={s.kind}>{KIND_TEXT[item.kind]}</span>
          <span>{item.caption}</span>
          {credit && (
            <a href={credit.pageUrl} target="_blank" rel="noreferrer noopener">
              {credit.author.split(' (')[0]}, {credit.license}
            </a>
          )}
        </figcaption>
      )}
    </figure>
  )
}

/** 데모 영상. 소리가 없는 영상이라 재생/정지만 둔다. 화면 밖으로 나가면 멈춘다. */
export function Film({ item }: { item: MediaItem }) {
  const ref = useRef<HTMLVideoElement>(null)
  const reduced = useReducedMotion()
  const [wantPlay, setWantPlay] = useState(!reduced)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    const v = ref.current
    if (!v) return
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && wantPlay) v.play().catch(() => setWantPlay(false))
      else v.pause()
    })
    io.observe(v)
    return () => io.disconnect()
  }, [wantPlay])

  return (
    <div className={s.film}>
      <video
        ref={ref}
        src={asset(item.src!)}
        poster={item.poster ? asset(item.poster) : undefined}
        muted
        loop
        playsInline
        preload="metadata"
        aria-label={item.alt}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />
      <button
        type="button"
        className={`pressable ${s.play}`}
        onClick={() => {
          const v = ref.current
          if (!v) return
          if (v.paused) {
            setWantPlay(true)
            v.play().catch(() => undefined)
          } else {
            setWantPlay(false)
            v.pause()
          }
        }}
        aria-label={playing ? '영상 일시정지' : '영상 재생'}
      >
        {playing ? <Pause size={16} /> : <Play size={16} />}
        <span>{playing ? '일시정지' : '재생'}</span>
      </button>
    </div>
  )
}

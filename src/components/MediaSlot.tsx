import { Pause, Play, Volume2, VolumeX } from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { asset } from '../config/site'
import type { MediaItem } from '../data/media'
import { CREDITS } from '../data/media'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { KindTag } from './ui'
import s from './MediaSlot.module.css'

interface Props {
  item: MediaItem
  fit?: 'cover' | 'contain'
  /** 파일이 없을 때 대신 보여줄 내용 (없으면 "준비 중" 자리표시) */
  fallback?: ReactNode
  sizes?: string
  showCaption?: boolean
  showTag?: boolean
  className?: string
  imgClassName?: string
  style?: CSSProperties
  priority?: boolean
}

/**
 * 실제 미디어 파일과 자리표시를 오가는 슬롯.
 * data/media.ts에서 src만 채우면 실제 사진/영상으로 바뀐다.
 */
export function MediaSlot({ item, fit = 'cover', fallback, sizes = '100vw', showCaption = true, showTag = true, className = '', imgClassName = '', style, priority }: Props) {
  const credit = item.creditId ? CREDITS.find((c) => c.id === item.creditId) : undefined
  return (
    <figure className={className} style={{ margin: 0 }}>
      <div className={`${s.frame} ${fit === 'cover' ? s.cover : s.contain}`} style={style}>
        {showTag && <KindTag kind={item.kind} video={item.type === 'video'} className={s.tag} />}
        {item.src ? (
          item.type === 'video' ? (
            <VideoPlayer item={item} />
          ) : (
            <img
              className={imgClassName}
              src={asset(item.src)}
              srcSet={item.srcSet?.map((v) => `${asset(v.src)} ${v.width}w`).join(', ')}
              sizes={sizes}
              width={item.width}
              height={item.height}
              alt={item.alt}
              loading={priority ? 'eager' : 'lazy'}
              decoding="async"
              {...(priority ? { fetchPriority: 'high' as const } : {})}
            />
          )
        ) : (
          fallback ?? (
            <div className={s.pending} role="img" aria-label={`${item.caption}: 아직 준비되지 않음`}>
              <strong>{item.type === 'video' ? 'Footage pending' : 'Image pending'}</strong>
              <span>{item.caption}</span>
              {item.expectedPath && <code>{item.expectedPath}</code>}
            </div>
          )
        )}
      </div>
      {showCaption && (
        <figcaption className={s.caption}>
          <span>{item.caption}</span>
          {credit && (
            <a href={credit.pageUrl} target="_blank" rel="noreferrer noopener" title={`${credit.author}, ${credit.license}`}>
              Photo · {credit.author.split(' (')[0]} · {credit.license}
            </a>
          )}
        </figcaption>
      )}
    </figure>
  )
}

function VideoPlayer({ item }: { item: MediaItem }) {
  const ref = useRef<HTMLVideoElement>(null)
  const reduced = useReducedMotion()
  const [playing, setPlaying] = useState(!reduced)
  const [muted, setMuted] = useState(true)

  useEffect(() => {
    const v = ref.current
    if (!v) return
    if (playing) v.play().catch(() => setPlaying(false))
    else v.pause()
  }, [playing])

  return (
    <>
      <video
        ref={ref}
        src={asset(item.src!)}
        poster={item.poster ? asset(item.poster) : undefined}
        muted={muted}
        loop
        playsInline
        autoPlay={!reduced}
        preload="metadata"
        aria-label={item.alt}
      />
      <div className={s.controls}>
        <button type="button" onClick={() => setPlaying((p) => !p)} aria-label={playing ? '일시정지' : '재생'}>
          {playing ? <Pause size={15} /> : <Play size={15} />}
        </button>
        <button type="button" onClick={() => setMuted((m) => !m)} aria-label={muted ? '소리 켜기' : '소리 끄기'}>
          {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
        </button>
      </div>
    </>
  )
}

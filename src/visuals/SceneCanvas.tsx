import { useEffect, useRef } from 'react'
import type { SceneClock } from './sceneClock'
import { fitScene, type SceneState, type Viewport } from './sceneRenderer'

interface Props {
  clock: SceneClock
  draw: (ctx: CanvasRenderingContext2D, st: SceneState, vp: Viewport) => void
  zoom?: number
  focus?: { x: number; y: number }
  className?: string
  label: string
}

/** 장면 시계에 맞춰 다시 그리는 캔버스. 크기 변화와 DPR을 처리한다. */
export function SceneCanvas({ clock, draw, zoom = 1, focus, className, label }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)
  const drawRef = useRef(draw)
  drawRef.current = draw
  const view = useRef({ zoom, focus })
  view.current = { zoom, focus }

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let w = 0
    let h = 0
    let dpr = 1
    let last: SceneState | null = null

    const paint = (st: SceneState) => {
      last = st
      if (!w || !h) return
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const vp = fitScene(ctx, w, h, dpr, view.current.zoom, view.current.focus)
      drawRef.current(ctx, st, vp)
    }

    const ro = new ResizeObserver(([entry]) => {
      const r = entry.contentRect
      w = r.width
      h = r.height
      // 모바일은 픽셀 밀도를 낮춰 부담을 줄인다
      dpr = Math.min(window.devicePixelRatio || 1, w < 600 ? 1.5 : 2)
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      if (last) paint(last)
    })
    ro.observe(canvas)
    const unsub = clock.subscribe(paint)
    return () => {
      ro.disconnect()
      unsub()
    }
  }, [clock])

  // zoom/focus만 바뀌었을 때도 다시 그린다
  useEffect(() => {
    clock.emit(clock.last)
  }, [zoom, focus?.x, focus?.y, clock])

  return <canvas ref={ref} className={className} role="img" aria-label={label} />
}

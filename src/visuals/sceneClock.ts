import { useEffect, useMemo, type RefObject } from 'react'
import { finalScene, sceneAt, type SceneState } from './sceneRenderer'

type Listener = (st: SceneState) => void

export class SceneClock {
  time = 0
  last: SceneState = finalScene()
  frozen = false
  private listeners = new Set<Listener>()

  subscribe(fn: Listener) {
    this.listeners.add(fn)
    fn(this.last)
    return () => {
      this.listeners.delete(fn)
    }
  }
  emit(st: SceneState) {
    this.last = st
    this.listeners.forEach((l) => l(st))
  }
  tick(dt: number) {
    this.time += dt
    this.emit(sceneAt(this.time))
  }
  restart() {
    this.time = 0
    this.emit(sceneAt(0))
  }
}

/**
 * 장면 시계. root 요소가 화면에 보이고, 탭이 활성 상태이고, reduced motion이 아닐 때만 돈다.
 * reduced motion이면 결과 화면(finalScene)을 한 번만 그린다.
 */
export function useSceneClock(root: RefObject<HTMLElement | null>, reduced: boolean, paused = false) {
  const clock = useMemo(() => new SceneClock(), [])

  useEffect(() => {
    if (reduced) {
      clock.emit(finalScene())
      return
    }
    let visible = false
    let raf = 0
    let prev = 0
    const loop = (now: number) => {
      const dt = prev ? Math.min(0.05, (now - prev) / 1000) : 0
      prev = now
      clock.tick(dt)
      raf = requestAnimationFrame(loop)
    }
    const update = () => {
      const run = visible && !document.hidden && !paused
      if (run && !raf) {
        prev = 0
        raf = requestAnimationFrame(loop)
      } else if (!run && raf) {
        cancelAnimationFrame(raf)
        raf = 0
      }
    }
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      update()
    })
    if (root.current) io.observe(root.current)
    document.addEventListener('visibilitychange', update)
    update()
    return () => {
      io.disconnect()
      document.removeEventListener('visibilitychange', update)
      if (raf) cancelAnimationFrame(raf)
      raf = 0
    }
  }, [clock, root, reduced, paused])

  return clock
}

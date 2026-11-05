import { prepareCloud, type PreparedCloud } from './sceneRenderer'
import { buildCloud } from './storeModel'

const cache = new Map<number, PreparedCloud>()

/** 화면 크기에 따라 점 밀도를 정해 한 번만 만든다. */
export function getCloud(): PreparedCloud {
  const density = typeof window !== 'undefined' && window.innerWidth < 700 ? 0.5 : 1
  let c = cache.get(density)
  if (!c) {
    c = prepareCloud(buildCloud(density))
    cache.set(density, c)
  }
  return c
}

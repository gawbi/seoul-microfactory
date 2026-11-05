/*
 * 포인트 → 메시 변환을 보여주는 개념도. 선반 하나를 예로 들었다.
 */

function seeded(n: number) {
  let s = 11
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647)
  return Array.from({ length: n }, () => [r(), r()] as const)
}

const PTS = seeded(170)

export function ReconDiagram({ className, title }: { className?: string; title: string }) {
  // 선반 정면(120 x 150)을 기준으로 왼쪽은 점, 오른쪽은 메시
  const shelf = (ox: number) => ({ x: ox, y: 60, w: 120, h: 160 })
  const L = shelf(40)
  const R = shelf(260)
  const rows = 5
  const cols = 4
  return (
    <svg className={className} viewBox="0 0 420 260" role="img" aria-label={title}>
      <g>
        {PTS.map(([u, v], i) => {
          const onEdge = i % 3 === 0
          const x = L.x + (onEdge ? (i % 2 ? 0 : 1) * L.w + (u - 0.5) * 4 : u * L.w)
          const y = L.y + (onEdge ? v * L.h : Math.round(v * 4) * (L.h / 4) + (u - 0.5) * 5)
          return <circle key={i} cx={x} cy={y} r="1.4" fill={y < 110 ? 'var(--white)' : 'var(--cyan)'} opacity={0.4 + v * 0.5} />
        })}
      </g>
      <g stroke="rgba(159,230,247,0.55)" strokeWidth="0.8" fill="none">
        {Array.from({ length: rows }).map((_, r) =>
          Array.from({ length: cols }).map((__, c) => {
            const x0 = R.x + (c * R.w) / cols
            const y0 = R.y + (r * R.h) / rows
            const x1 = R.x + ((c + 1) * R.w) / cols
            const y1 = R.y + ((r + 1) * R.h) / rows
            return <path key={`${r}-${c}`} d={`M${x0} ${y0}H${x1}V${y1}H${x0}Z M${x0} ${y0}L${x1} ${y1}`} />
          }),
        )}
      </g>
      <rect x={R.x} y={R.y} width={R.w} height={R.h} fill="rgba(95,212,240,0.05)" stroke="var(--cyan)" strokeWidth="1.2" />
      <g stroke="var(--line-3)" fill="none">
        <path d="M178 140 H242" strokeDasharray="3 4" />
        <path d="M236 134 L243 140 L236 146" />
      </g>
      <text x={L.x + L.w / 2} y={248} textAnchor="middle" fill="var(--muted)" style={{ font: '500 10px var(--font-mono)', letterSpacing: '.1em' }}>
        POINT CLOUD
      </text>
      <text x={R.x + R.w / 2} y={248} textAnchor="middle" fill="var(--muted)" style={{ font: '500 10px var(--font-mono)', letterSpacing: '.1em' }}>
        MESH
      </text>
      <text x={210} y={128} textAnchor="middle" fill="var(--muted)" style={{ font: '500 9px var(--font-mono)', letterSpacing: '.1em' }}>
        REGISTER
      </text>
    </svg>
  )
}

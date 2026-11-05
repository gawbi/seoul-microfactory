import { ARM_BASE, FIXTURES, PATH, ROOM, WORK_ZONE } from './storeModel'

/*
 * 매장 평면도 (위에서 본 모습). Problem, Solution 섹션에서 쓴다.
 * storeModel의 같은 형상을 쓰므로 3D 장면과 배치가 일치한다.
 */

const U = 100
const P = 44

interface Marker {
  no: string
  x: number
  y: number
}

interface Props {
  markers?: Marker[]
  active?: string | null
  onMarker?: (no: string) => void
  path?: boolean
  zones?: boolean
  obstacles?: boolean
  dims?: boolean
  labels?: boolean
  className?: string
  title: string
}

export function PlanView({ markers = [], active, onMarker, path, zones, obstacles, dims = true, labels = true, className, title }: Props) {
  const w = ROOM.w * U
  const h = ROOM.d * U
  return (
    <svg className={className} viewBox={`${-P} ${-P} ${w + P * 2} ${h + P * 2 + 30}`} role="img" aria-label={title}>
      <defs>
        <pattern id="plan-grid" width={U / 2} height={U / 2} patternUnits="userSpaceOnUse">
          <path d={`M ${U / 2} 0 L 0 0 0 ${U / 2}`} fill="none" stroke="rgba(150,180,215,0.07)" strokeWidth="1" />
        </pattern>
        <pattern id="plan-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(231,180,92,0.35)" strokeWidth="1.5" />
        </pattern>
      </defs>
      <rect x={0} y={0} width={w} height={h} fill="url(#plan-grid)" />
      {/* walls with door gap on the front side */}
      <path
        d={`M ${ROOM.door.x0 * U} ${h} L 0 ${h} L 0 0 L ${w} 0 L ${w} ${h} L ${ROOM.door.x1 * U} ${h}`}
        fill="none"
        stroke="rgba(232,238,245,0.7)"
        strokeWidth="3"
      />
      <line x1={ROOM.door.x0 * U} y1={h} x2={ROOM.door.x1 * U} y2={h} stroke="rgba(95,212,240,0.6)" strokeWidth="1.5" strokeDasharray="4 5" />
      {labels && (
        <text x={((ROOM.door.x0 + ROOM.door.x1) / 2) * U} y={h + 22} textAnchor="middle" className="plan-label">
          ENTRANCE
        </text>
      )}

      {obstacles &&
        FIXTURES.filter((f) => f.z0 === 0 && f.kind !== 'leg').map((f) => (
          <rect key={`o-${f.id}`} x={(f.x0 - 0.22) * U} y={(f.y0 - 0.22) * U} width={(f.x1 - f.x0 + 0.44) * U} height={(f.y1 - f.y0 + 0.44) * U} fill="url(#plan-hatch)" stroke="rgba(231,180,92,0.4)" strokeDasharray="3 3" />
        ))}

      {zones && (
        <g>
          <rect x={WORK_ZONE.x0 * U} y={WORK_ZONE.y0 * U} width={(WORK_ZONE.x1 - WORK_ZONE.x0) * U} height={(WORK_ZONE.y1 - WORK_ZONE.y0) * U} fill="rgba(95,212,240,0.1)" stroke="rgba(95,212,240,0.85)" strokeWidth="1.5" />
          <circle cx={ARM_BASE.x * U} cy={ARM_BASE.y * U} r={ARM_BASE.reach * U} fill="none" stroke="rgba(236,246,252,0.7)" strokeDasharray="5 4" />
          <circle cx={ARM_BASE.x * U} cy={ARM_BASE.y * U} r={5} fill="var(--white)" />
        </g>
      )}

      {FIXTURES.filter((f) => f.kind !== 'leg' && f.kind !== 'item' && f.kind !== 'pos').map((f) => (
        <g key={f.id}>
          <rect x={f.x0 * U} y={f.y0 * U} width={(f.x1 - f.x0) * U} height={(f.y1 - f.y0) * U} fill="rgba(150,180,215,0.07)" stroke="rgba(150,180,215,0.45)" strokeWidth="1.2" />
          {labels && f.label && (
            <text
              x={((f.x0 + f.x1) / 2) * U}
              y={((f.y0 + f.y1) / 2) * U}
              textAnchor="middle"
              dominantBaseline="central"
              className="plan-label"
              transform={f.kind === 'fridge' ? `rotate(-90 ${((f.x0 + f.x1) / 2) * U} ${((f.y0 + f.y1) / 2) * U})` : undefined}
            >
              {f.label}
            </text>
          )}
        </g>
      ))}
      {FIXTURES.filter((f) => f.kind === 'item').map((f) => (
        <rect key={f.id} x={f.x0 * U} y={f.y0 * U} width={(f.x1 - f.x0) * U} height={(f.y1 - f.y0) * U} fill="rgba(232,238,245,0.55)" />
      ))}

      {path && (
        <polyline points={PATH.map(([x, y]) => `${x * U},${Math.min(y, ROOM.d + 0.35) * U}`).join(' ')} fill="none" stroke="var(--cyan)" strokeWidth="2" strokeDasharray="2 6" strokeLinecap="round" />
      )}

      {dims && (
        <g className="plan-dim">
          <line x1={0} y1={-22} x2={w} y2={-22} />
          <line x1={0} y1={-28} x2={0} y2={-16} />
          <line x1={w} y1={-28} x2={w} y2={-16} />
          <text x={w / 2} y={-30} textAnchor="middle">
            {ROOM.w.toFixed(1)} m
          </text>
          <line x1={w + 22} y1={0} x2={w + 22} y2={h} />
          <line x1={w + 16} y1={0} x2={w + 28} y2={0} />
          <line x1={w + 16} y1={h} x2={w + 28} y2={h} />
          <text x={w + 34} y={h / 2} textAnchor="middle" transform={`rotate(90 ${w + 34} ${h / 2})`}>
            {ROOM.d.toFixed(1)} m
          </text>
        </g>
      )}

      {markers.map((m) => {
        const on = active === m.no
        return (
          <g
            key={m.no}
            transform={`translate(${m.x * U} ${m.y * U})`}
            className="plan-marker"
            data-active={on}
            onMouseEnter={onMarker ? () => onMarker(m.no) : undefined}
            style={{ cursor: onMarker ? 'pointer' : undefined }}
          >
            <circle r={on ? 30 : 22} fill="rgba(95,212,240,0.1)" stroke="rgba(95,212,240,0.4)" style={{ transition: 'r .35s' }} />
            <circle r={14} fill={on ? 'var(--cyan)' : 'var(--bg)'} stroke="var(--cyan)" strokeWidth="1.5" />
            <text textAnchor="middle" dominantBaseline="central" fill={on ? 'var(--bg)' : 'var(--cyan)'} style={{ font: '600 12px var(--font-mono)' }}>
              {m.no}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

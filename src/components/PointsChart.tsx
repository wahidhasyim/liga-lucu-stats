import { formatAngka } from '../lib/format'
import type { Riwayat } from '../stats/compute'

const W = 600
const H = 200
const PX = 28
const PT = 36
const PB = 32

export function PointsChart({ riwayat }: { riwayat: Riwayat[] }) {
  if (riwayat.length === 0) return null
  const max = Math.max(...riwayat.map((r) => r.poin), 1)
  const min = Math.min(...riwayat.map((r) => r.poin), 0)
  const step = riwayat.length > 1 ? (W - PX * 2) / (riwayat.length - 1) : 0
  const pts = riwayat.map((r, i) => ({
    r,
    x: riwayat.length > 1 ? PX + i * step : W / 2,
    y: PT + ((max - r.poin) / (max - min)) * (H - PT - PB),
  }))
  const tiap = Math.ceil(riwayat.length / 10)
  const tampilNilai = riwayat.length <= 12

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Grafik poin per sesi dari ${riwayat.length} sesi`}>
      <line className="chart-axis" x1={PX} x2={W - PX} y1={H - PB} y2={H - PB} />
      {pts.length > 1 && <polyline className="chart-line" points={pts.map((p) => `${p.x},${p.y}`).join(' ')} />}
      {pts.map((p, i) => (
        <g key={p.r.sesi.id}>
          <circle className={p.r.motm ? 'chart-dot motm' : 'chart-dot'} cx={p.x} cy={p.y} r={p.r.motm ? 7 : 5}>
            <title>{`Pekan ${p.r.sesi.pekan}: ${formatAngka(p.r.poin)} poin${p.r.motm ? ' (MOTM)' : ''}`}</title>
          </circle>
          {tampilNilai && (
            <text className="chart-val" x={p.x} y={p.y - 14} textAnchor="middle">
              {formatAngka(p.r.poin)}
            </text>
          )}
          {i % tiap === 0 && (
            <text className="chart-lbl" x={p.x} y={H - 8} textAnchor="middle">
              P{p.r.sesi.pekan}
            </text>
          )}
        </g>
      ))}
    </svg>
  )
}

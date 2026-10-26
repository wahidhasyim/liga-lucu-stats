import { Link } from 'react-router-dom'
import { formatAngka, formatDesimal, formatPersen } from '../lib/format'
import type { PlayerStats, StatKey } from '../stats/compute'

const KOLOM: { key: StatKey; label: string; title: string }[] = [
  { key: 'rating', label: 'Rating', title: 'Total poin' },
  { key: 'hadir', label: 'Hadir', title: 'Jumlah sesi' },
  { key: 'gol', label: 'Gol', title: 'Gol' },
  { key: 'assist', label: 'Ast', title: 'Assist' },
  { key: 'motm', label: 'MOTM', title: 'Man of the match' },
  { key: 'menang', label: 'M-S-K', title: 'Menang-seri-kalah' },
  { key: 'winRate', label: 'Win%', title: 'Persentase menang' },
  { key: 'poinPerSesi', label: 'Poin/S', title: 'Rata-rata poin per sesi' },
]

function cell(s: PlayerStats, key: StatKey): string {
  if (key === 'menang') return `${s.menang}-${s.seri}-${s.kalah}`
  if (key === 'winRate') return formatPersen(s.winRate)
  if (key === 'poinPerSesi') return formatDesimal(s.poinPerSesi)
  return formatAngka(s[key])
}

interface Props {
  rows: PlayerStats[]
  urut: StatKey
  onUrut: (key: StatKey) => void
}

export function StatTable({ rows, urut, onUrut }: Props) {
  return (
    <div className="table-scroll">
      <table className="stat-table">
        <thead>
          <tr>
            <th className="c-name">Pemain</th>
            {KOLOM.map((k) => (
              <th key={k.key} title={k.title} aria-sort={urut === k.key ? 'descending' : 'none'}>
                <button type="button" onClick={() => onUrut(k.key)}>
                  {k.label}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((s, i) => (
            <tr key={s.pemain.id}>
              <td className="c-name">
                <span className="c-rank">{i + 1}</span>
                <Link to={`/pemain/${s.pemain.id}`}>{s.pemain.nama}</Link>
                <span className="c-pos">{s.pemain.posisi}</span>
              </td>
              {KOLOM.map((k) => (
                <td key={k.key} className={urut === k.key ? 'sorted' : undefined}>
                  {cell(s, k.key)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

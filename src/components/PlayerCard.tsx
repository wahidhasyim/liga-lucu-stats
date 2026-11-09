import { Link } from 'react-router-dom'
import { formatDesimal, POSISI_LABEL } from '../lib/format'
import { jumlahLaga, kebobolanPerLaga, type PlayerStats } from '../stats/compute'
import { PlayerPhoto } from './PlayerPhoto'

export function PlayerCard({ stats }: { stats: PlayerStats }) {
  const { pemain } = stats
  return (
    <Link className="pcard" to={`/pemain/${pemain.id}`}>
      <PlayerPhoto pemain={pemain} size="md" />
      <div className="pcard-body">
        <div>
          <div className="disp pcard-name">{pemain.panggilan}</div>
          <div className="lbl mute">{POSISI_LABEL[pemain.posisi]}</div>
        </div>
        <div className="pcard-stats">
          {angka(stats).map(([nilai, label, judul]) => (
            <div key={label} title={judul}>
              <span className="pcard-val">{nilai}</span>
              <span className="lbl mute">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </Link>
  )
}

// Outfield: gol dan assist. Kiper: clean sheet dan rata-rata kebobolan per laga.
function angka(s: PlayerStats): [string, string, string][] {
  if (s.pemain.posisi === 'GK') {
    const main = jumlahLaga(s) > 0
    return [
      [main ? String(s.cleanSheet) : '–', 'CS', 'Clean sheet'],
      [main ? formatDesimal(kebobolanPerLaga(s)) : '–', 'Kbl', 'Rata-rata kebobolan per laga'],
    ]
  }
  const main = s.hadir > 0
  return [
    [main ? String(s.gol) : '–', 'Gol', 'Gol'],
    [main ? String(s.assist) : '–', 'Ast', 'Assist'],
  ]
}

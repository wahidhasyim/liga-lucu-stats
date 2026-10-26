import { Link } from 'react-router-dom'
import { formatAngka, POSISI_LABEL } from '../lib/format'
import type { PlayerStats } from '../stats/compute'
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
        <div className="pcard-rating" title="Rating">
          {stats.hadir > 0 ? formatAngka(stats.rating) : '–'}
        </div>
      </div>
    </Link>
  )
}

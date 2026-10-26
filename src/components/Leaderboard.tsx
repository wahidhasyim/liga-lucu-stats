import { Link } from 'react-router-dom'
import { formatAngka } from '../lib/format'
import type { PlayerStats, StatKey } from '../stats/compute'
import { PlayerPhoto } from './PlayerPhoto'

interface Props {
  judul: string
  statKey: StatKey
  items: PlayerStats[]
  lihatSemua?: string
}

export function Leaderboard({ judul, statKey, items, lihatSemua }: Props) {
  return (
    <section>
      <div className="sec-head">
        <h2 className="disp">{judul}</h2>
        {lihatSemua && (
          <Link className="lbl gold" to={lihatSemua}>
            Lihat semua
          </Link>
        )}
      </div>
      {items.length === 0 ? (
        <p className="lb-empty">Belum ada data.</p>
      ) : (
        <div className="lb-list ranked">
          {items.map((s, i) => (
            <Link key={s.pemain.id} className="lb-row" to={`/pemain/${s.pemain.id}`}>
              <span className="lb-rank">{String(i + 1).padStart(2, '0')}</span>
              <PlayerPhoto pemain={s.pemain} size="sm" />
              <div>
                <div className="lb-name">{s.pemain.nama}</div>
                <div className="lb-pos">{s.pemain.posisi}</div>
              </div>
              <span className="lb-val">{formatAngka(s[statKey])}</span>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}

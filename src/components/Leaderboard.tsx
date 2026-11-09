import { Link } from 'react-router-dom'
import { formatAngka, POSISI_LABEL } from '../lib/format'
import type { PlayerStats, StatKey } from '../stats/compute'
import { PlayerPhoto } from './PlayerPhoto'

interface Props {
  judul: string
  statKey: StatKey
  items: PlayerStats[]
  lihatSemua?: string
  // tampilan nilai dan keterangan sendiri, untuk papan yang bukan satu kolom statistik (papan kiper)
  nilai?: (s: PlayerStats) => string
  keterangan?: (s: PlayerStats) => string
  catatan?: string
}

export function Leaderboard({ judul, statKey, items, lihatSemua, nilai, keterangan, catatan }: Props) {
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
                <div className="lb-pos">{keterangan ? keterangan(s) : POSISI_LABEL[s.pemain.posisi]}</div>
              </div>
              <span className="lb-val">{nilai ? nilai(s) : formatAngka(s[statKey])}</span>
            </Link>
          ))}
        </div>
      )}
      {catatan && items.length > 0 && <p className="lb-note">{catatan}</p>}
    </section>
  )
}

import { useState } from 'react'
import { useLeague } from '../components/Layout'
import { PlayerCard } from '../components/PlayerCard'
import { POSISI_OPTIONS, Segmented, type FilterPosisi } from '../components/Segmented'
import { EmptyState } from '../components/StatusStates'
import { computePlayerStats } from '../stats/compute'

export default function Players() {
  const data = useLeague()
  const [q, setQ] = useState('')
  const [posisi, setPosisi] = useState<FilterPosisi>('ALL')
  const aktif = computePlayerStats(data).filter((s) => s.pemain.aktif)
  const query = q.trim().toLowerCase()
  const list = aktif.filter(
    (s) =>
      (posisi === 'ALL' || s.pemain.posisi === posisi) &&
      (!query || s.pemain.nama.toLowerCase().includes(query) || s.pemain.panggilan.toLowerCase().includes(query)),
  )

  return (
    <div className="wrap">
      <div className="lbl gold">Skuad</div>
      <h1 className="disp page-title">
        {aktif.length} pemain,
        <br />
        <span className="gold">satu lapangan.</span>
      </h1>
      <div className="filters">
        <input className="search" type="search" placeholder="Cari nama pemain" aria-label="Cari nama pemain" value={q} onChange={(e) => setQ(e.target.value)} />
        <Segmented label="Posisi" value={posisi} options={POSISI_OPTIONS} onChange={setPosisi} />
      </div>
      {list.length > 0 ? (
        <div className="grid">
          {list.map((s) => (
            <PlayerCard key={s.pemain.id} stats={s} />
          ))}
        </div>
      ) : (
        <EmptyState judul="Pemain tidak ditemukan" pesan="Coba kata kunci atau posisi lain." />
      )}
    </div>
  )
}

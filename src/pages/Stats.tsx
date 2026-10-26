import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useLeague } from '../components/Layout'
import { POSISI_OPTIONS, Segmented, type FilterPosisi } from '../components/Segmented'
import { StatTable } from '../components/StatTable'
import { EmptyState } from '../components/StatusStates'
import { computePlayerStats, isStatKey, sortBy, type Rentang } from '../stats/compute'

const RENTANG_OPTIONS: { value: Rentang; label: string }[] = [
  { value: 'semua', label: 'Semua waktu' },
  { value: 'bulan-ini', label: 'Bulan ini' },
]

export default function Stats() {
  const data = useLeague()
  const [params, setParams] = useSearchParams()
  const urutParam = params.get('urut')
  const urut = isStatKey(urutParam) ? urutParam : 'rating'
  const [rentang, setRentang] = useState<Rentang>('semua')
  const [posisi, setPosisi] = useState<FilterPosisi>('ALL')

  const rows = sortBy(
    computePlayerStats(data, rentang).filter((s) => s.pemain.aktif && s.hadir > 0 && (posisi === 'ALL' || s.pemain.posisi === posisi)),
    urut,
  )

  return (
    <div className="wrap">
      <div className="lbl gold">Statistik</div>
      <h1 className="disp page-title">
        Angka nggak
        <br />
        <span className="gold">bisa bohong.</span>
      </h1>
      <div className="filters">
        <Segmented label="Rentang waktu" value={rentang} options={RENTANG_OPTIONS} onChange={setRentang} />
        <Segmented label="Posisi" value={posisi} options={POSISI_OPTIONS} onChange={setPosisi} />
      </div>
      {rows.length > 0 ? (
        <StatTable rows={rows} urut={urut} onUrut={(k) => setParams({ urut: k }, { replace: true })} />
      ) : (
        <EmptyState judul={rentang === 'bulan-ini' ? 'Belum ada sesi bulan ini' : 'Belum ada data'} pesan="Coba ganti filter rentang waktu atau posisi." />
      )}
    </div>
  )
}

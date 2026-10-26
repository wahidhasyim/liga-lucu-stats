import { Link } from 'react-router-dom'
import { useLeague } from '../components/Layout'
import { EmptyState } from '../components/StatusStates'
import { formatTanggal } from '../lib/format'
import { barisSesi } from '../stats/compute'

export default function Sessions() {
  const data = useLeague()
  const list = [...data.sesi].reverse()

  return (
    <div className="wrap">
      <div className="lbl gold">Arsip</div>
      <h1 className="disp page-title">
        Tiap pekan
        <br />
        <span className="gold">ada ceritanya.</span>
      </h1>
      {list.length === 0 ? (
        <EmptyState judul="Belum ada pertandingan" pesan="Sesi muncul di sini setelah admin mengisi tab Sesi dan Statistik." />
      ) : (
        <div>
          {list.map((s) => {
            const baris = barisSesi(data, s.id)
            const gol = baris.reduce((n, b) => n + b.baris.gol, 0)
            const motm = baris
              .filter((b) => b.baris.motm)
              .map((b) => b.pemain.panggilan)
              .join(', ')
            return (
              <Link key={s.id} className="sesi-row" to={`/sesi/${s.id}`}>
                <div>
                  <div className="lbl mute">Pekan</div>
                  <div className="sesi-week">{s.pekan}</div>
                </div>
                <div className="sesi-meta">
                  <div className="sesi-date">{formatTanggal(s.tanggal)}</div>
                  <div className="mute">{[s.lokasi, `${baris.length} pemain`].filter(Boolean).join(' · ')}</div>
                  {motm && <div className="lbl gold">MOTM · {motm}</div>}
                </div>
                <div className="sesi-goals">
                  <div className="disp">{gol}</div>
                  <div className="lbl mute">Gol</div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

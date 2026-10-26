import { Link, useParams } from 'react-router-dom'
import { useLeague } from '../components/Layout'
import { PlayerPhoto } from '../components/PlayerPhoto'
import { EmptyState, NotFound } from '../components/StatusStates'
import type { Hasil } from '../data/types'
import { formatAngka, formatTanggal } from '../lib/format'
import { barisSesi } from '../stats/compute'

const GRUP: { hasil: Hasil | null; judul: string }[] = [
  { hasil: 'M', judul: 'Menang' },
  { hasil: 'S', judul: 'Seri' },
  { hasil: 'K', judul: 'Kalah' },
  { hasil: null, judul: 'Hasil belum dicatat' },
]

export default function SessionDetail() {
  const { id } = useParams()
  const data = useLeague()
  const sesi = data.sesi.find((s) => s.id === id)
  if (!sesi) return <NotFound pesan="Sesi tidak ditemukan." />

  const baris = barisSesi(data, sesi.id)
  const gol = baris.reduce((n, b) => n + b.baris.gol, 0)
  const assist = baris.reduce((n, b) => n + b.baris.assist, 0)

  return (
    <div className="wrap">
      <Link to="/sesi" className="lbl mute back">
        ← Semua sesi
      </Link>
      <div className="lbl gold">
        {formatTanggal(sesi.tanggal)}
        {sesi.lokasi && ` · ${sesi.lokasi}`}
      </div>
      <h1 className="disp page-title">Pekan {sesi.pekan}</h1>
      {sesi.catatan && <p className="note">{sesi.catatan}</p>}
      <div className="band">
        <div>
          <span className="lbl">Pemain</span>
          <span className="disp">{baris.length}</span>
        </div>
        <div>
          <span className="lbl">Gol</span>
          <span className="disp">{gol}</span>
        </div>
        <div>
          <span className="lbl">Assist</span>
          <span className="disp">{assist}</span>
        </div>
      </div>
      {baris.length === 0 ? (
        <EmptyState judul="Belum ada statistik" pesan="Admin belum mengisi tab Statistik untuk sesi ini." />
      ) : (
        GRUP.map((g) => {
          const isi = baris.filter((b) => b.baris.hasil === g.hasil)
          if (isi.length === 0) return null
          return (
            <section key={g.judul} className="block">
              <div className="sec-head">
                <h2 className="disp">{g.judul}</h2>
                <span className="lbl mute">{isi.length} pemain</span>
              </div>
              <div className="lb-list">
                {isi.map((b) => (
                  <Link key={b.pemain.id} className="lb-row no-rank" to={`/pemain/${b.pemain.id}`}>
                    <PlayerPhoto pemain={b.pemain} size="sm" />
                    <div>
                      <div className="lb-name">
                        {b.pemain.nama}
                        {b.baris.motm && <span className="badge-motm">MOTM</span>}
                      </div>
                      <div className="lb-pos">
                        {[b.pemain.posisi, b.baris.gol ? `${b.baris.gol} gol` : null, b.baris.assist ? `${b.baris.assist} assist` : null]
                          .filter(Boolean)
                          .join(' · ')}
                      </div>
                    </div>
                    <span className="lb-val" title="Poin sesi ini">
                      {formatAngka(b.poin)}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )
        })
      )}
    </div>
  )
}

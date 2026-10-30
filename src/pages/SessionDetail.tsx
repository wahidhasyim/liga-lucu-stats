import { Link, useParams } from 'react-router-dom'
import { useLeague } from '../components/Layout'
import { PlayerPhoto } from '../components/PlayerPhoto'
import { StandingTable } from '../components/StandingTable'
import { EmptyState, NotFound } from '../components/StatusStates'
import { kunciTim } from '../data/parse'
import type { Laga } from '../data/types'
import { formatAngka, formatTanggal } from '../lib/format'
import { barisSesi, lagaSesi, standingSesi, type BarisSesi, type BarisStanding } from '../stats/compute'

interface Grup {
  judul: string
  keterangan?: string
  isi: BarisSesi[]
}

// Sesi tanpa laga: kelompok lama berdasarkan kolom hasil (satu laga per pemain).
function grupHasil(baris: BarisSesi[]): Grup[] {
  return [
    { judul: 'Menang', isi: baris.filter((b) => b.baris.menang > 0) },
    { judul: 'Seri', isi: baris.filter((b) => b.baris.seri > 0) },
    { judul: 'Kalah', isi: baris.filter((b) => b.baris.kalah > 0) },
    { judul: 'Hasil belum dicatat', isi: baris.filter((b) => b.baris.menang + b.baris.seri + b.baris.kalah === 0) },
  ]
}

function grupTim(baris: BarisSesi[], standing: BarisStanding[]): Grup[] {
  const grup: Grup[] = standing.map((t, i) => ({
    judul: t.tim,
    keterangan: `#${i + 1} · ${t.poin} poin`,
    isi: baris.filter((b) => kunciTim(b.baris.tim) === kunciTim(t.tim)),
  }))
  const dikenal = new Set(standing.map((t) => kunciTim(t.tim)))
  grup.push({ judul: 'Tanpa tim', isi: baris.filter((b) => !dikenal.has(kunciTim(b.baris.tim))) })
  return grup
}

function HasilLaga({ laga }: { laga: Laga[] }) {
  return (
    <div className="laga-list">
      {laga.map((l, i) => (
        <div key={i} className="laga-row">
          <span className={l.skorA > l.skorB ? 'laga-tim win' : 'laga-tim'}>{l.timA}</span>
          <span className="disp laga-skor">
            {l.skorA}–{l.skorB}
          </span>
          <span className={l.skorB > l.skorA ? 'laga-tim win' : 'laga-tim'}>{l.timB}</span>
        </div>
      ))}
    </div>
  )
}

function BarisPemain({ b }: { b: BarisSesi }) {
  return (
    <Link className="lb-row no-rank" to={`/pemain/${b.pemain.id}`}>
      <PlayerPhoto pemain={b.pemain} size="sm" />
      <div>
        <div className="lb-name">
          {b.pemain.nama}
          {b.baris.motm && <span className="badge-motm">MOTM</span>}
        </div>
        <div className="lb-pos">
          {[b.pemain.posisi, b.baris.gol ? `${b.baris.gol} gol` : null, b.baris.assist ? `${b.baris.assist} assist` : null].filter(Boolean).join(' · ')}
        </div>
      </div>
      <span className="lb-val" title="Poin sesi ini">
        {formatAngka(b.poin)}
      </span>
    </Link>
  )
}

export default function SessionDetail() {
  const { id } = useParams()
  const data = useLeague()
  const sesi = data.sesi.find((s) => s.id === id)
  if (!sesi) return <NotFound pesan="Sesi tidak ditemukan." />

  const baris = barisSesi(data, sesi.id)
  const gol = baris.reduce((n, b) => n + b.baris.gol, 0)
  const assist = baris.reduce((n, b) => n + b.baris.assist, 0)
  const laga = lagaSesi(data, sesi.id)
  const standing = standingSesi(laga)
  const grup = laga.length > 0 ? grupTim(baris, standing) : grupHasil(baris)

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
      {laga.length > 0 && (
        <>
          <section className="block">
            <div className="sec-head">
              <h2 className="disp">Klasemen</h2>
              <span className="lbl mute">Poin 3-1-0</span>
            </div>
            <StandingTable rows={standing} />
          </section>
          <section className="block">
            <div className="sec-head">
              <h2 className="disp">Hasil laga</h2>
              <span className="lbl mute">{laga.length} laga</span>
            </div>
            <HasilLaga laga={laga} />
          </section>
        </>
      )}
      {baris.length === 0 ? (
        <EmptyState judul="Belum ada statistik" pesan="Admin belum mengisi tab Statistik untuk sesi ini." />
      ) : (
        grup.map((g) =>
          g.isi.length === 0 ? null : (
            <section key={g.judul} className="block">
              <div className="sec-head">
                <h2 className="disp">{g.judul}</h2>
                <span className="lbl mute">{[g.keterangan, `${g.isi.length} pemain`].filter(Boolean).join(' · ')}</span>
              </div>
              <div className="lb-list">
                {g.isi.map((b) => (
                  <BarisPemain key={b.pemain.id} b={b} />
                ))}
              </div>
            </section>
          ),
        )
      )}
    </div>
  )
}

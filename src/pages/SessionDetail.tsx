import { Link, useParams } from 'react-router-dom'
import { useLeague } from '../components/Layout'
import { PlayerPhoto } from '../components/PlayerPhoto'
import { StandingTable } from '../components/StandingTable'
import { EmptyState, NotFound } from '../components/StatusStates'
import { kunciTim } from '../data/parse'
import type { CSSProperties } from 'react'
import type { Laga, Sesi } from '../data/types'
import { formatAngka, formatTanggal, isoHariIni, POSISI_LABEL } from '../lib/format'
import { barisSesi, lagaSesi, lineupSesi, standingSesi, sudahMain, type BarisSesi, type BarisStanding } from '../stats/compute'

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
          {[POSISI_LABEL[b.pemain.posisi], b.baris.gol ? `${b.baris.gol} gol` : null, b.baris.assist ? `${b.baris.assist} assist` : null].filter(Boolean).join(' · ')}
        </div>
      </div>
      <span className="lb-val" title="Poin sesi ini">
        {formatAngka(b.poin)}
      </span>
    </Link>
  )
}

const WARNA_TIM: [RegExp, string][] = [
  [/merah|red/, '#e5484d'],
  [/biru|blue/, '#3e8ef7'],
  [/kuning|yellow/, '#f5d90a'],
  [/hijau|green/, '#30a46c'],
  [/oranye|orange|jingga/, '#f76b15'],
  [/ungu|purple/, '#8e4ec6'],
  [/pink|merah muda/, '#e93d82'],
  [/putih|white/, '#f4f1ea'],
  [/hitam|black/, '#5c5c5c'],
  [/abu|grey|gray/, '#9b9b9b'],
]
// Warna aksen dari nama tim ("Tim Merah" → merah); selain itu emas.
const warnaTim = (nama: string) => WARNA_TIM.find(([re]) => re.test(nama.toLowerCase()))?.[1] ?? 'var(--gold)'

// Sesi yang belum dimainkan: poster line-up yang muat satu layar, enak di-screenshot untuk IG.
function PosterLineup({ sesi }: { sesi: Sesi }) {
  const data = useLeague()
  const lineup = lineupSesi(data, sesi.id)
  const total = lineup.reduce((n, g) => n + g.pemain.length, 0)
  const jumlahTim = lineup.filter((g) => g.tim).length
  return (
    <article className="poster">
      <header className="poster-head">
        <img src="/logo.svg" alt="" width={44} height={44} />
        <div>
          <div className="lbl">Liga Lucu Depok</div>
          <div className="lbl gold">Line-up</div>
        </div>
        <span className="poster-tag lbl">Akan datang</span>
      </header>
      <h1 className="disp poster-title">Pekan {sesi.pekan}</h1>
      <div className="poster-info">
        <span className="lbl gold">{formatTanggal(sesi.tanggal)}</span>
        <span>{[sesi.lokasi, sesi.catatan].filter(Boolean).join(' · ')}</span>
        <span className="lbl mute">
          {total} pemain · {jumlahTim} tim
        </span>
      </div>
      {lineup.length === 0 ? (
        <EmptyState judul="Line-up belum disusun" pesan="Admin belum mendaftarkan pemain untuk sesi ini." />
      ) : (
        <div className="poster-grid">
          {lineup.map((g) => (
            <section key={g.tim || '-'} className={g.tim ? 'poster-tim' : 'poster-tim tanpa'} style={{ '--warna': g.tim ? warnaTim(g.tim) : 'var(--mute)' } as CSSProperties}>
              <h2 className="disp">
                <span>{g.tim || 'Belum dapat tim'}</span>
                <span className="poster-n">{g.pemain.length}</span>
              </h2>
              <ol>
                {g.pemain.map((p) => (
                  <li key={p.id}>
                    <Link to={`/pemain/${p.id}`}>{p.nama}</Link>
                    {p.posisi === 'GK' && <span className="poster-gk">GK</span>}
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}
      <footer className="poster-foot lbl mute">
        <span>ligalucudepok.web.app</span>
        <span className="gold">Fun football tiap weekend</span>
      </footer>
    </article>
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
  if (sesi.tanggal >= isoHariIni() && !sudahMain(data, sesi.id))
    return (
      <div className="wrap">
        <Link to="/sesi" className="lbl mute back">
          ← Semua sesi
        </Link>
        <PosterLineup sesi={sesi} />
      </div>
    )

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

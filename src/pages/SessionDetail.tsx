import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useLeague } from '../components/Layout'
import { PlayerPhoto } from '../components/PlayerPhoto'
import { StandingTable } from '../components/StandingTable'
import { EmptyState, NotFound } from '../components/StatusStates'
import { kunciTim } from '../data/parse'
import type { JadwalLaga, Sesi } from '../data/types'
import { formatAngka, formatTanggal, isoHariIni, POSISI_LABEL } from '../lib/format'
import { bagikan, gambarFeed, gambarStory, type DataGambar } from '../lib/gambarLineup'
import { warnaTim } from '../lib/warnaTim'
import { barisSesi, jadwalSesi, jamLaga, lagaSesi, lineupSesi, standingSesi, sudahMain, type BarisSesi, type BarisStanding, type TimLineup } from '../stats/compute'

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

// Laga yang sudah main menampilkan skor; yang belum menampilkan "vs". Kalau ada jam, jam menggantikan nomor urut.
function DaftarLaga({ laga, jam }: { laga: JadwalLaga[]; jam?: string[] | null }) {
  return (
    <ol className={jam ? 'laga-list berjam' : 'laga-list'}>
      {laga.map((l, i) => {
        const main = l.skorA !== null && l.skorB !== null
        const kelas = (menang: boolean) => (main ? (menang ? 'laga-tim win' : 'laga-tim') : 'laga-tim nanti')
        return (
          <li key={i} className="laga-row">
            <span className="laga-no lbl mute">{jam?.[i] ?? i + 1}</span>
            <span className={kelas(main && l.skorA! > l.skorB!)} style={{ '--warna': warnaTim(l.timA) } as CSSProperties}>
              {l.timA}
            </span>
            {main ? (
              <span className="disp laga-skor">
                {l.skorA}–{l.skorB}
              </span>
            ) : (
              <span className="lbl laga-vs">vs</span>
            )}
            <span className={kelas(main && l.skorB! > l.skorA!)} style={{ '--warna': warnaTim(l.timB) } as CSSProperties}>
              {l.timB}
            </span>
          </li>
        )
      })}
    </ol>
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

// Gambar story dan feed dibuat begitu halaman dibuka, supaya menu share HP bisa langsung muncul saat tombol diketuk.
function BagikanLineup({ sesi, lineup, jadwal, jam }: { sesi: Sesi; lineup: TimLineup[]; jadwal: { laga: JadwalLaga[]; otomatis: boolean }; jam: string[] | null }) {
  const [gambar, setGambar] = useState<{ story: File; feed: File[] } | null>(null)
  const [pesan, setPesan] = useState('')
  const dataGambar = useMemo<DataGambar>(
    () => ({
      pekan: sesi.pekan,
      tanggal: formatTanggal(sesi.tanggal),
      info: [sesi.lokasi, sesi.catatan].filter(Boolean).join(' · '),
      tim: lineup.filter((g) => g.tim).map((g) => ({ nama: g.tim, warna: warnaTim(g.tim), pemain: g.pemain.map((p) => ({ nama: p.nama, kiper: p.posisi === 'GK' })) })),
      jadwal: jadwal.laga.map((l, i) => ({ timA: l.timA, timB: l.timB, jam: jam?.[i] })),
      jadwalOtomatis: jadwal.otomatis,
    }),
    [sesi, lineup, jadwal, jam],
  )
  const kunci = JSON.stringify(dataGambar)

  // kunci mewakili isi dataGambar; objeknya sendiri dibuat ulang tiap render
  useEffect(() => {
    let batal = false
    setGambar(null)
    Promise.all([gambarStory(dataGambar), gambarFeed(dataGambar)])
      .then(([story, feed]) => !batal && setGambar({ story, feed }))
      .catch(() => !batal && setPesan('Gambar gagal dibuat. Coba muat ulang halaman.'))
    return () => {
      batal = true
    }
  }, [kunci])

  const pratinjau = useMemo(() => (gambar ? [gambar.story, ...gambar.feed].map((f) => ({ nama: f.name, url: URL.createObjectURL(f) })) : []), [gambar])
  useEffect(() => () => pratinjau.forEach((p) => URL.revokeObjectURL(p.url)), [pratinjau])

  if (dataGambar.tim.length === 0) return null
  const kirim = async (files: File[]) => {
    const hasil = await bagikan(files, `Line-up Pekan ${sesi.pekan} · Liga Lucu Depok`)
    setPesan(hasil === 'diunduh' ? `${files.length} gambar diunduh.` : '')
  }
  return (
    <section className="share">
      <div className="sec-head">
        <h2 className="disp">Bagikan ke IG</h2>
        <span className="lbl mute">{gambar ? 'Siap' : 'Menyiapkan…'}</span>
      </div>
      <div className="share-aksi">
        <button type="button" className="btn" disabled={!gambar} onClick={() => gambar && kirim([gambar.story])}>
          Story · 9:16
        </button>
        <button type="button" className="btn-ghost" disabled={!gambar} onClick={() => gambar && kirim(gambar.feed)}>
          Feed · {gambar?.feed.length ?? dataGambar.tim.length + (dataGambar.jadwal.length > 0 ? 1 : 0)} foto 4:5
        </button>
      </div>
      {pesan && <p className="mute share-pesan">{pesan}</p>}
      {pratinjau.length > 0 && (
        <div className="share-pratinjau">
          {pratinjau.map((p, i) => (
            <a key={p.nama} href={p.url} download={p.nama} className={i === 0 ? 'story' : ''}>
              <img src={p.url} alt={i === 0 ? 'Pratinjau story' : `Pratinjau feed ${i}`} />
            </a>
          ))}
        </div>
      )}
    </section>
  )
}

// Sesi yang belum dimainkan: poster line-up yang muat satu layar, enak di-screenshot untuk IG.
function PosterLineup({ sesi }: { sesi: Sesi }) {
  const data = useLeague()
  const lineup = lineupSesi(data, sesi.id)
  const jadwal = jadwalSesi(data, sesi.id)
  const jam = jamLaga(sesi.catatan, jadwal.laga.length)
  const total = lineup.reduce((n, g) => n + g.pemain.length, 0)
  const jumlahTim = lineup.filter((g) => g.tim).length
  return (
    <>
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
      {jadwal.laga.length > 0 && (
        <section className="block">
          <div className="sec-head">
            <h2 className="disp">Jadwal laga</h2>
            <span className="lbl mute">{jadwal.laga.length} laga</span>
          </div>
          <DaftarLaga laga={jadwal.laga} jam={jam} />
          {(jadwal.otomatis || jam) && (
            <p className="mute laga-catatan">
              {jadwal.otomatis && 'Urutan sementara, tiap tim bertemu sekali. '}
              {jam && 'Jam perkiraan, dibagi rata sesuai jam main. '}
              Bisa berubah di lapangan.
            </p>
          )}
        </section>
      )}
      <BagikanLineup sesi={sesi} lineup={lineup} jadwal={jadwal} jam={jam} />
    </>
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
  const jadwal = jadwalSesi(data, sesi.id).laga
  const belumMain = jadwal.filter((l) => l.skorA === null).length
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
              <h2 className="disp">{belumMain ? 'Jadwal & hasil' : 'Hasil laga'}</h2>
              <span className="lbl mute">{belumMain ? `${laga.length}/${jadwal.length} dimainkan` : `${laga.length} laga`}</span>
            </div>
            <DaftarLaga laga={jadwal} />
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

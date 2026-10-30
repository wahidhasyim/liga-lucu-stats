import { useMemo, useState, type FormEvent } from 'react'
import { kunciTim } from '../data/parse'
import { POSISI, type LeagueData, type Posisi } from '../data/types'
import { formatTanggalPendek, isoHariIni } from '../lib/format'
import { computePlayerStats, lineupSesi, sesiAkanDatang } from '../stats/compute'
import type { Kirim } from './AdminPage'
import { bagiSeimbang, median } from './logic'
import { Field, HURUF_TIM, SaveBar, useSimpan } from './ui'

const MIN_TIM = 2
const MAKS_TIM = HURUF_TIM.length
// Lebih dari ini, pilihan tim per pemain memakai dropdown supaya muat di layar HP.
const MAKS_TOMBOL_TIM = 4

export function SesiAdmin({ data, kirim }: { data: LeagueData; kirim: Kirim }) {
  const [sesiId, setSesiId] = useState('')
  // naik setiap kali tersimpan, supaya form diisi ulang dari data terbaru (pemain baru jadi pemain biasa)
  const [versi, setVersi] = useState(0)
  // status simpan di sini, supaya pesannya tidak hilang saat form dipasang ulang
  const simpan = useSimpan()
  const terbaru = [...data.sesi].reverse()
  const akanDatang = sesiAkanDatang(data, isoHariIni())
  const tersimpan = (id: string) => {
    setSesiId(id)
    setVersi((v) => v + 1)
  }
  return (
    <>
      {akanDatang.length > 0 && (
        <section className="adm-upcoming">
          <h2 className="disp adm-h">Sesi yang akan datang</h2>
          {akanDatang.map((s) => {
            const lineup = lineupSesi(data, s.id)
            const total = lineup.reduce((n, g) => n + g.pemain.length, 0)
            return (
              <button key={s.id} type="button" className={s.id === sesiId ? 'adm-card adm-up on' : 'adm-card adm-up'} onClick={() => setSesiId(s.id)}>
                <div className="adm-row-head">
                  <span className="disp adm-up-title">
                    Pekan {s.pekan} · {formatTanggalPendek(s.tanggal)}
                  </span>
                  <span className="lbl mute">{total} pemain</span>
                </div>
                {s.lokasi && <div className="mute adm-up-lok">{s.lokasi}</div>}
                {lineup.length === 0 ? (
                  <div className="mute">Belum ada pemain.</div>
                ) : (
                  lineup.map((g) => (
                    <div key={g.tim || '-'} className="adm-up-tim">
                      <span className="lbl gold">
                        {g.tim || 'Tanpa tim'} · {g.pemain.length}
                      </span>
                      <span>{g.pemain.map((p) => p.panggilan || p.nama).join(', ')}</span>
                    </div>
                  ))
                )}
                <div className="lbl mute adm-up-edit">{s.id === sesiId ? 'Sedang diedit ↓' : 'Ketuk untuk edit'}</div>
              </button>
            )
          })}
        </section>
      )}
      <Field label="Sesi">
        <select className="input" value={sesiId} onChange={(e) => setSesiId(e.target.value)}>
          <option value="">+ Sesi baru</option>
          {terbaru.map((s) => (
            <option key={s.id} value={s.id}>
              Pekan {s.pekan} · {formatTanggalPendek(s.tanggal)}
            </option>
          ))}
        </select>
      </Field>
      <SesiForm key={`${sesiId || 'baru'}-${versi}`} data={data} sesiId={sesiId} kirim={kirim} simpan={simpan} onTersimpan={tersimpan} />
    </>
  )
}

interface PemainBaru {
  kunci: string
  nama: string
  posisi: Posisi
}

interface Baris {
  kunci: string
  nama: string
  posisi: Posisi
  baru: boolean
}

interface FormProps {
  data: LeagueData
  sesiId: string
  kirim: Kirim
  simpan: ReturnType<typeof useSimpan>
  onTersimpan: (id: string) => void
}

function SesiForm({ data, sesiId, kirim, simpan: { status, jalankan, sibuk }, onTersimpan }: FormProps) {
  const sesi = data.sesi.find((s) => s.id === sesiId)
  const awal = useMemo(() => {
    const baris = data.statistik.filter((b) => b.sesiId === sesiId)
    const nama: string[] = []
    for (const b of baris) if (b.tim && !nama.some((n) => kunciTim(n) === kunciTim(b.tim))) nama.push(b.tim)
    const tugas = new Map(baris.map((b) => [b.pemainId, b.tim ? nama.findIndex((n) => kunciTim(n) === kunciTim(b.tim)) : null] as const))
    const jumlah = Math.max(MIN_TIM, nama.length || 4)
    return { nama: [...nama, ...HURUF_TIM.slice(nama.length, jumlah).map((h) => `Tim ${h}`)], tugas }
  }, [data, sesiId])

  const [tanggal, setTanggal] = useState(sesi?.tanggal ?? isoHariIni())
  const [lokasi, setLokasi] = useState(sesi?.lokasi ?? data.sesi.at(-1)?.lokasi ?? '')
  const [catatan, setCatatan] = useState(sesi?.catatan ?? '')
  const [namaTim, setNamaTim] = useState(awal.nama)
  // kunci pemain (id, atau "baru:n" untuk pemain baru) → indeks tim; null = hadir tapi belum dapat tim
  const [tugas, setTugas] = useState<Map<string, number | null>>(awal.tugas)
  const [baru, setBaru] = useState<PemainBaru[]>([])
  const [isianNama, setIsianNama] = useState('')
  const [isianPosisi, setIsianPosisi] = useState<Posisi>('MID')

  const n = namaTim.length
  const lama: Baris[] = data.pemain
    .filter((p) => p.aktif || tugas.has(p.id))
    .sort((a, b) => a.nama.localeCompare(b.nama, 'id'))
    .map((p) => ({ kunci: p.id, nama: p.nama, posisi: p.posisi, baru: false }))
  const semua: Baris[] = [...baru.map((b) => ({ ...b, baru: true })), ...lama]
  const lokasiLama = [...new Set(data.sesi.map((s) => s.lokasi).filter(Boolean))]
  const perTim = namaTim.map((_, i) => [...tugas.values()].filter((t) => t === i).length)

  const ubahTugas = (kunci: string, nilai: number | null | undefined) =>
    setTugas((m) => {
      const hasil = new Map(m)
      if (nilai === undefined) hasil.delete(kunci)
      else hasil.set(kunci, nilai)
      return hasil
    })

  const tambahTim = () => setNamaTim([...namaTim, `Tim ${HURUF_TIM[n]}`])

  // Pemain di tim yang dihapus jadi belum dapat tim; tim sesudahnya bergeser satu huruf.
  const hapusTim = (i: number) => {
    setNamaTim(namaTim.filter((_, j) => j !== i))
    setTugas((m) => new Map([...m].map(([k, t]) => [k, t === null || t === i ? null : t > i ? t - 1 : t])))
  }

  const tambahPemain = (e: FormEvent) => {
    e.preventDefault()
    const nama = isianNama.trim().replace(/\s+/g, ' ')
    if (!nama) return
    const kembar = semua.find((p) => p.nama.toLowerCase() === nama.toLowerCase())
    if (kembar && !window.confirm(`"${kembar.nama}" sudah ada di daftar. Tetap tambahkan sebagai pemain baru?`)) return
    const kunci = `baru:${Date.now()}`
    setBaru([{ kunci, nama, posisi: isianPosisi }, ...baru])
    ubahTugas(kunci, null)
    setIsianNama('')
    setIsianPosisi('MID')
  }

  const hapusPemainBaru = (kunci: string) => {
    setBaru(baru.filter((b) => b.kunci !== kunci))
    ubahTugas(kunci, undefined)
  }

  const acak = () => {
    const stats = computePlayerStats(data).filter((s) => s.hadir > 0)
    const kekuatan = new Map(stats.map((s) => [s.pemain.id, s.poinPerSesi]))
    const tengah = median(stats.map((s) => s.poinPerSesi))
    const hadir = semua.filter((p) => tugas.has(p.kunci))
    const tim = bagiSeimbang(hadir.map((p) => ({ id: p.kunci, posisi: p.posisi, kekuatan: kekuatan.get(p.kunci) ?? tengah })), n)
    setTugas(new Map(tim.flatMap((ids, i) => ids.map((id) => [id, i] as const))))
  }

  const simpanSesi = () =>
    jalankan(async () => {
      const nama = namaTim.map((t) => t.trim().replace(/\s+/g, ' '))
      if (nama.some((t) => !t)) throw new Error('Semua nama tim wajib diisi.')
      if (new Set(nama.map(kunciTim)).size !== n) throw new Error('Nama tim tidak boleh kembar.')
      if (tugas.size === 0) throw new Error('Pilih minimal satu pemain yang hadir.')
      if ([...tugas.values()].some((t) => t === null)) throw new Error('Masih ada pemain hadir yang belum dapat tim.')
      const baruByKunci = new Map(baru.map((b) => [b.kunci, b]))
      const lineup = [...tugas].map(([kunci, t]) => {
        const b = baruByKunci.get(kunci)
        return b ? { baru: { nama: b.nama, posisi: b.posisi }, tim: nama[t!] } : { pemainId: kunci, tim: nama[t!] }
      })
      const { id, pemainBaru } = await kirim<{ id: string; pemainBaru: string[] }>('simpanSesi', { id: sesiId || undefined, tanggal, lokasi, catatan, lineup })
      onTersimpan(id)
      const tambahan = pemainBaru.length ? ` ${pemainBaru.length} pemain baru masuk daftar pemain.` : ''
      return `Sesi ${id} tersimpan: ${lineup.length} pemain.${tambahan} Isi skor di tab Hasil setelah main.`
    })

  const hapus = () => {
    if (!sesi || !window.confirm(`Hapus Pekan ${sesi.pekan} (${formatTanggalPendek(sesi.tanggal)}) beserta line-up dan hasilnya?`)) return
    jalankan(async () => {
      await kirim('hapusSesi', { id: sesi.id })
      onTersimpan('')
      return `Pekan ${sesi.pekan} dihapus.`
    })
  }

  return (
    <>
      <section className="adm-card">
        <div className="adm-grid2">
          <Field label="Tanggal">
            <input className="input" type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
          </Field>
          <Field label="Lokasi">
            <input className="input" list="lokasi-lama" value={lokasi} onChange={(e) => setLokasi(e.target.value)} />
            <datalist id="lokasi-lama">
              {lokasiLama.map((l) => (
                <option key={l} value={l} />
              ))}
            </datalist>
          </Field>
        </div>
        <Field label="Catatan (opsional)">
          <input className="input" value={catatan} placeholder="Misal: hujan deras babak kedua" onChange={(e) => setCatatan(e.target.value)} />
        </Field>
      </section>

      <section className="adm-card">
        <div className="adm-row-head">
          <h2 className="disp adm-h">Tim</h2>
          <span className="lbl mute">{n} tim</span>
        </div>
        <div className="adm-teams">
          {namaTim.map((t, i) => (
            <div key={i} className="adm-team">
              <span className="team-tag">{HURUF_TIM[i]}</span>
              <input className="input" value={t} aria-label={`Nama tim ${HURUF_TIM[i]}`} onChange={(e) => setNamaTim(namaTim.map((x, j) => (j === i ? e.target.value : x)))} />
              <span className="lbl mute" title="Jumlah pemain">
                {perTim[i]}
              </span>
              <button type="button" className="icon-btn" aria-label={`Hapus ${t || `tim ${HURUF_TIM[i]}`}`} disabled={n <= MIN_TIM} onClick={() => hapusTim(i)}>
                ✕
              </button>
            </div>
          ))}
        </div>
        <button type="button" className="btn-ghost adm-acak" disabled={n >= MAKS_TIM} onClick={tambahTim}>
          + Tambah tim
        </button>
      </section>

      <div className="sec-head">
        <h2 className="disp">Pemain hadir</h2>
        <span className="lbl mute">{tugas.size} pemain</span>
      </div>
      <form className="adm-newplayer" onSubmit={tambahPemain}>
        <input className="input" value={isianNama} placeholder="Nama pemain baru…" aria-label="Nama pemain baru" onChange={(e) => setIsianNama(e.target.value)} />
        <select className="input" value={isianPosisi} aria-label="Posisi pemain baru" onChange={(e) => setIsianPosisi(e.target.value as Posisi)}>
          {POSISI.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <button type="submit" className="btn" disabled={!isianNama.trim()}>
          + Tambah
        </button>
      </form>
      <button type="button" className="btn-ghost adm-acak" disabled={tugas.size < n} onClick={acak}>
        ⇄ Acak tim seimbang
      </button>
      <div className="adm-list">
        {semua.map((p) => {
          const hadir = tugas.has(p.kunci)
          const tim = tugas.get(p.kunci)
          return (
            <div key={p.kunci} className={`adm-line${hadir ? ' on' : ''}`}>
              <button type="button" className="adm-toggle" aria-pressed={hadir} onClick={() => (p.baru ? hapusPemainBaru(p.kunci) : ubahTugas(p.kunci, hadir ? undefined : null))}>
                <span className="tick" aria-hidden="true">
                  {hadir ? '✓' : ''}
                </span>
                <span className="adm-name">{p.nama}</span>
                <span className="c-pos">{p.posisi}</span>
                {p.baru && <span className="badge-baru">Baru</span>}
              </button>
              {hadir &&
                (n <= MAKS_TOMBOL_TIM ? (
                  <div className="seg seg-tim" role="group" aria-label={`Tim ${p.nama}`}>
                    {namaTim.map((nama, i) => (
                      <button key={i} type="button" aria-pressed={tim === i} title={nama} onClick={() => ubahTugas(p.kunci, i)}>
                        {HURUF_TIM[i]}
                      </button>
                    ))}
                  </div>
                ) : (
                  <select className="input tim-select" aria-label={`Tim ${p.nama}`} value={tim ?? ''} onChange={(e) => ubahTugas(p.kunci, e.target.value === '' ? null : Number(e.target.value))}>
                    <option value="">–</option>
                    {namaTim.map((nama, i) => (
                      <option key={i} value={i}>
                        {HURUF_TIM[i]} · {nama}
                      </option>
                    ))}
                  </select>
                ))}
            </div>
          )
        })}
      </div>

      <SaveBar status={status}>
        {sesi && (
          <button type="button" className="btn-ghost danger" disabled={sibuk} onClick={hapus}>
            Hapus
          </button>
        )}
        <button type="button" className="btn" disabled={sibuk} onClick={simpanSesi}>
          {sesi ? 'Simpan' : 'Buat sesi'}
        </button>
      </SaveBar>
    </>
  )
}

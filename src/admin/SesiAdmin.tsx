import { useMemo, useState, type FormEvent } from 'react'
import { kunciTim } from '../data/parse'
import type { LeagueData, Posisi } from '../data/types'
import { formatTanggalPendek, isoHariIni } from '../lib/format'
import { computePlayerStats, lineupSesi, sesiAkanDatang } from '../stats/compute'
import type { Kirim } from './AdminPage'
import { bacaDaftarNama, bagiSeimbang, median, type NamaTempel } from './logic'
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
  const [tempel, setTempel] = useState<string | null>(null) // null = kotak paste tertutup
  const [infoTempel, setInfoTempel] = useState('')
  // request setim: daftar rombongan (kunci pemain) yang dipakai saat acak; tidak disimpan ke Sheet
  const [setim, setSetim] = useState<string[][]>([])
  const [pilihSetim, setPilihSetim] = useState<string[] | null>(null)

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

  const keBaru = (list: NamaTempel[]): PemainBaru[] => list.map((x, i) => ({ kunci: `baru:${Date.now()}-${i}`, nama: x.nama, posisi: x.kiper ? 'GK' : 'OUT' }))
  const daftarkan = (list: PemainBaru[]) => {
    setBaru((b) => [...list, ...b])
    setTugas((m) => new Map([...m, ...list.map((b) => [b.kunci, null] as const)]))
  }

  const tambahPemain = (e: FormEvent) => {
    e.preventDefault()
    const [isian] = bacaDaftarNama(isianNama)
    if (!isian) return
    const kembar = semua.find((p) => p.nama.toLowerCase() === isian.nama.toLowerCase())
    if (kembar && !window.confirm(`"${kembar.nama}" sudah ada di daftar. Tetap tambahkan sebagai pemain baru?`)) return
    daftarkan(keBaru([isian]))
    setIsianNama('')
  }

  // Nama yang sudah terdaftar (nama lengkap atau panggilan) langsung dicentang hadir; sisanya jadi pemain baru.
  const masukkanDaftar = () => {
    const kenal = new Map<string, string>()
    for (const p of data.pemain) for (const x of [p.nama, p.panggilan]) if (x && !kenal.has(x.toLowerCase())) kenal.set(x.toLowerCase(), p.id)
    for (const b of baru) kenal.set(b.nama.toLowerCase(), b.kunci)
    const daftar = bacaDaftarNama(tempel ?? '')
    const lama = daftar.flatMap((x) => kenal.get(x.nama.toLowerCase()) ?? [])
    const tambahan = keBaru(daftar.filter((x) => !kenal.has(x.nama.toLowerCase())))
    const dicentang = lama.filter((k) => !tugas.has(k))
    setTugas((m) => new Map([...m, ...dicentang.map((k) => [k, null] as const)]))
    daftarkan(tambahan)
    setInfoTempel(`${daftar.length} nama: ${lama.length} sudah terdaftar${dicentang.length < lama.length ? ` (${lama.length - dicentang.length} sudah dicentang)` : ''}, ${tambahan.length} pemain baru.`)
    setTempel(null)
  }

  const namaDari = (kunci: string) => semua.find((p) => p.kunci === kunci)?.nama ?? kunci
  const setimAktif = setim.map((g) => g.filter((k) => tugas.has(k))).filter((g) => g.length >= 2)
  const sudahSetim = new Set(setimAktif.flat())
  const simpanSetim = () => {
    if (pilihSetim && pilihSetim.length >= 2) setSetim([...setimAktif, pilihSetim])
    setPilihSetim(null)
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
    const tim = bagiSeimbang(
      hadir.map((p) => ({ id: p.kunci, posisi: p.posisi, kekuatan: kekuatan.get(p.kunci) ?? tengah })),
      n,
      Math.random,
      setimAktif,
    )
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
      const { id, pemainBaru } = await kirim('simpanSesi', { id: sesiId || undefined, tanggal, lokasi, catatan, lineup })
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
        <button type="submit" className="btn" disabled={!isianNama.trim()}>
          + Tambah
        </button>
      </form>
      {tempel === null ? (
        <button type="button" className="btn-ghost adm-acak" onClick={() => setTempel('')}>
          Paste daftar nama
        </button>
      ) : (
        <div className="adm-paste">
          <textarea
            className="input"
            rows={6}
            autoFocus
            value={tempel}
            aria-label="Daftar nama"
            placeholder={'Satu nama per baris, misalnya:\n1. Budi\n2. Buci\n3. Andi (GK)'}
            onChange={(e) => setTempel(e.target.value)}
          />
          <div className="adm-paste-aksi">
            <button type="button" className="btn-ghost" onClick={() => setTempel(null)}>
              Batal
            </button>
            <button type="button" className="btn" disabled={bacaDaftarNama(tempel).length === 0} onClick={masukkanDaftar}>
              Masukkan {bacaDaftarNama(tempel).length || ''} nama
            </button>
          </div>
        </div>
      )}
      {infoTempel && <p className="adm-info">{infoTempel}</p>}

      <section className="adm-card adm-setim">
        <div className="adm-row-head">
          <h2 className="disp adm-h">Request setim</h2>
          <span className="lbl mute">Dipakai saat acak</span>
        </div>
        {setimAktif.length === 0 && pilihSetim === null && <p className="mute adm-setim-kosong">Belum ada. Contoh: Budi minta setim sama Buci.</p>}
        {setimAktif.map((g, i) => (
          <div key={g.join()} className="adm-setim-grup">
            <span>{g.map(namaDari).join(' + ')}</span>
            <button type="button" className="icon-btn" aria-label={`Hapus request ${g.map(namaDari).join(' + ')}`} onClick={() => setSetim(setimAktif.filter((_, j) => j !== i))}>
              ✕
            </button>
          </div>
        ))}
        {pilihSetim === null ? (
          <button type="button" className="btn-ghost adm-acak" disabled={tugas.size - sudahSetim.size < 2} onClick={() => setPilihSetim([])}>
            + Request setim
          </button>
        ) : (
          <>
            <p className="lbl mute">Pilih pemain yang mau setim</p>
            <div className="chips">
              {semua
                .filter((p) => tugas.has(p.kunci) && !sudahSetim.has(p.kunci))
                .map((p) => {
                  const on = pilihSetim.includes(p.kunci)
                  return (
                    <button
                      key={p.kunci}
                      type="button"
                      className={on ? 'chip on' : 'chip'}
                      aria-pressed={on}
                      onClick={() => setPilihSetim((x) => (x?.includes(p.kunci) ? x.filter((k) => k !== p.kunci) : [...(x ?? []), p.kunci]))}
                    >
                      {p.nama}
                    </button>
                  )
                })}
            </div>
            <div className="adm-paste-aksi">
              <button type="button" className="btn-ghost" onClick={() => setPilihSetim(null)}>
                Batal
              </button>
              <button type="button" className="btn" disabled={pilihSetim.length < 2} onClick={simpanSetim}>
                Simpan setim
              </button>
            </div>
          </>
        )}
      </section>

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
                {p.posisi === 'GK' && <span className="c-pos">Kiper</span>}
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

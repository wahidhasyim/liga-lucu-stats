import { useMemo, useState } from 'react'
import { Segmented } from '../components/Segmented'
import { kunciTim } from '../data/parse'
import type { LeagueData } from '../data/types'
import { formatTanggalPendek, isoHariIni } from '../lib/format'
import { computePlayerStats } from '../stats/compute'
import type { Kirim } from './AdminPage'
import { bagiSeimbang, median } from './logic'
import { Field, HURUF_TIM, SaveBar, useSimpan } from './ui'

type Jumlah = '2' | '3' | '4'
const DEFAULT_TIM = HURUF_TIM.map((h) => `Tim ${h}`)

export function SesiAdmin({ data, kirim }: { data: LeagueData; kirim: Kirim }) {
  const [sesiId, setSesiId] = useState('')
  // status simpan di sini, supaya pesannya tidak hilang saat form dipasang ulang setelah buat/hapus sesi
  const simpan = useSimpan()
  const terbaru = [...data.sesi].reverse()
  return (
    <>
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
      {/* key: form diisi ulang dari data setiap ganti sesi */}
      <SesiForm key={sesiId || 'baru'} data={data} sesiId={sesiId} kirim={kirim} simpan={simpan} onTersimpan={setSesiId} />
    </>
  )
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
    return { nama: [...nama, ...DEFAULT_TIM.slice(nama.length)].slice(0, 4), jumlah: String(Math.min(4, Math.max(2, nama.length || 4))) as Jumlah, tugas }
  }, [data, sesiId])

  const [tanggal, setTanggal] = useState(sesi?.tanggal ?? isoHariIni())
  const [lokasi, setLokasi] = useState(sesi?.lokasi ?? data.sesi.at(-1)?.lokasi ?? '')
  const [catatan, setCatatan] = useState(sesi?.catatan ?? '')
  const [jumlah, setJumlah] = useState<Jumlah>(awal.jumlah)
  const [namaTim, setNamaTim] = useState(awal.nama)
  // pemainId → indeks tim (null = hadir tapi belum dapat tim). Tidak ada di map = tidak hadir.
  const [tugas, setTugas] = useState<Map<string, number | null>>(awal.tugas)

  const n = Number(jumlah)
  const pemain = data.pemain.filter((p) => p.aktif || tugas.has(p.id)).sort((a, b) => a.nama.localeCompare(b.nama, 'id'))
  const lokasiLama = [...new Set(data.sesi.map((s) => s.lokasi).filter(Boolean))]
  const perTim = Array.from({ length: n }, (_, i) => [...tugas.values()].filter((t) => t === i).length)

  const ubahTugas = (id: string, nilai: number | null | undefined) =>
    setTugas((m) => {
      const baru = new Map(m)
      if (nilai === undefined) baru.delete(id)
      else baru.set(id, nilai)
      return baru
    })

  const ubahJumlah = (j: Jumlah) => {
    setJumlah(j)
    setTugas((m) => new Map([...m].map(([id, t]) => [id, t !== null && t >= Number(j) ? null : t])))
  }

  const acak = () => {
    const stats = computePlayerStats(data).filter((s) => s.hadir > 0)
    const kekuatan = new Map(stats.map((s) => [s.pemain.id, s.poinPerSesi]))
    const tengah = median(stats.map((s) => s.poinPerSesi))
    const hadir = pemain.filter((p) => tugas.has(p.id))
    const tim = bagiSeimbang(hadir.map((p) => ({ id: p.id, posisi: p.posisi, kekuatan: kekuatan.get(p.id) ?? tengah })), n)
    setTugas(new Map(tim.flatMap((ids, i) => ids.map((id) => [id, i] as const))))
  }

  const simpan = () =>
    jalankan(async () => {
      const nama = namaTim.slice(0, n).map((t) => t.trim().replace(/\s+/g, ' '))
      if (nama.some((t) => !t)) throw new Error('Semua nama tim wajib diisi.')
      if (new Set(nama.map(kunciTim)).size !== n) throw new Error('Nama tim tidak boleh kembar.')
      if (tugas.size === 0) throw new Error('Pilih minimal satu pemain yang hadir.')
      if ([...tugas.values()].some((t) => t === null)) throw new Error('Masih ada pemain hadir yang belum dapat tim.')
      const lineup = [...tugas].map(([pemainId, t]) => ({ pemainId, tim: nama[t!] }))
      const { id } = await kirim<{ id: string }>('simpanSesi', { id: sesiId || undefined, tanggal, lokasi, catatan, lineup })
      if (!sesiId) onTersimpan(id)
      return `Sesi ${id} tersimpan: ${lineup.length} pemain. Isi skor di tab Hasil setelah main.`
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
          <Segmented label="Jumlah tim" value={jumlah} options={(['2', '3', '4'] as Jumlah[]).map((j) => ({ value: j, label: `${j} tim` }))} onChange={ubahJumlah} />
        </div>
        <div className="adm-teams">
          {namaTim.slice(0, n).map((t, i) => (
            <label key={i} className="adm-team">
              <span className="team-tag">{HURUF_TIM[i]}</span>
              <input className="input" value={t} aria-label={`Nama tim ${HURUF_TIM[i]}`} onChange={(e) => setNamaTim(namaTim.map((x, j) => (j === i ? e.target.value : x)))} />
              <span className="lbl mute">{perTim[i]}</span>
            </label>
          ))}
        </div>
      </section>

      <div className="sec-head">
        <h2 className="disp">Hadir</h2>
        <span className="lbl mute">{tugas.size} pemain</span>
      </div>
      <button type="button" className="btn-ghost adm-acak" disabled={tugas.size < n} onClick={acak}>
        ⇄ Acak seimbang
      </button>
      <div className="adm-list">
        {pemain.map((p) => {
          const hadir = tugas.has(p.id)
          const tim = tugas.get(p.id)
          return (
            <div key={p.id} className={`adm-line${hadir ? ' on' : ''}`}>
              <button type="button" className="adm-toggle" aria-pressed={hadir} onClick={() => ubahTugas(p.id, hadir ? undefined : null)}>
                <span className="tick" aria-hidden="true">
                  {hadir ? '✓' : ''}
                </span>
                <span className="adm-name">{p.nama}</span>
                <span className="c-pos">{p.posisi}</span>
              </button>
              {hadir && (
                <div className="seg seg-tim" role="group" aria-label={`Tim ${p.panggilan}`}>
                  {Array.from({ length: n }, (_, i) => (
                    <button key={i} type="button" aria-pressed={tim === i} title={namaTim[i]} onClick={() => ubahTugas(p.id, i)}>
                      {HURUF_TIM[i]}
                    </button>
                  ))}
                </div>
              )}
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
        <button type="button" className="btn" disabled={sibuk} onClick={simpan}>
          {sesi ? 'Simpan' : 'Buat sesi'}
        </button>
      </SaveBar>
    </>
  )
}

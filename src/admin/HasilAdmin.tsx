import { useMemo, useState } from 'react'
import { EmptyState } from '../components/StatusStates'
import { kunciTim } from '../data/parse'
import type { LeagueData } from '../data/types'
import { formatTanggalPendek } from '../lib/format'
import type { Kirim } from './AdminPage'
import { cekGolTim, jadwalRoundRobin, type LagaInput } from './logic'
import { Field, SaveBar, Stepper, useSimpan } from './ui'

interface Isian {
  gol: number
  assist: number
  motm: boolean
}

export function HasilAdmin({ data, kirim }: { data: LeagueData; kirim: Kirim }) {
  const punyaLineup = [...data.sesi].reverse().filter((s) => data.statistik.some((b) => b.sesiId === s.id))
  const [sesiId, setSesiId] = useState(punyaLineup[0]?.id ?? '')
  const simpan = useSimpan()

  if (punyaLineup.length === 0) return <EmptyState judul="Belum ada line-up" pesan="Susun sesi dan pemain yang hadir dulu di tab Sesi." />
  return (
    <>
      <Field label="Sesi">
        <select className="input" value={sesiId} onChange={(e) => setSesiId(e.target.value)}>
          {punyaLineup.map((s) => (
            <option key={s.id} value={s.id}>
              Pekan {s.pekan} · {formatTanggalPendek(s.tanggal)}
            </option>
          ))}
        </select>
      </Field>
      <HasilForm key={sesiId} data={data} sesiId={sesiId} kirim={kirim} simpan={simpan} />
    </>
  )
}

function HasilForm({ data, sesiId, kirim, simpan: { status, jalankan, sibuk } }: { data: LeagueData; sesiId: string; kirim: Kirim; simpan: ReturnType<typeof useSimpan> }) {
  const awal = useMemo(() => {
    const baris = data.statistik.filter((b) => b.sesiId === sesiId)
    const tim: string[] = []
    for (const b of baris) if (b.tim && !tim.some((t) => kunciTim(t) === kunciTim(b.tim))) tim.push(b.tim)
    const lagaLama = data.laga.filter((l) => l.sesiId === sesiId).map((l) => ({ timA: l.timA, skorA: String(l.skorA), skorB: String(l.skorB), timB: l.timB }))
    const laga: LagaInput[] = lagaLama.length > 0 ? lagaLama : jadwalRoundRobin(tim).map(([timA, timB]) => ({ timA, skorA: '', skorB: '', timB }))
    const isian = new Map(baris.map((b) => [b.pemainId, { gol: b.gol, assist: b.assist, motm: b.motm }]))
    return { baris, tim, laga, isian }
  }, [data, sesiId])

  const [laga, setLaga] = useState(awal.laga)
  const [isian, setIsian] = useState<Map<string, Isian>>(awal.isian)
  const pemainById = new Map(data.pemain.map((p) => [p.id, p]))
  const { tim } = awal

  const ubahLaga = (i: number, ubah: Partial<LagaInput>) => setLaga((l) => l.map((x, j) => (j === i ? { ...x, ...ubah } : x)))
  const ubahIsian = (id: string, ubah: Partial<Isian>) => setIsian((m) => new Map(m).set(id, { ...m.get(id)!, ...ubah }))

  const golPemain = awal.baris.map((b) => ({ tim: b.tim, gol: isian.get(b.pemainId)?.gol ?? 0 }))
  const selisih = cekGolTim(tim, laga, golPemain)
  const grup = [...tim, ''].map((nama) => ({ nama, baris: awal.baris.filter((b) => kunciTim(b.tim) === kunciTim(nama)) })).filter((g) => g.baris.length > 0)

  const simpanHasil = () =>
    jalankan(async () => {
      const salah = laga.findIndex((l) => kunciTim(l.timA) === kunciTim(l.timB))
      if (salah >= 0) throw new Error(`Laga ${salah + 1}: pilih dua tim yang berbeda.`)
      const statistik = [...isian].map(([pemainId, s]) => ({ pemainId, ...s }))
      await kirim('simpanHasil', { sesiId, laga, statistik })
      const main = laga.filter((l) => l.skorA !== '' && l.skorB !== '').length
      return `Hasil tersimpan: ${main} laga dimainkan. Web publik ikut berubah ±5 menit lagi.`
    })

  return (
    <>
      {tim.length >= 2 && (
        <>
          <div className="sec-head">
            <h2 className="disp">Laga</h2>
            <span className="lbl mute">Skor kosong = belum main</span>
          </div>
          <div className="adm-laga">
            {laga.map((l, i) => (
              <div key={i} className="adm-card laga-card">
                <div className="adm-row-head">
                  <span className="lbl mute">Laga {i + 1}</span>
                  <button type="button" className="icon-btn" aria-label={`Hapus laga ${i + 1}`} onClick={() => setLaga(laga.filter((_, j) => j !== i))}>
                    ✕
                  </button>
                </div>
                {(['A', 'B'] as const).map((sisi) => (
                  <div key={sisi} className="laga-side">
                    <select className="input" aria-label={`Tim ${sisi} laga ${i + 1}`} value={sisi === 'A' ? l.timA : l.timB} onChange={(e) => ubahLaga(i, sisi === 'A' ? { timA: e.target.value } : { timB: e.target.value })}>
                      {tim.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                    <input
                      className="input skor"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      aria-label={`Skor tim ${sisi} laga ${i + 1}`}
                      value={sisi === 'A' ? l.skorA : l.skorB}
                      onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, '').slice(0, 2)
                        ubahLaga(i, sisi === 'A' ? { skorA: v } : { skorB: v })
                      }}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
          <button type="button" className="btn-ghost adm-acak" onClick={() => setLaga([...laga, { timA: tim[0], skorA: '', skorB: '', timB: tim[1] }])}>
            + Tambah laga
          </button>
        </>
      )}

      {grup.map((g) => (
        <section key={g.nama || '-'} className="block">
          <div className="sec-head">
            <h2 className="disp">{g.nama || 'Tanpa tim'}</h2>
            <span className="lbl mute">{g.baris.reduce((n, b) => n + (isian.get(b.pemainId)?.gol ?? 0), 0)} gol</span>
          </div>
          <div className="adm-stat adm-stat-head lbl mute" aria-hidden="true">
            <span>Pemain</span>
            <span>Gol</span>
            <span>Ast</span>
            <span>MOTM</span>
          </div>
          {g.baris.map((b) => {
            const p = pemainById.get(b.pemainId)
            const s = isian.get(b.pemainId)!
            return (
              <div key={b.pemainId} className="adm-stat">
                <span className="adm-name">
                  {p?.panggilan ?? b.pemainId}
                  <span className="c-pos">{p?.posisi}</span>
                </span>
                <Stepper label={`gol ${p?.panggilan}`} value={s.gol} onChange={(gol) => ubahIsian(b.pemainId, { gol })} />
                <Stepper label={`assist ${p?.panggilan}`} value={s.assist} onChange={(assist) => ubahIsian(b.pemainId, { assist })} />
                <button type="button" className={`star${s.motm ? ' on' : ''}`} aria-pressed={s.motm} aria-label={`MOTM ${p?.panggilan}`} onClick={() => ubahIsian(b.pemainId, { motm: !s.motm })}>
                  ★
                </button>
              </div>
            )
          })}
        </section>
      ))}

      {selisih.length > 0 && (
        <div className="adm-warn" role="note">
          <strong>Gol belum cocok dengan skor:</strong>
          {selisih.map((x) => (
            <div key={x.tim}>
              {x.tim}: skor {x.skor}, gol pemain {x.golPemain}
            </div>
          ))}
          <div className="mute">Tetap bisa disimpan (misal ada gol bunuh diri).</div>
        </div>
      )}

      <SaveBar status={status}>
        <button type="button" className="btn" disabled={sibuk} onClick={simpanHasil}>
          Simpan hasil
        </button>
      </SaveBar>
    </>
  )
}

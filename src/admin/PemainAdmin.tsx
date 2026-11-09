import { useState } from 'react'
import { PlayerPhoto } from '../components/PlayerPhoto'
import { Segmented } from '../components/Segmented'
import { POSISI, type LeagueData, type Pemain, type Posisi } from '../data/types'
import { POSISI_LABEL } from '../lib/format'
import type { Kirim } from './AdminPage'
import { Field, SaveBar, useSimpan } from './ui'

interface Form {
  id?: string
  nama: string
  panggilan: string
  posisi: Posisi
  fotoUrl: string
  aktif: boolean
}

const KOSONG: Form = { nama: '', panggilan: '', posisi: 'OUT', fotoUrl: '', aktif: true }

export function PemainAdmin({ data, kirim }: { data: LeagueData; kirim: Kirim }) {
  const [form, setForm] = useState<Form | null>(null)
  const [pilihan, setPilihan] = useState<Set<string> | null>(null) // null = mode pilih mati
  const { status, jalankan, sibuk } = useSimpan()
  const list = [...data.pemain].sort((a, b) => Number(b.aktif) - Number(a.aktif) || a.nama.localeCompare(b.nama, 'id'))

  const buka = (p: Pemain | null) => {
    setForm(p ? { id: p.id, nama: p.nama, panggilan: p.panggilan, posisi: p.posisi, fotoUrl: p.fotoUrl, aktif: p.aktif } : KOSONG)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const simpan = () =>
    jalankan(async () => {
      if (!form) return ''
      if (!form.nama.trim()) throw new Error('Nama wajib diisi.')
      const { id } = await kirim('simpanPemain', form)
      setForm(null)
      return form.id ? `${form.nama} diperbarui.` : `${form.nama} ditambahkan (${id}).`
    })

  const hapus = (ids: string[]) => {
    if (ids.length === 0) return
    const nama = ids.map((id) => data.pemain.find((p) => p.id === id)?.nama ?? id)
    const judul = ids.length === 1 ? `${nama[0]} (${ids[0]})` : `${ids.length} pemain: ${nama.join(', ')}`
    const sesi = new Set(data.statistik.filter((b) => ids.includes(b.pemainId)).map((b) => b.sesiId)).size
    const riwayat = sesi ? `\n\nTercatat di ${sesi} sesi. Gol, assist, dan MOTM-nya di sesi itu ikut terhapus. Kalau cuma tidak main lagi, lebih baik dinonaktifkan saja.` : ''
    if (!window.confirm(`Hapus ${judul}?${riwayat}`)) return
    jalankan(async () => {
      await kirim('hapusPemain', { ids })
      setForm(null)
      setPilihan(null)
      return ids.length === 1 ? `${nama[0]} dihapus.` : `${ids.length} pemain dihapus.`
    })
  }

  const togglePilih = (id: string) =>
    setPilihan((s) => {
      const hasil = new Set(s)
      if (hasil.has(id)) hasil.delete(id)
      else hasil.add(id)
      return hasil
    })

  return (
    <>
      {form ? (
        <section className="adm-card">
          <h2 className="disp adm-h">{form.id ? `Edit ${form.id}` : 'Pemain baru'}</h2>
          <Field label="Nama lengkap">
            <input className="input" value={form.nama} autoFocus onChange={(e) => setForm({ ...form, nama: e.target.value })} />
          </Field>
          <Field label="Panggilan" hint="Kosongkan untuk memakai kata pertama nama.">
            <input className="input" value={form.panggilan} placeholder={form.nama.trim().split(' ')[0]} onChange={(e) => setForm({ ...form, panggilan: e.target.value })} />
          </Field>
          <div className="field">
            <span className="lbl mute">Posisi · {POSISI_LABEL[form.posisi]}</span>
            <Segmented label="Posisi" value={form.posisi} options={POSISI.map((p) => ({ value: p, label: POSISI_LABEL[p] }))} onChange={(posisi) => setForm({ ...form, posisi })} />
          </div>
          <Field label="Link foto" hint="Opsional. Link gambar yang bisa dibuka publik.">
            <input className="input" type="url" inputMode="url" value={form.fotoUrl} placeholder="https://…" onChange={(e) => setForm({ ...form, fotoUrl: e.target.value })} />
          </Field>
          <label className="check">
            <input type="checkbox" checked={form.aktif} onChange={(e) => setForm({ ...form, aktif: e.target.checked })} />
            <span>Aktif (tampil di daftar & bisa dipilih di line-up)</span>
          </label>
        </section>
      ) : pilihan ? null : (
        <button type="button" className="btn adm-add" onClick={() => buka(null)}>
          + Tambah pemain
        </button>
      )}

      <div className="sec-head">
        <h2 className="disp">Anggota</h2>
        {pilihan ? (
          <button type="button" className="btn-ghost adm-mini" onClick={() => setPilihan(pilihan.size === list.length ? new Set() : new Set(list.map((p) => p.id)))}>
            {pilihan.size === list.length ? 'Kosongkan' : 'Pilih semua'}
          </button>
        ) : (
          <button
            type="button"
            className="btn-ghost adm-mini"
            disabled={list.length === 0}
            onClick={() => {
              setForm(null)
              setPilihan(new Set())
            }}
          >
            Pilih
          </button>
        )}
      </div>
      <p className="lbl mute adm-sub">
        {data.pemain.filter((p) => p.aktif).length} aktif · {data.pemain.length} total
      </p>
      <div className="lb-list">
        {list.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`lb-row no-rank adm-pick${p.aktif ? '' : ' off'}${pilihan?.has(p.id) ? ' on' : ''}`}
            aria-pressed={pilihan ? pilihan.has(p.id) : undefined}
            onClick={() => (pilihan ? togglePilih(p.id) : buka(p))}
          >
            {pilihan ? (
              <span className="tick" aria-hidden="true">
                {pilihan.has(p.id) ? '✓' : ''}
              </span>
            ) : (
              <PlayerPhoto pemain={p} size="sm" />
            )}
            <div>
              <div className="lb-name">{p.nama}</div>
              <div className="lb-pos">
                {p.id} · {POSISI_LABEL[p.posisi]}
                {!p.aktif && ' · nonaktif'}
              </div>
            </div>
            {!pilihan && <span className="lbl gold">Edit</span>}
          </button>
        ))}
      </div>

      {(form || pilihan || status.jenis !== 'idle') && (
        <SaveBar status={status}>
          {pilihan && (
            <>
              <button type="button" className="btn-ghost" disabled={sibuk} onClick={() => setPilihan(null)}>
                Batal
              </button>
              <button type="button" className="btn danger-fill" disabled={sibuk || pilihan.size === 0} onClick={() => hapus([...pilihan])}>
                Hapus {pilihan.size || ''}
              </button>
            </>
          )}
          {form && (
            <>
              {form.id && (
                <button type="button" className="btn-ghost danger" disabled={sibuk} onClick={() => hapus([form.id!])}>
                  Hapus
                </button>
              )}
              <button type="button" className="btn-ghost" disabled={sibuk} onClick={() => setForm(null)}>
                Batal
              </button>
              <button type="button" className="btn" disabled={sibuk} onClick={simpan}>
                Simpan
              </button>
            </>
          )}
        </SaveBar>
      )}
    </>
  )
}

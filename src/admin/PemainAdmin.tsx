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

const KOSONG: Form = { nama: '', panggilan: '', posisi: 'MID', fotoUrl: '', aktif: true }

export function PemainAdmin({ data, kirim }: { data: LeagueData; kirim: Kirim }) {
  const [form, setForm] = useState<Form | null>(null)
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
      const { id } = await kirim<{ id: string }>('simpanPemain', form)
      setForm(null)
      return form.id ? `${form.nama} diperbarui.` : `${form.nama} ditambahkan (${id}).`
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
            <Segmented label="Posisi" value={form.posisi} options={POSISI.map((p) => ({ value: p, label: p }))} onChange={(posisi) => setForm({ ...form, posisi })} />
          </div>
          <Field label="Link foto" hint="Opsional. Link gambar yang bisa dibuka publik.">
            <input className="input" type="url" inputMode="url" value={form.fotoUrl} placeholder="https://…" onChange={(e) => setForm({ ...form, fotoUrl: e.target.value })} />
          </Field>
          <label className="check">
            <input type="checkbox" checked={form.aktif} onChange={(e) => setForm({ ...form, aktif: e.target.checked })} />
            <span>Aktif (tampil di daftar & bisa dipilih di line-up)</span>
          </label>
        </section>
      ) : (
        <button type="button" className="btn adm-add" onClick={() => buka(null)}>
          + Tambah pemain
        </button>
      )}

      <div className="sec-head">
        <h2 className="disp">Anggota</h2>
        <span className="lbl mute">{data.pemain.filter((p) => p.aktif).length} aktif</span>
      </div>
      <div className="lb-list">
        {list.map((p) => (
          <button key={p.id} type="button" className={`lb-row no-rank adm-pick${p.aktif ? '' : ' off'}`} onClick={() => buka(p)}>
            <PlayerPhoto pemain={p} size="sm" />
            <div>
              <div className="lb-name">{p.nama}</div>
              <div className="lb-pos">
                {p.id} · {p.posisi}
                {!p.aktif && ' · nonaktif'}
              </div>
            </div>
            <span className="lbl gold">Edit</span>
          </button>
        ))}
      </div>

      {(form || status.jenis !== 'idle') && (
        <SaveBar status={status}>
          {form && (
            <>
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

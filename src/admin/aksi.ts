import type { RawTables, Row } from '../data/types'
import type { Tabel } from '../data/tabel'

// Aksi admin sebagai fungsi murni di atas tabel mentah (pindahan dari apps-script/Code.gs). Validasi gagal
// melempar Error dan tidak mengubah apa pun; kalau berhasil, tabel baru dan daftar tabel yang berubah
// dikembalikan supaya hanya dokumen itu yang ditulis.

export interface LineupInput {
  pemainId?: string
  tim: string
  baru?: { nama: string; posisi?: string }
}

export interface LagaInputAksi {
  timA: string
  timB: string
  skorA: string | number
  skorB: string | number
}

export interface InputAksi {
  simpanPemain: { id?: string; nama: string; panggilan?: string; posisi?: string; fotoUrl?: string; aktif?: boolean }
  simpanSesi: { id?: string; tanggal: string; lokasi?: string; catatan?: string; lineup: LineupInput[] }
  // tanpa statistik: hanya laga yang disimpan (tombol Selesai per laga)
  simpanHasil: { sesiId: string; laga: LagaInputAksi[]; statistik?: { pemainId: string; gol: number; assist: number; motm: boolean }[] }
  hapusPemain: { id?: string; ids?: string[] }
  hapusSesi: { id: string }
}

export interface HasilAksi {
  simpanPemain: { id: string }
  simpanSesi: { id: string; pemainBaru: string[] }
  simpanHasil: { sesiId: string }
  hapusPemain: { ids: string[] }
  hapusSesi: { id: string }
}

export type Aksi = keyof InputAksi

export interface Keluaran<A extends Aksi> {
  hasil: HasilAksi[A]
  tabel: RawTables
  berubah: Tabel[]
}

export const POIN_AWAL: Row[] = [
  { aksi: 'hadir', poin: '1' },
  { aksi: 'gol', poin: '3' },
  { aksi: 'assist', poin: '2' },
  { aksi: 'motm', poin: '5' },
  { aksi: 'menang', poin: '1' },
  { aksi: 'seri', poin: '0.5' },
]

const teks = (v: unknown) => (v === null || v === undefined ? '' : String(v).trim().replace(/\s+/g, ' '))
const kunciTim = (nama: unknown) => teks(nama).toLowerCase()
// Cuma kiper (GK) atau outfield (OUT).
const kePosisi = (v: unknown) => (['GK', 'KIPER', 'KEEPER'].includes(teks(v).toUpperCase()) ? 'GK' : 'OUT')

function jumlah(v: unknown): string {
  const n = Math.floor(Number(v))
  return String(Number.isFinite(n) && n > 0 ? n : 0)
}

function skor(v: unknown, i: number): string {
  const s = teks(v)
  if (s !== '' && !/^\d+$/.test(s)) throw new Error(`Laga ${i + 1}: skor "${s}" tidak valid.`)
  return s === '' ? '' : String(Number(s))
}

function idBaru(awalan: string, ids: (string | undefined)[], digit: number): string {
  const re = new RegExp(`^${awalan}(\\d+)$`)
  const maks = ids.reduce((m, id) => {
    const cocok = re.exec(id ?? '')
    return cocok ? Math.max(m, Number(cocok[1])) : m
  }, 0)
  return awalan + String(maks + 1).padStart(digit, '0')
}

type Penangan<A extends Aksi> = (t: RawTables, d: InputAksi[A]) => { hasil: HasilAksi[A]; berubah: Tabel[] }

const PENANGAN: { [A in Aksi]: Penangan<A> } = {
  simpanPemain(t, d) {
    const nama = teks(d.nama)
    if (!nama) throw new Error('Nama pemain wajib diisi.')
    let row: Row | undefined
    if (d.id) {
      row = t.pemain.find((r) => r.id === d.id)
      if (!row) throw new Error(`Pemain ${d.id} tidak ditemukan.`)
    } else {
      row = { id: idBaru('P', t.pemain.map((r) => r.id), 2) }
      t.pemain.push(row)
    }
    Object.assign(row, { nama, panggilan: teks(d.panggilan), posisi: kePosisi(d.posisi), foto_url: teks(d.fotoUrl), aktif: d.aktif === false ? 'FALSE' : 'TRUE' })
    return { hasil: { id: teks(row.id) }, berubah: ['pemain'] }
  },

  simpanSesi(t, d) {
    const tanggal = teks(d.tanggal)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) throw new Error('Tanggal sesi wajib diisi.')
    const lineup = (Array.isArray(d.lineup) ? d.lineup : []).map((l) => ({ ...l }))
    if (lineup.length === 0) throw new Error('Pilih minimal satu pemain yang hadir.')
    // Pemain baru dari form sesi ({ baru: { nama, posisi } }) didaftarkan ke tabel pemain sekaligus.
    const pemainBaru: string[] = []
    for (const l of lineup) {
      if (!teks(l.tim)) throw new Error('Semua pemain yang hadir harus punya tim.')
      if (l.baru) {
        const nama = teks(l.baru.nama)
        if (!nama) throw new Error('Nama pemain baru wajib diisi.')
        l.pemainId = idBaru('P', t.pemain.map((r) => r.id), 2)
        t.pemain.push({ id: l.pemainId, nama, panggilan: '', posisi: kePosisi(l.baru.posisi), foto_url: '', aktif: 'TRUE' })
        pemainBaru.push(l.pemainId)
      } else if (!t.pemain.some((r) => r.id === l.pemainId)) {
        throw new Error(`Pemain ${l.pemainId} tidak dikenal.`)
      }
    }

    let row: Row | undefined
    if (d.id) {
      row = t.sesi.find((r) => r.sesi_id === d.id)
      if (!row) throw new Error(`Sesi ${d.id} tidak ditemukan.`)
    } else {
      row = { sesi_id: idBaru('S', t.sesi.map((r) => r.sesi_id), 3) }
      t.sesi.push(row)
    }
    Object.assign(row, { tanggal, lokasi: teks(d.lokasi), catatan: teks(d.catatan) })
    const id = teks(row.sesi_id)

    // Ganti baris statistik sesi ini; gol/assist/MOTM pemain yang tetap hadir dipertahankan.
    const lama = new Map(t.statistik.filter((r) => r.sesi_id === id).map((r) => [r.pemain_id, r]))
    t.statistik = t.statistik
      .filter((r) => r.sesi_id !== id)
      .concat(lineup.map((l) => ({ hasil: '', gol: '0', assist: '0', motm: '0', ...lama.get(l.pemainId!), sesi_id: id, pemain_id: l.pemainId!, tim: teks(l.tim) })))

    // Laga yang timnya sudah tidak ada di line-up tidak bisa dipakai lagi.
    const timAda = new Set(lineup.map((l) => kunciTim(l.tim)))
    t.laga = t.laga.filter((r) => r.sesi_id !== id || (timAda.has(kunciTim(r.tim_a)) && timAda.has(kunciTim(r.tim_b))))

    return { hasil: { id, pemainBaru }, berubah: pemainBaru.length ? ['pemain', 'sesi', 'statistik', 'laga'] : ['sesi', 'statistik', 'laga'] }
  },

  simpanHasil(t, d) {
    const sesiId = teks(d.sesiId)
    if (!t.sesi.some((r) => r.sesi_id === sesiId)) throw new Error(`Sesi ${sesiId} tidak ditemukan.`)
    const barisSesi = t.statistik.filter((r) => r.sesi_id === sesiId)
    const timAda = new Set(barisSesi.map((r) => kunciTim(r.tim)))

    const lagaBaru = (Array.isArray(d.laga) ? d.laga : []).map((l, i) => {
      const timA = teks(l.timA)
      const timB = teks(l.timB)
      if (!timAda.has(kunciTim(timA)) || !timAda.has(kunciTim(timB))) throw new Error(`Laga ${i + 1}: tim tidak ada di line-up sesi ini.`)
      if (kunciTim(timA) === kunciTim(timB)) throw new Error(`Laga ${i + 1}: tim tidak boleh melawan dirinya sendiri.`)
      return { sesi_id: sesiId, tim_a: timA, skor_a: skor(l.skorA, i), skor_b: skor(l.skorB, i), tim_b: timB }
    })

    const berubah: Tabel[] = ['laga']
    if (d.statistik) {
      const perPemain = new Map(barisSesi.map((r) => [r.pemain_id, r]))
      for (const s of d.statistik) {
        const r = perPemain.get(s.pemainId)
        if (!r) throw new Error(`Pemain ${s.pemainId} tidak ada di line-up sesi ini.`)
        Object.assign(r, { gol: jumlah(s.gol), assist: jumlah(s.assist), motm: s.motm ? '1' : '0' })
      }
      berubah.push('statistik')
    }

    t.laga = t.laga.filter((r) => r.sesi_id !== sesiId).concat(lagaBaru)
    return { hasil: { sesiId }, berubah }
  },

  // Menghapus satu ({ id }) atau banyak ({ ids }) pemain beserta baris statistiknya di semua sesi.
  hapusPemain(t, d) {
    const ids = (Array.isArray(d.ids) ? d.ids : [d.id]).map(teks).filter(Boolean)
    if (ids.length === 0) throw new Error('Pilih minimal satu pemain.')
    const hilang = ids.filter((id) => !t.pemain.some((r) => r.id === id))
    if (hilang.length) throw new Error(`Pemain ${hilang.join(', ')} tidak ditemukan.`)
    t.pemain = t.pemain.filter((r) => !ids.includes(teks(r.id)))
    t.statistik = t.statistik.filter((r) => !ids.includes(teks(r.pemain_id)))
    return { hasil: { ids }, berubah: ['pemain', 'statistik'] }
  },

  hapusSesi(t, d) {
    const id = teks(d.id)
    if (!t.sesi.some((r) => r.sesi_id === id)) throw new Error(`Sesi ${id} tidak ditemukan.`)
    t.sesi = t.sesi.filter((r) => r.sesi_id !== id)
    t.statistik = t.statistik.filter((r) => r.sesi_id !== id)
    t.laga = t.laga.filter((r) => r.sesi_id !== id)
    return { hasil: { id }, berubah: ['sesi', 'statistik', 'laga'] }
  },
}

export function jalankanAksi<A extends Aksi>(tabel: RawTables, aksi: A, data: InputAksi[A]): Keluaran<A> {
  const penangan = PENANGAN[aksi] as Penangan<A> | undefined
  if (!penangan) throw new Error(`Aksi "${aksi}" tidak dikenal.`)
  // salinan dalam: tabel asli tetap utuh kalau validasi gagal di tengah jalan
  const t = structuredClone(tabel)
  const { hasil, berubah } = penangan(t, data ?? ({} as InputAksi[A]))
  return { hasil, tabel: t, berubah }
}

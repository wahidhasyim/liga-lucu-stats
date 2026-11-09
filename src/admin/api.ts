import { PAKAI_FIREBASE, SHEETS_API_URL } from '../config'
import { bacaContoh, TABEL, tulisContoh } from '../data/tabel'
import type { RawTables, Row } from '../data/types'
import { jalankanAksi, POIN_AWAL, type Aksi, type HasilAksi, type InputAksi } from './aksi'

export type { Aksi } from './aksi'

// Penghubung halaman admin ke penyimpanan: Firestore di produksi, data contoh di memori saat development.
export interface Backend {
  // dipanggil dengan status login sekarang dan setiap kali berubah; mengembalikan fungsi berhenti
  pantauLogin(cb: (masuk: boolean) => void): () => void
  masuk(password: string): Promise<void>
  keluar(): Promise<void>
  jalankan<A extends Aksi>(aksi: A, data: InputAksi[A]): Promise<HasilAksi[A]>
  // menyalin data Google Sheets (Apps Script lama) ke penyimpanan yang masih kosong
  impor(): Promise<number>
}

export const PASSWORD_CONTOH = '1234'

function buatBackendContoh(): Backend {
  let masuk = false
  const pendengar = new Set<(m: boolean) => void>()
  const ubah = (m: boolean) => {
    masuk = m
    pendengar.forEach((f) => f(m))
  }
  return {
    pantauLogin(cb) {
      pendengar.add(cb)
      cb(masuk)
      return () => pendengar.delete(cb)
    },
    async masuk(password) {
      await new Promise((r) => setTimeout(r, 300))
      if (password !== PASSWORD_CONTOH) throw new Error('Password salah.')
      ubah(true)
    },
    async keluar() {
      ubah(false)
    },
    async jalankan(aksi, data) {
      // jeda kecil meniru jaringan, supaya status "menyimpan" ikut teruji
      await new Promise((r) => setTimeout(r, 300))
      const k = jalankanAksi(await bacaContoh(), aksi, data)
      tulisContoh(k.tabel)
      return k.hasil
    },
    async impor() {
      throw new Error('Impor hanya tersedia saat tersambung ke Firebase.')
    },
  }
}

// Data dari Apps Script lama, dalam bentuk yang sama dengan dokumen Firestore.
export async function bacaSheets(): Promise<RawTables> {
  const res = await fetch(SHEETS_API_URL)
  if (!res.ok) throw new Error(`Gagal membaca Google Sheets (HTTP ${res.status})`)
  const balasan: { ok: boolean; error?: string; data?: RawTables } = await res.json()
  if (!balasan.ok || !balasan.data) throw new Error(balasan.error ?? 'Data Google Sheets tidak valid.')
  const t = Object.fromEntries(TABEL.map((nama) => [nama, (balasan.data![nama] ?? []).map(bersihkan)])) as unknown as RawTables
  if (t.poin.length === 0) t.poin = POIN_AWAL.map((r) => ({ ...r }))
  return t
}

// Firestore menolak nilai undefined; semua sel disimpan sebagai teks.
const bersihkan = (r: Row): Row => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v ?? '']))

let backend: Promise<Backend> | null = null

export function ambilBackend(): Promise<Backend> {
  backend ??= PAKAI_FIREBASE ? import('./firebaseBackend').then((m) => m.buatBackendFirebase()) : Promise.resolve(buatBackendContoh())
  return backend
}

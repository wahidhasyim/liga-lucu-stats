import { collection, onSnapshot } from 'firebase/firestore'
import Papa from 'papaparse'
import { PAKAI_FIREBASE } from '../config'
import { db } from '../lib/firebase'
import type { RawTables, Row } from './types'

export type Tabel = keyof RawTables
export const TABEL: Tabel[] = ['pemain', 'sesi', 'statistik', 'laga', 'poin']

// Data contoh untuk development tanpa Firebase.
const SAMPLE: Record<Tabel, () => Promise<string>> = {
  pemain: () => import('../../sheet-template/Pemain.csv?raw').then((m) => m.default),
  sesi: () => import('../../sheet-template/Sesi.csv?raw').then((m) => m.default),
  statistik: () => import('../../sheet-template/Statistik.csv?raw').then((m) => m.default),
  laga: () => import('../../sheet-template/Laga.csv?raw').then((m) => m.default),
  poin: () => import('../../sheet-template/Poin.csv?raw').then((m) => m.default),
}

export function parseCsv(text: string): Row[] {
  return Papa.parse<Row>(text, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim().toLowerCase(),
  }).data
}

export const tabelKosong = (): RawTables => ({ pemain: [], sesi: [], statistik: [], laga: [], poin: [] })

// ---------- data contoh di memori (development) ----------

let contoh: Promise<RawTables> | null = null
const pendengarContoh = new Set<(t: RawTables) => void>()

export function bacaContoh(): Promise<RawTables> {
  contoh ??= Promise.all(TABEL.map((t) => SAMPLE[t]().then(parseCsv))).then(([pemain, sesi, statistik, laga, poin]) => ({ pemain, sesi, statistik, laga, poin }))
  return contoh
}

// Admin mode development menulis ke sini; perubahan hilang saat halaman dimuat ulang.
export function tulisContoh(t: RawTables) {
  contoh = Promise.resolve(t)
  pendengarContoh.forEach((f) => f(t))
}

// ---------- langganan ----------

export interface Langganan {
  data: (t: RawTables) => void
  error: (e: Error) => void
}

// Semua tabel ada di koleksi Firestore "tabel", satu dokumen per tabel: { rows: Row[] }.
// Mengembalikan fungsi untuk berhenti berlangganan.
export function langganTabel(cb: Langganan): () => void {
  if (!PAKAI_FIREBASE) {
    pendengarContoh.add(cb.data)
    bacaContoh().then(cb.data, cb.error)
    return () => pendengarContoh.delete(cb.data)
  }
  return onSnapshot(
    collection(db(), 'tabel'),
    (snap) => {
      // cache kosong (kunjungan pertama): tunggu jawaban server supaya web tidak sempat tampil kosong
      if (snap.empty && snap.metadata.fromCache) return
      const t = tabelKosong()
      snap.forEach((d) => {
        if ((TABEL as string[]).includes(d.id)) t[d.id as Tabel] = (d.data().rows as Row[] | undefined) ?? []
      })
      cb.data(t)
    },
    (e) => cb.error(new Error(`Gagal memuat data: ${e.message}`)),
  )
}

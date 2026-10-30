import Papa from 'papaparse'
import { SHEET_URLS } from '../config'
import { parseLeague } from './parse'
import type { LeagueData, RawTables, Row } from './types'

type Tabel = keyof RawTables
export const TABEL: Tabel[] = ['pemain', 'sesi', 'statistik', 'laga', 'poin']

// Dipakai saat semua link kosong, supaya web bisa dicoba tanpa Google Sheets.
export const SAMPLE: Record<Tabel, () => Promise<string>> = {
  pemain: () => import('../../sheet-template/Pemain.csv?raw').then((m) => m.default),
  sesi: () => import('../../sheet-template/Sesi.csv?raw').then((m) => m.default),
  statistik: () => import('../../sheet-template/Statistik.csv?raw').then((m) => m.default),
  laga: () => import('../../sheet-template/Laga.csv?raw').then((m) => m.default),
  poin: () => import('../../sheet-template/Poin.csv?raw').then((m) => m.default),
}

// Data contoh tidak pernah dicampur dengan data asli.
const PAKAI_CONTOH = TABEL.every((t) => !SHEET_URLS[t])

export function parseCsv(text: string): Row[] {
  return Papa.parse<Row>(text, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim().toLowerCase(),
  }).data
}

async function loadText(tabel: Tabel): Promise<string> {
  const url = SHEET_URLS[tabel]
  if (PAKAI_CONTOH) return SAMPLE[tabel]()
  // Tab Laga opsional: tanpa laga, M/S/K pemain diambil dari kolom hasil.
  if (!url && tabel === 'laga') return ''
  if (!url) throw new Error(`Link tab ${tabel} belum diisi (VITE_SHEET_${tabel.toUpperCase()}_URL).`)
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`Gagal memuat tab ${tabel} (HTTP ${res.status})`)
  const text = await res.text()
  // Sheet yang belum di-publish mengembalikan halaman HTML, bukan CSV.
  if (text.trimStart().startsWith('<')) throw new Error(`Tab ${tabel} bukan CSV. Pastikan sudah "Publish to web".`)
  return text
}

export async function loadLeague(): Promise<LeagueData> {
  const [pemain, sesi, statistik, laga, poin] = (await Promise.all(TABEL.map(loadText))).map(parseCsv)
  return parseLeague({ pemain, sesi, statistik, laga, poin })
}

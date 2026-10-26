import Papa from 'papaparse'
import { parseLeague } from './parse'
import type { LeagueData, RawTables, Row } from './types'

type Tabel = keyof RawTables
const TABEL: Tabel[] = ['pemain', 'sesi', 'statistik', 'poin']

const SHEET_URLS: Record<Tabel, string | undefined> = {
  pemain: import.meta.env.VITE_SHEET_PEMAIN_URL,
  sesi: import.meta.env.VITE_SHEET_SESI_URL,
  statistik: import.meta.env.VITE_SHEET_STATISTIK_URL,
  poin: import.meta.env.VITE_SHEET_POIN_URL,
}

// Dipakai saat env var belum diisi, supaya web bisa dicoba tanpa Google Sheets.
const SAMPLE: Record<Tabel, () => Promise<string>> = {
  pemain: () => import('../../sheet-template/Pemain.csv?raw').then((m) => m.default),
  sesi: () => import('../../sheet-template/Sesi.csv?raw').then((m) => m.default),
  statistik: () => import('../../sheet-template/Statistik.csv?raw').then((m) => m.default),
  poin: () => import('../../sheet-template/Poin.csv?raw').then((m) => m.default),
}

export function parseCsv(text: string): Row[] {
  return Papa.parse<Row>(text, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim().toLowerCase(),
  }).data
}

async function loadText(tabel: Tabel): Promise<string> {
  const url = SHEET_URLS[tabel]
  if (!url) return SAMPLE[tabel]()
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`Gagal memuat tab ${tabel} (HTTP ${res.status})`)
  const text = await res.text()
  // Sheet yang belum di-publish mengembalikan halaman HTML, bukan CSV.
  if (text.trimStart().startsWith('<')) throw new Error(`Tab ${tabel} bukan CSV. Pastikan sudah "Publish to web".`)
  return text
}

export async function loadLeague(): Promise<LeagueData> {
  const [pemain, sesi, statistik, poin] = (await Promise.all(TABEL.map(loadText))).map(parseCsv)
  return parseLeague({ pemain, sesi, statistik, poin })
}

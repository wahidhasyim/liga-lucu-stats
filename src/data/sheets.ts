import Papa from 'papaparse'
import { API_URL, SHEET_URLS } from '../config'
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
const PAKAI_CONTOH = !API_URL && TABEL.every((t) => !SHEET_URLS[t])

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

// Apps Script (doGet) mengembalikan semua tab sekaligus dalam bentuk baris objek.
async function loadViaApi(): Promise<LeagueData> {
  const res = await fetch(API_URL)
  if (!res.ok) throw new Error(`Gagal memuat data (HTTP ${res.status})`)
  const balasan: { ok: boolean; error?: string; data?: RawTables } = await res.json()
  if (!balasan.ok || !balasan.data) throw new Error(balasan.error ?? 'Data tidak valid.')
  return parseLeague(balasan.data)
}

export async function loadLeague(): Promise<LeagueData> {
  if (API_URL) return loadViaApi()
  const [pemain, sesi, statistik, laga, poin] = (await Promise.all(TABEL.map(loadText))).map(parseCsv)
  return parseLeague({ pemain, sesi, statistik, laga, poin })
}

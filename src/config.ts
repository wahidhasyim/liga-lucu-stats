import type { RawTables } from './data/types'

const env = import.meta.env

// Link-link ini tidak rahasia: CSV memang dipublikasikan, dan API admin dilindungi PIN.
// Env var (mis. di .env.production.local) didahulukan; kalau kosong, pakai nilai di sini.
export const SHEET_URLS: Record<keyof RawTables, string> = {
  pemain: env.VITE_SHEET_PEMAIN_URL || '',
  sesi: env.VITE_SHEET_SESI_URL || '',
  statistik: env.VITE_SHEET_STATISTIK_URL || '',
  laga: env.VITE_SHEET_LAGA_URL || '',
  poin: env.VITE_SHEET_POIN_URL || '',
}

// URL Web app dari apps-script/Code.gs.
export const ADMIN_API_URL: string = env.VITE_ADMIN_API_URL || ''

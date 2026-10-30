import type { RawTables } from './data/types'

const env = import.meta.env

// Link-link ini tidak rahasia: datanya memang publik, dan penulisan lewat API dilindungi PIN admin.
// Env var (mis. di .env.production.local) didahulukan; kalau kosong, pakai nilai di sini.

// URL Web app dari apps-script/Code.gs. Dipakai web publik (baca) dan halaman admin (tulis).
// VITE_API_URL= (kosong) mematikannya, misalnya saat development supaya memakai data contoh.
export const API_URL: string =
  env.VITE_API_URL ?? 'https://script.google.com/macros/s/AKfycbwqbBweUYb_NpWkpJt56KSLZdqm2TqjtAbl-6by_yAoW4achQT8D-n0WE3SMbP3c1pZaA/exec'

// Cadangan bila API_URL kosong: link CSV "Publish to web" per tab.
export const SHEET_URLS: Record<keyof RawTables, string> = {
  pemain: env.VITE_SHEET_PEMAIN_URL || '',
  sesi: env.VITE_SHEET_SESI_URL || '',
  statistik: env.VITE_SHEET_STATISTIK_URL || '',
  laga: env.VITE_SHEET_LAGA_URL || '',
  poin: env.VITE_SHEET_POIN_URL || '',
}

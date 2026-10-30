import { ADMIN_API_URL } from '../config'
import { parseLeague } from '../data/parse'
import type { LeagueData, RawTables } from '../data/types'

export type Aksi = 'baca' | 'simpanPemain' | 'simpanSesi' | 'simpanHasil' | 'hapusSesi'

interface Balasan {
  ok: boolean
  error?: string
  hasil?: unknown
  data?: RawTables
}

type Transport = (body: string) => Promise<Balasan>

// Content-Type text/plain supaya browser tidak mengirim preflight CORS (Apps Script tidak menjawabnya).
const viaApi: Transport = async (body) => {
  const res = await fetch(ADMIN_API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body })
  if (!res.ok) throw new Error(`Server admin error (HTTP ${res.status})`)
  return res.json()
}

let transport: Promise<Transport | null> | null = null

function ambilTransport(): Promise<Transport | null> {
  transport ??= ADMIN_API_URL ? Promise.resolve(viaApi) : import.meta.env.DEV ? import('./devApi').then((m) => m.buatDevTransport()) : Promise.resolve(null)
  return transport
}

export const adminTersambung = Boolean(ADMIN_API_URL) || import.meta.env.DEV

export async function panggil<T = unknown>(pin: string, action: Aksi, data?: unknown): Promise<{ hasil: T; data: LeagueData }> {
  const kirim = await ambilTransport()
  if (!kirim) throw new Error('Halaman admin belum disambungkan ke Google Sheets.')
  let balasan: Balasan
  try {
    balasan = await kirim(JSON.stringify({ pin, action, data }))
  } catch (err) {
    throw new Error(err instanceof TypeError ? 'Tidak bisa menghubungi server. Cek koneksi internet.' : (err as Error).message)
  }
  if (!balasan.ok || !balasan.data) throw new Error(balasan.error ?? 'Terjadi kesalahan.')
  return { hasil: balasan.hasil as T, data: parseLeague(balasan.data) }
}

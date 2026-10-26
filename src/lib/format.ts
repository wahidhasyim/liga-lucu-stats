import type { Posisi } from '../data/types'

const tanggalPanjang = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })
const tanggalPendek = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })

function toDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const formatTanggal = (iso: string) => tanggalPanjang.format(toDate(iso))
export const formatTanggalPendek = (iso: string) => tanggalPendek.format(toDate(iso))

export const formatAngka = (n: number) => n.toLocaleString('id-ID', { maximumFractionDigits: 1 })
export const formatDesimal = (n: number) => n.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
export const formatPersen = (r: number) => `${Math.round(r * 100)}%`

export const POSISI_LABEL: Record<Posisi, string> = { GK: 'Kiper', DEF: 'Bek', MID: 'Gelandang', FWD: 'Penyerang' }

export function inisial(nama: string): string {
  return nama
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

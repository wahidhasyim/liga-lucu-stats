import type { BarisStat, Hasil, LeagueData, Pemain, Poin, Sesi } from '../data/types'

export type Rentang = 'semua' | 'bulan-ini'

export type StatKey = 'rating' | 'hadir' | 'gol' | 'assist' | 'motm' | 'menang' | 'winRate' | 'poinPerSesi'
export const STAT_KEYS: StatKey[] = ['rating', 'hadir', 'gol', 'assist', 'motm', 'menang', 'winRate', 'poinPerSesi']

export function isStatKey(v: unknown): v is StatKey {
  return typeof v === 'string' && (STAT_KEYS as string[]).includes(v)
}

export interface PlayerStats {
  pemain: Pemain
  hadir: number
  gol: number
  assist: number
  motm: number
  menang: number
  seri: number
  kalah: number
  winRate: number
  rating: number
  poinPerSesi: number
  peringkat: number | null
}

export interface Riwayat {
  sesi: Sesi
  hasil: Hasil | null
  gol: number
  assist: number
  motm: boolean
  poin: number
}

export interface BarisSesi {
  pemain: Pemain
  baris: BarisStat
  poin: number
}

export function poinBaris(b: BarisStat, poin: Poin): number {
  const p = (aksi: string) => poin[aksi] ?? 0
  let total = p('hadir') + b.gol * p('gol') + b.assist * p('assist')
  if (b.motm) total += p('motm')
  if (b.hasil === 'M') total += p('menang')
  else if (b.hasil === 'S') total += p('seri')
  else if (b.hasil === 'K') total += p('kalah')
  return total
}

function bulanKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function sesiDalamRentang(sesi: Sesi[], rentang: Rentang, today: Date): Sesi[] {
  if (rentang === 'semua') return sesi
  const key = bulanKey(today)
  return sesi.filter((s) => s.tanggal.startsWith(key))
}

export function compareDefault(a: PlayerStats, b: PlayerStats): number {
  return b.rating - a.rating || b.poinPerSesi - a.poinPerSesi || b.gol - a.gol || a.pemain.nama.localeCompare(b.pemain.nama, 'id')
}

export function sortBy(list: PlayerStats[], key: StatKey): PlayerStats[] {
  return [...list].sort((a, b) => b[key] - a[key] || compareDefault(a, b))
}

export function computePlayerStats(data: LeagueData, rentang: Rentang = 'semua', today = new Date()): PlayerStats[] {
  const sesiIds = new Set(sesiDalamRentang(data.sesi, rentang, today).map((s) => s.id))
  const byPemain = new Map<string, PlayerStats>()
  for (const pemain of data.pemain) {
    byPemain.set(pemain.id, { pemain, hadir: 0, gol: 0, assist: 0, motm: 0, menang: 0, seri: 0, kalah: 0, winRate: 0, rating: 0, poinPerSesi: 0, peringkat: null })
  }
  for (const b of data.statistik) {
    if (!sesiIds.has(b.sesiId)) continue
    const s = byPemain.get(b.pemainId)
    if (!s) continue
    s.hadir++
    s.gol += b.gol
    s.assist += b.assist
    if (b.motm) s.motm++
    if (b.hasil === 'M') s.menang++
    else if (b.hasil === 'S') s.seri++
    else if (b.hasil === 'K') s.kalah++
    s.rating += poinBaris(b, data.poin)
  }
  const all = [...byPemain.values()]
  for (const s of all) {
    s.winRate = s.hadir ? s.menang / s.hadir : 0
    s.poinPerSesi = s.hadir ? s.rating / s.hadir : 0
  }
  all.sort(compareDefault)
  let rank = 0
  for (const s of all) if (s.pemain.aktif && s.hadir > 0) s.peringkat = ++rank
  return all
}

export function riwayatPemain(data: LeagueData, pemainId: string): Riwayat[] {
  const sesiById = new Map(data.sesi.map((s) => [s.id, s]))
  return data.statistik
    .filter((b) => b.pemainId === pemainId)
    .flatMap((b) => {
      const sesi = sesiById.get(b.sesiId)
      return sesi ? [{ sesi, hasil: b.hasil, gol: b.gol, assist: b.assist, motm: b.motm, poin: poinBaris(b, data.poin) }] : []
    })
    .sort((a, b) => a.sesi.pekan - b.sesi.pekan)
}

export function barisSesi(data: LeagueData, sesiId: string): BarisSesi[] {
  const pemainById = new Map(data.pemain.map((p) => [p.id, p]))
  return data.statistik
    .filter((b) => b.sesiId === sesiId)
    .flatMap((baris) => {
      const pemain = pemainById.get(baris.pemainId)
      return pemain ? [{ pemain, baris, poin: poinBaris(baris, data.poin) }] : []
    })
    .sort((a, b) => b.poin - a.poin || a.pemain.nama.localeCompare(b.pemain.nama, 'id'))
}

export function ringkasan(data: LeagueData) {
  return {
    totalSesi: data.sesi.length,
    totalGol: data.statistik.reduce((n, b) => n + b.gol, 0),
    pemainAktif: data.pemain.filter((p) => p.aktif).length,
  }
}

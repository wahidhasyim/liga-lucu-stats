import { kunciTim } from '../data/parse'
import type { BarisStat, Laga, LeagueData, Pemain, Poin, Sesi } from '../data/types'

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
  tim: string
  menang: number
  seri: number
  kalah: number
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
  return total + b.menang * p('menang') + b.seri * p('seri') + b.kalah * p('kalah')
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
    s.menang += b.menang
    s.seri += b.seri
    s.kalah += b.kalah
    s.rating += poinBaris(b, data.poin)
  }
  const all = [...byPemain.values()]
  for (const s of all) {
    const laga = s.menang + s.seri + s.kalah
    s.winRate = laga ? s.menang / laga : 0
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
      return sesi ? [{ sesi, tim: b.tim, menang: b.menang, seri: b.seri, kalah: b.kalah, gol: b.gol, assist: b.assist, motm: b.motm, poin: poinBaris(b, data.poin) }] : []
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

export interface BarisStanding {
  tim: string
  main: number
  menang: number
  seri: number
  kalah: number
  golMasuk: number
  kemasukan: number
  selisih: number
  poin: number
}

export function lagaSesi(data: LeagueData, sesiId: string): Laga[] {
  return data.laga.filter((l) => l.sesiId === sesiId)
}

// Klasemen satu sesi. Poin tim tetap 3-1-0; tab Poin hanya untuk rating pemain.
export function standingSesi(laga: Laga[]): BarisStanding[] {
  const byTim = new Map<string, BarisStanding>()
  const catat = (nama: string, masuk: number, kemasukan: number) => {
    const kunci = kunciTim(nama)
    let t = byTim.get(kunci)
    if (!t) byTim.set(kunci, (t = { tim: nama, main: 0, menang: 0, seri: 0, kalah: 0, golMasuk: 0, kemasukan: 0, selisih: 0, poin: 0 }))
    t.main++
    t.golMasuk += masuk
    t.kemasukan += kemasukan
    t.selisih = t.golMasuk - t.kemasukan
    if (masuk > kemasukan) t.menang++
    else if (masuk === kemasukan) t.seri++
    else t.kalah++
    t.poin = t.menang * 3 + t.seri
  }
  for (const l of laga) {
    catat(l.timA, l.skorA, l.skorB)
    catat(l.timB, l.skorB, l.skorA)
  }
  return [...byTim.values()].sort((a, b) => b.poin - a.poin || b.selisih - a.selisih || b.golMasuk - a.golMasuk || a.tim.localeCompare(b.tim, 'id'))
}

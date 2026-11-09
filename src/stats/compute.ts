import { kunciTim } from '../data/parse'
import type { BarisStat, JadwalLaga, Laga, LeagueData, Pemain, Poin, Sesi } from '../data/types'

export type Rentang = 'semua' | 'bulan-ini'

export type StatKey = 'rating' | 'poin' | 'hadir' | 'gol' | 'assist' | 'motm' | 'menang' | 'winRate'
export const STAT_KEYS: StatKey[] = ['rating', 'poin', 'hadir', 'gol', 'assist', 'motm', 'menang', 'winRate']

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
  rating: number // rata-rata rating per sesi, skala 1–10
  poin: number // total poin
  peringkat: number | null
  // khusus kiper
  kebobolan: number
  cleanSheet: number
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
  rating: number
}

export interface BarisSesi {
  pemain: Pemain
  baris: BarisStat
  poin: number
  rating: number
}

export function poinBaris(b: BarisStat, poin: Poin): number {
  const p = (aksi: string) => poin[aksi] ?? 0
  let total = p('hadir') + b.gol * p('gol') + b.assist * p('assist')
  if (b.motm) total += p('motm')
  total += b.cleanSheet * p('clean_sheet') + b.kebobolanSatu * p('kebobolan_1')
  return total + b.menang * p('menang') + b.seri * p('seri') + b.kalah * p('kalah')
}

// Rating sesi ala rating pemain Eropa: main biasa (poin 2,5) bernilai 6,0, tiap poin menambah 0,2, dibatasi 3,0–10,0.
export function ratingSesi(poin: number): number {
  const r = Math.min(10, Math.max(3, 6 + 0.2 * (poin - 2.5)))
  return Math.round(r * 10) / 10
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
  return b.rating - a.rating || b.poin - a.poin || b.gol - a.gol || a.pemain.nama.localeCompare(b.pemain.nama, 'id')
}

// Top skor dan top assist saling jadi penentu kalau jumlahnya sama, baru setelah itu urutan bawaan.
const PENENTU: Partial<Record<StatKey, StatKey>> = { gol: 'assist', assist: 'gol' }

export function sortBy(list: PlayerStats[], key: StatKey): PlayerStats[] {
  const kedua = PENENTU[key]
  return [...list].sort((a, b) => b[key] - a[key] || (kedua ? b[kedua] - a[kedua] : 0) || compareDefault(a, b))
}

export function computePlayerStats(data: LeagueData, rentang: Rentang = 'semua', today = new Date()): PlayerStats[] {
  const sesiIds = new Set(sesiDalamRentang(data.sesi, rentang, today).map((s) => s.id))
  const byPemain = new Map<string, PlayerStats>()
  for (const pemain of data.pemain) {
    byPemain.set(pemain.id, { pemain, hadir: 0, gol: 0, assist: 0, motm: 0, menang: 0, seri: 0, kalah: 0, winRate: 0, rating: 0, poin: 0, peringkat: null, kebobolan: 0, cleanSheet: 0 })
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
    s.kebobolan += b.kebobolan
    s.cleanSheet += b.cleanSheet
    const poin = poinBaris(b, data.poin)
    s.poin += poin
    s.rating += ratingSesi(poin)
  }
  const all = [...byPemain.values()]
  for (const s of all) {
    const laga = s.menang + s.seri + s.kalah
    s.winRate = laga ? s.menang / laga : 0
    s.rating = s.hadir ? s.rating / s.hadir : 0
  }
  all.sort(compareDefault)
  let rank = 0
  for (const s of all) if (s.pemain.aktif && s.hadir > 0) s.peringkat = ++rank
  return all
}

export const jumlahLaga = (s: PlayerStats) => s.menang + s.seri + s.kalah
export const kebobolanPerLaga = (s: PlayerStats) => s.kebobolan / jumlahLaga(s)

// Papan kiper: kiper aktif yang sudah main, rata-rata kebobolan per laga paling kecil di atas,
// lalu clean sheet terbanyak, laga terbanyak, baru urutan bawaan.
export function peringkatKiper(list: PlayerStats[]): PlayerStats[] {
  return list
    .filter((s) => s.pemain.posisi === 'GK' && s.pemain.aktif && jumlahLaga(s) > 0)
    .sort((a, b) => kebobolanPerLaga(a) - kebobolanPerLaga(b) || b.cleanSheet - a.cleanSheet || jumlahLaga(b) - jumlahLaga(a) || compareDefault(a, b))
}

export function riwayatPemain(data: LeagueData, pemainId: string): Riwayat[] {
  const sesiById = new Map(data.sesi.map((s) => [s.id, s]))
  return data.statistik
    .filter((b) => b.pemainId === pemainId)
    .flatMap((b) => {
      const sesi = sesiById.get(b.sesiId)
      if (!sesi) return []
      const poin = poinBaris(b, data.poin)
      return [{ sesi, tim: b.tim, menang: b.menang, seri: b.seri, kalah: b.kalah, gol: b.gol, assist: b.assist, motm: b.motm, poin, rating: ratingSesi(poin) }]
    })
    .sort((a, b) => a.sesi.pekan - b.sesi.pekan)
}

export function barisSesi(data: LeagueData, sesiId: string): BarisSesi[] {
  const pemainById = new Map(data.pemain.map((p) => [p.id, p]))
  return data.statistik
    .filter((b) => b.sesiId === sesiId)
    .flatMap((baris) => {
      const pemain = pemainById.get(baris.pemainId)
      if (!pemain) return []
      const poin = poinBaris(baris, data.poin)
      return [{ pemain, baris, poin, rating: ratingSesi(poin) }]
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
// tim: semua tim sesi itu, supaya tim yang belum main tetap tampil dengan nol saat sesi berlangsung.
// Diabaikan kalau belum ada laga sama sekali (sesi lama tanpa laga tidak punya klasemen).
export function standingSesi(laga: Laga[], tim: string[] = []): BarisStanding[] {
  const byTim = new Map<string, BarisStanding>()
  const baris = (nama: string) => {
    const kunci = kunciTim(nama)
    let t = byTim.get(kunci)
    if (!t) byTim.set(kunci, (t = { tim: nama, main: 0, menang: 0, seri: 0, kalah: 0, golMasuk: 0, kemasukan: 0, selisih: 0, poin: 0 }))
    return t
  }
  if (laga.length > 0) tim.forEach(baris)
  const catat = (nama: string, masuk: number, kemasukan: number) => {
    const t = baris(nama)
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

// Nama tim di line-up sesi, urut kemunculan.
export const timSesi = (data: LeagueData, sesiId: string): string[] =>
  lineupSesi(data, sesiId)
    .filter((g) => g.tim)
    .map((g) => g.tim)

// Sudah ada hasil tercatat: laga dengan skor, atau gol/assist/MOTM/hasil pemain.
export function sudahMain(data: LeagueData, sesiId: string): boolean {
  return (
    data.laga.some((l) => l.sesiId === sesiId) ||
    data.statistik.some((b) => b.sesiId === sesiId && (b.gol > 0 || b.assist > 0 || b.motm || b.menang + b.seri + b.kalah > 0))
  )
}

// Sesi yang tanggalnya hari ini atau nanti dan belum ada hasilnya, urut dari yang terdekat.
export function sesiAkanDatang(data: LeagueData, hariIni: string): Sesi[] {
  return data.sesi.filter((s) => s.tanggal >= hariIni && !sudahMain(data, s.id))
}

export interface TimLineup {
  tim: string // '' = belum dapat tim
  pemain: Pemain[]
}

// Pemain terdaftar di sebuah sesi per tim, urut sesuai tim pertama kali muncul; tanpa tim di akhir.
export function lineupSesi(data: LeagueData, sesiId: string): TimLineup[] {
  const pemainById = new Map(data.pemain.map((p) => [p.id, p]))
  const grup: TimLineup[] = []
  for (const b of data.statistik) {
    const p = b.sesiId === sesiId ? pemainById.get(b.pemainId) : undefined
    if (!p) continue
    let g = grup.find((x) => kunciTim(x.tim) === kunciTim(b.tim))
    if (!g) grup.push((g = { tim: b.tim, pemain: [] }))
    g.pemain.push(p)
  }
  for (const g of grup) g.pemain.sort((a, b) => a.nama.localeCompare(b.nama, 'id'))
  return [...grup.filter((g) => g.tim), ...grup.filter((g) => !g.tim)]
}

// Jadwal setengah kompetisi dengan metode lingkaran, per putaran, supaya tim tidak main beruntun bila bisa.
export function jadwalRoundRobin(tim: string[]): [string, string][] {
  const slot: (string | null)[] = tim.length % 2 ? [...tim, null] : [...tim]
  const n = slot.length
  const out: [string, string][] = []
  for (let putaran = 0; putaran < n - 1; putaran++) {
    for (let i = 0; i < n / 2; i++) {
      const a = slot[i]
      const b = slot[n - 1 - i]
      if (a !== null && b !== null) out.push([a, b])
    }
    // tim pertama tetap, sisanya berputar
    slot.splice(1, 0, slot.pop()!)
  }
  return out
}

// Jadwal laga sesi: yang disimpan admin di tab Laga, atau round-robin dari tim di line-up kalau belum ada.
// Urutan tim sama dengan di tab Hasil admin, jadi jadwal otomatis ini cocok dengan yang nanti dibuat admin.
// Sesi hari ini yang sebagian laganya sudah tersimpan dan sebagian belum: sedang berlangsung.
export function sesiLive(data: LeagueData, sesiId: string, hariIni: string): boolean {
  if (data.sesi.find((s) => s.id === sesiId)?.tanggal !== hariIni) return false
  const jadwal = data.jadwal.filter((l) => l.sesiId === sesiId)
  return jadwal.some((l) => l.skorA !== null) && jadwal.some((l) => l.skorA === null)
}

// Jam tiap laga, dibagi rata dari rentang jam di catatan sesi ("Jam 18.00 - 20.00" → 18.00–18.20, 18.20–18.40, …).
// null kalau catatan tidak memuat rentang jam.
export function jamLaga(catatan: string, jumlah: number): string[] | null {
  const m = catatan.match(/(\d{1,2})[.:](\d{2})\s*[-–]\s*(\d{1,2})[.:](\d{2})/)
  if (!m || jumlah === 0) return null
  const mulai = Number(m[1]) * 60 + Number(m[2])
  let selesai = Number(m[3]) * 60 + Number(m[4])
  if (selesai <= mulai) selesai += 24 * 60
  const durasi = Math.floor((selesai - mulai) / jumlah)
  const jam = (menit: number) => `${String(Math.floor(menit / 60) % 24).padStart(2, '0')}.${String(menit % 60).padStart(2, '0')}`
  return Array.from({ length: jumlah }, (_, i) => `${jam(mulai + durasi * i)}–${jam(mulai + durasi * (i + 1))}`)
}

export function jadwalSesi(data: LeagueData, sesiId: string): { laga: JadwalLaga[]; otomatis: boolean } {
  const tersimpan = data.jadwal.filter((l) => l.sesiId === sesiId)
  if (tersimpan.length > 0) return { laga: tersimpan, otomatis: false }
  return { laga: jadwalRoundRobin(timSesi(data, sesiId)).map(([timA, timB]) => ({ sesiId, timA, timB, skorA: null, skorB: null })), otomatis: true }
}

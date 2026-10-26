export type Posisi = 'GK' | 'DEF' | 'MID' | 'FWD'
export const POSISI: Posisi[] = ['GK', 'DEF', 'MID', 'FWD']

export type Hasil = 'M' | 'S' | 'K'

export type Row = Record<string, string | undefined>

export interface Pemain {
  id: string
  nama: string
  panggilan: string
  posisi: Posisi
  fotoUrl: string
  aktif: boolean
}

export interface Sesi {
  id: string
  tanggal: string // YYYY-MM-DD
  lokasi: string
  catatan: string
  pekan: number // urutan berdasarkan tanggal, mulai 1
}

export interface BarisStat {
  sesiId: string
  pemainId: string
  hasil: Hasil | null
  gol: number
  assist: number
  motm: boolean
}

export type Poin = Record<string, number>

export interface LeagueData {
  pemain: Pemain[]
  sesi: Sesi[]
  statistik: BarisStat[]
  poin: Poin
}

export interface RawTables {
  pemain: Row[]
  sesi: Row[]
  statistik: Row[]
  poin: Row[]
}

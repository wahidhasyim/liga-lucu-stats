// Cuma dibedakan kiper dan outfield; nilai lama (DEF/MID/FWD) dibaca sebagai outfield.
export type Posisi = 'GK' | 'OUT'
export const POSISI: Posisi[] = ['GK', 'OUT']

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
  tim: string
  // jumlah laga; dihitung dari tab Laga, atau dari kolom hasil (1 laga) bila sesi belum punya laga
  menang: number
  seri: number
  kalah: number
  gol: number
  assist: number
  motm: boolean
  // khusus kiper (posisi GK), 0 untuk outfield: gol lawan, laga tanpa kebobolan, laga kebobolan tepat 1
  kebobolan: number
  cleanSheet: number
  kebobolanSatu: number
}

export interface Laga {
  sesiId: string
  timA: string
  skorA: number
  skorB: number
  timB: string
}

// Satu baris tab Laga, termasuk yang belum dimainkan (skor null), dalam urutan di Sheet.
export interface JadwalLaga {
  sesiId: string
  timA: string
  timB: string
  skorA: number | null
  skorB: number | null
}

export type Poin = Record<string, number>

export interface LeagueData {
  pemain: Pemain[]
  sesi: Sesi[]
  statistik: BarisStat[]
  laga: Laga[] // hanya yang sudah dimainkan
  jadwal: JadwalLaga[]
  poin: Poin
}

export interface RawTables {
  pemain: Row[]
  sesi: Row[]
  statistik: Row[]
  laga: Row[]
  poin: Row[]
}

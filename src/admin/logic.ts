import { kunciTim } from '../data/parse'
import type { Posisi } from '../data/types'

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

export interface Kandidat {
  id: string
  posisi: Posisi
  kekuatan: number
}

// Kiper disebar dulu, lalu tiap pemain (terkuat dulu) masuk ke tim yang paling sedikit orangnya,
// lalu yang total kekuatannya paling kecil. Gangguan acak kecil membuat hasil tiap klik berbeda.
export function bagiSeimbang(pemain: Kandidat[], jumlahTim: number, acak: () => number = Math.random): string[][] {
  const tim = Array.from({ length: jumlahTim }, () => ({ ids: [] as string[], total: 0 }))
  const urut = (list: Kandidat[]) =>
    list
      .map((p) => ({ p, nilai: p.kekuatan + (acak() - 0.5) * 2 }))
      .sort((a, b) => b.nilai - a.nilai)
      .map((x) => x.p)
  const kiper = urut(pemain.filter((p) => p.posisi === 'GK'))
  const lain = urut(pemain.filter((p) => p.posisi !== 'GK'))
  for (const p of [...kiper, ...lain]) {
    const tujuan = tim.reduce((best, t) => (t.ids.length < best.ids.length || (t.ids.length === best.ids.length && t.total < best.total) ? t : best))
    tujuan.ids.push(p.id)
    tujuan.total += p.kekuatan
  }
  return tim.map((t) => t.ids)
}

export function median(nilai: number[]): number {
  if (nilai.length === 0) return 0
  const s = [...nilai].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

export interface LagaInput {
  timA: string
  skorA: string
  skorB: string
  timB: string
}

export interface SelisihGol {
  tim: string
  skor: number
  golPemain: number
}

// Tim yang total gol pemainnya berbeda dari total skornya di laga yang sudah dimainkan.
export function cekGolTim(tim: string[], laga: LagaInput[], golPemain: { tim: string; gol: number }[]): SelisihGol[] {
  return tim.flatMap((nama) => {
    const k = kunciTim(nama)
    const skor = laga
      .filter((l) => l.skorA !== '' && l.skorB !== '')
      .reduce((n, l) => n + (kunciTim(l.timA) === k ? Number(l.skorA) : 0) + (kunciTim(l.timB) === k ? Number(l.skorB) : 0), 0)
    const gol = golPemain.filter((p) => kunciTim(p.tim) === k).reduce((n, p) => n + p.gol, 0)
    return skor === gol ? [] : [{ tim: nama, skor, golPemain: gol }]
  })
}

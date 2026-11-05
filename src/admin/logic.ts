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

// Pemain yang request setim diperlakukan sebagai satu rombongan. Rombongan berisi kiper disebar dulu
// ke tim yang kipernya paling sedikit; sisanya (rombongan besar dan terkuat dulu) masuk ke tim yang
// paling sedikit orangnya, lalu yang total kekuatannya paling kecil. Gangguan acak kecil membuat hasil
// tiap klik berbeda.
export function bagiSeimbang(pemain: Kandidat[], jumlahTim: number, acak: () => number = Math.random, setim: string[][] = []): string[][] {
  const tim = Array.from({ length: jumlahTim }, () => ({ ids: [] as string[], total: 0, kiper: 0 }))
  const byId = new Map(pemain.map((p) => [p.id, p]))
  const masuk = new Set<string>()
  const rombongan: Kandidat[][] = []
  for (const g of setim) {
    const anggota = g.filter((id) => byId.has(id) && !masuk.has(id)).map((id) => byId.get(id)!)
    if (anggota.length < 2) continue
    anggota.forEach((p) => masuk.add(p.id))
    rombongan.push(anggota)
  }
  for (const p of pemain) if (!masuk.has(p.id)) rombongan.push([p])

  const info = rombongan.map((r) => ({
    ids: r.map((p) => p.id),
    kekuatan: r.reduce((n, p) => n + p.kekuatan, 0),
    kiper: r.filter((p) => p.posisi === 'GK').length,
    nilai: r.reduce((n, p) => n + p.kekuatan, 0) + (acak() - 0.5) * 2,
  }))
  const urut = info.sort((a, b) => b.kiper - a.kiper || b.ids.length - a.ids.length || b.nilai - a.nilai)
  for (const r of urut) {
    const tujuan = tim.reduce((best, t) => {
      if (r.kiper > 0 && t.kiper !== best.kiper) return t.kiper < best.kiper ? t : best
      if (t.ids.length !== best.ids.length) return t.ids.length < best.ids.length ? t : best
      return t.total < best.total ? t : best
    })
    tujuan.ids.push(...r.ids)
    tujuan.total += r.kekuatan
    tujuan.kiper += r.kiper
  }
  return tim.map((t) => t.ids)
}

export interface NamaTempel {
  nama: string
  kiper: boolean
}

// Daftar nama hasil paste (misalnya dari list WhatsApp): satu nama per baris. Nomor urut, bullet, dan emoji
// dibuang. Tanda "(GK)" atau "(kiper)" di belakang nama berarti kiper. Nama kembar diambil sekali.
export function bacaDaftarNama(teks: string): NamaTempel[] {
  const out: NamaTempel[] = []
  for (const baris of teks.split(/\r?\n/)) {
    let nama = baris
      .replace(/^\s*(\d+\s*[.)\-:]|[-•*·–>])\s*/u, '')
      .replace(/[^\p{L}\p{N}\s.'()-]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    const kiper = /\((gk|kiper|keeper)\)\s*$|\s(gk|kiper)$/i.test(nama)
    nama = nama.replace(/\s*\((gk|kiper|keeper)\)\s*$|\s(gk|kiper)$/i, '').replace(/[\s.()-]+$/, '').trim()
    if (!nama || out.some((x) => x.nama.toLowerCase() === nama.toLowerCase())) continue
    out.push({ nama, kiper })
  }
  return out
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

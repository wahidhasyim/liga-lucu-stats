import { describe, expect, it } from 'vitest'
import type { BarisStat, Hasil, LeagueData, Pemain, Sesi } from '../data/types'
import { barisSesi, compareDefault, computePlayerStats, isStatKey, poinBaris, riwayatPemain, ringkasan, sortBy, type PlayerStats } from './compute'

const pemain = (id: string, nama: string, aktif = true): Pemain => ({ id, nama, panggilan: nama, posisi: 'MID', fotoUrl: '', aktif })
const sesi = (id: string, tanggal: string, pekan: number): Sesi => ({ id, tanggal, lokasi: '', catatan: '', pekan })
const baris = (sesiId: string, pemainId: string, hasil: Hasil | null, gol = 0, assist = 0, motm = false): BarisStat => ({
  sesiId,
  pemainId,
  hasil,
  gol,
  assist,
  motm,
})

const POIN = { hadir: 1, gol: 3, assist: 2, motm: 5, menang: 2, seri: 1 }

const data: LeagueData = {
  pemain: [pemain('A', 'Andi'), pemain('B', 'Bayu'), pemain('C', 'Cahyo'), pemain('D', 'Dodi', false), pemain('E', 'Eko')],
  sesi: [sesi('S1', '2026-09-26', 1), sesi('S2', '2026-10-03', 2)],
  statistik: [
    baris('S1', 'A', 'M', 2, 0, true), // 1+6+5+2 = 14
    baris('S1', 'B', 'K', 0, 1), // 1+2 = 3
    baris('S1', 'D', 'K', 1), // 1+3 = 4
    baris('S2', 'A', 'S'), // 1+1 = 2
    baris('S2', 'B', 'S', 1, 1, true), // 1+3+2+5+1 = 12
    baris('S2', 'C', 'M', 1), // 1+3+2 = 6
  ],
  poin: POIN,
}

const TODAY = new Date(2026, 9, 26)

const mk = (nama: string, over: Partial<PlayerStats> = {}): PlayerStats => ({
  pemain: pemain(nama, nama),
  hadir: 1,
  gol: 0,
  assist: 0,
  motm: 0,
  menang: 0,
  seri: 0,
  kalah: 0,
  winRate: 0,
  rating: 10,
  poinPerSesi: 10,
  peringkat: null,
  ...over,
})

describe('poinBaris', () => {
  it('applies the poin table', () => {
    expect(poinBaris(baris('S1', 'A', 'M', 2, 0, true), POIN)).toBe(14)
  })
  it('treats missing actions as 0 and supports a kalah action', () => {
    expect(poinBaris(baris('S1', 'A', 'K', 3), {})).toBe(0)
    expect(poinBaris(baris('S1', 'A', 'K'), { kalah: -1 })).toBe(-1)
  })
})

describe('computePlayerStats', () => {
  const all = computePlayerStats(data, 'semua', TODAY)
  const byId = (id: string) => all.find((s) => s.pemain.id === id)!

  it('aggregates per player', () => {
    expect(byId('A')).toMatchObject({ hadir: 2, gol: 2, assist: 0, motm: 1, menang: 1, seri: 1, kalah: 0, rating: 16, winRate: 0.5, poinPerSesi: 8 })
  })

  it('returns every player sorted by rating', () => {
    expect(all.map((s) => s.pemain.id)).toEqual(['A', 'B', 'C', 'D', 'E'])
  })

  it('ranks only active players who played', () => {
    expect(all.map((s) => s.peringkat)).toEqual([1, 2, 3, null, null])
  })

  it('gives zero rates to players without sessions', () => {
    expect(byId('E')).toMatchObject({ hadir: 0, winRate: 0, poinPerSesi: 0, rating: 0 })
  })

  it('limits to the current month for bulan-ini', () => {
    const bulanIni = computePlayerStats(data, 'bulan-ini', TODAY)
    expect(bulanIni.filter((s) => s.peringkat !== null).map((s) => [s.pemain.id, s.rating])).toEqual([
      ['B', 12],
      ['C', 6],
      ['A', 2],
    ])
  })
})

describe('compareDefault / sortBy', () => {
  it('breaks rating ties by poinPerSesi, then gol, then nama', () => {
    expect([mk('X', { poinPerSesi: 5 }), mk('Y', { poinPerSesi: 6 })].sort(compareDefault).map((s) => s.pemain.nama)).toEqual(['Y', 'X'])
    expect([mk('X', { gol: 1 }), mk('Y', { gol: 2 })].sort(compareDefault).map((s) => s.pemain.nama)).toEqual(['Y', 'X'])
    expect([mk('Zul'), mk('Ari')].sort(compareDefault).map((s) => s.pemain.nama)).toEqual(['Ari', 'Zul'])
  })

  it('sorts by a stat key, falling back to default order', () => {
    const list = [mk('A', { gol: 1, rating: 5 }), mk('B', { gol: 3 }), mk('C', { gol: 1, rating: 9 })]
    expect(sortBy(list, 'gol').map((s) => s.pemain.nama)).toEqual(['B', 'C', 'A'])
  })

  it('validates stat keys', () => {
    expect(isStatKey('gol')).toBe(true)
    expect(isStatKey('nama')).toBe(false)
    expect(isStatKey(null)).toBe(false)
  })
})

describe('riwayatPemain', () => {
  it('lists sessions in pekan order with poin', () => {
    expect(riwayatPemain(data, 'A').map((r) => [r.sesi.pekan, r.poin, r.hasil])).toEqual([
      [1, 14, 'M'],
      [2, 2, 'S'],
    ])
  })
})

describe('barisSesi', () => {
  it('lists players of a session by poin', () => {
    expect(barisSesi(data, 'S2').map((b) => [b.pemain.id, b.poin])).toEqual([
      ['B', 12],
      ['C', 6],
      ['A', 2],
    ])
  })
})

describe('ringkasan', () => {
  it('summarizes the community', () => {
    expect(ringkasan(data)).toEqual({ totalSesi: 2, totalGol: 5, pemainAktif: 4 })
  })
})

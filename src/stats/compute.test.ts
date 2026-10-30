import { describe, expect, it } from 'vitest'
import type { BarisStat, Hasil, Laga, LeagueData, Pemain, Sesi } from '../data/types'
import { barisSesi, compareDefault, computePlayerStats, isStatKey, lineupSesi, poinBaris, riwayatPemain, ringkasan, sesiAkanDatang, sortBy, standingSesi, sudahMain, type PlayerStats } from './compute'

const pemain = (id: string, nama: string, aktif = true): Pemain => ({ id, nama, panggilan: nama, posisi: 'MID', fotoUrl: '', aktif })
const sesi = (id: string, tanggal: string, pekan: number): Sesi => ({ id, tanggal, lokasi: '', catatan: '', pekan })
const baris = (sesiId: string, pemainId: string, hasil: Hasil | null, gol = 0, assist = 0, motm = false): BarisStat => ({
  sesiId,
  pemainId,
  tim: '',
  menang: hasil === 'M' ? 1 : 0,
  seri: hasil === 'S' ? 1 : 0,
  kalah: hasil === 'K' ? 1 : 0,
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
  laga: [],
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
  it('counts menang/seri/kalah per laga', () => {
    expect(poinBaris({ ...baris('S1', 'A', null), menang: 2, seri: 1, kalah: 1 }, { menang: 1, seri: 0.5, kalah: -1 })).toBe(1.5)
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

  it('computes win rate per laga', () => {
    const perLaga = computePlayerStats({ ...data, statistik: [{ ...baris('S1', 'A', null), menang: 2, seri: 1, kalah: 1 }] }, 'semua', TODAY)
    expect(perLaga.find((s) => s.pemain.id === 'A')).toMatchObject({ hadir: 1, menang: 2, seri: 1, kalah: 1, winRate: 0.5 })
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
    expect(riwayatPemain(data, 'A').map((r) => [r.sesi.pekan, r.poin, `${r.menang}-${r.seri}-${r.kalah}`])).toEqual([
      [1, 14, '1-0-0'],
      [2, 2, '0-1-0'],
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

describe('standingSesi', () => {
  const laga = (timA: string, skorA: number, skorB: number, timB: string): Laga => ({ sesiId: 'S1', timA, skorA, skorB, timB })

  it('builds the table with 3-1-0 points', () => {
    const tabel = standingSesi([laga('Merah', 2, 1, 'Biru'), laga('Kuning', 0, 0, 'Hijau'), laga('Merah', 1, 1, 'Kuning'), laga('Biru', 3, 0, 'Hijau')])
    expect(tabel[0]).toEqual({ tim: 'Merah', main: 2, menang: 1, seri: 1, kalah: 0, golMasuk: 3, kemasukan: 2, selisih: 1, poin: 4 })
    expect(tabel.map((t) => [t.tim, t.poin])).toEqual([
      ['Merah', 4],
      ['Biru', 3],
      ['Kuning', 2],
      ['Hijau', 1],
    ])
  })

  it('merges team names case-insensitively, keeping the first spelling', () => {
    const tabel = standingSesi([laga('Tim Budi', 1, 0, 'Galacticos'), laga('tim budi', 2, 2, 'GALACTICOS')])
    expect(tabel.map((t) => [t.tim, t.main, t.poin])).toEqual([
      ['Tim Budi', 2, 4],
      ['Galacticos', 2, 1],
    ])
  })

  it('breaks ties by selisih, then gol masuk, then nama', () => {
    // semua 3 poin. B & A selisih +3 (B lebih banyak gol); X, C, D selisih +1 (X 10 gol); C & D sama persis → abjad
    const tabel = standingSesi([laga('A', 3, 0, 'X'), laga('B', 4, 1, 'X'), laga('D', 1, 0, 'X'), laga('C', 1, 0, 'X'), laga('X', 9, 0, 'Y')])
    expect(tabel.filter((t) => t.poin === 3).map((t) => t.tim)).toEqual(['B', 'A', 'X', 'C', 'D'])
  })

  it('is empty without laga', () => {
    expect(standingSesi([])).toEqual([])
  })
})

describe('sesi akan datang & line-up', () => {
  const lineup = (sesiId: string, pemainId: string, tim: string): BarisStat => ({ ...baris(sesiId, pemainId, null), tim })
  const dataLineup: LeagueData = {
    ...data,
    sesi: [...data.sesi, sesi('S3', '2026-10-31', 3), sesi('S4', '2026-11-07', 4)],
    statistik: [...data.statistik, lineup('S3', 'C', 'Tim Biru'), lineup('S3', 'A', 'Tim Merah'), lineup('S3', 'B', 'tim biru'), lineup('S3', 'E', ''), lineup('S4', 'A', 'X')],
  }

  it('treats sessions with any recorded result as played', () => {
    expect(sudahMain(dataLineup, 'S1')).toBe(true)
    expect(sudahMain(dataLineup, 'S3')).toBe(false)
    expect(sudahMain({ ...dataLineup, laga: [{ sesiId: 'S3', timA: 'Tim Biru', skorA: 0, skorB: 0, timB: 'Tim Merah' }] }, 'S3')).toBe(true)
  })

  it('lists unplayed sessions from today onwards, nearest first', () => {
    expect(sesiAkanDatang(dataLineup, '2026-10-31').map((s) => s.id)).toEqual(['S3', 'S4'])
    expect(sesiAkanDatang(dataLineup, '2026-11-01').map((s) => s.id)).toEqual(['S4'])
  })

  it('groups the lineup by team in order of appearance, players by name, no-team last', () => {
    expect(lineupSesi(dataLineup, 'S3').map((g) => [g.tim, g.pemain.map((p) => p.id)])).toEqual([
      ['Tim Biru', ['B', 'C']],
      ['Tim Merah', ['A']],
      ['', ['E']],
    ])
  })
})

import { describe, expect, it } from 'vitest'
import type { BarisStat, Hasil, Laga, LeagueData, Pemain, Sesi } from '../data/types'
import { barisSesi, compareDefault, computePlayerStats, isStatKey, jadwalRoundRobin, jamLaga, sesiLive, jadwalSesi, lineupSesi, peringkatKiper, poinBaris, ratingSesi, riwayatPemain, ringkasan, sesiAkanDatang, sortBy, standingSesi, sudahMain, type PlayerStats } from './compute'

const pemain = (id: string, nama: string, aktif = true): Pemain => ({ id, nama, panggilan: nama, posisi: 'OUT', fotoUrl: '', aktif })
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
  kebobolan: 0,
  cleanSheet: 0,
  kebobolanSatu: 0,
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
  jadwal: [],
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
  rating: 6,
  poin: 10,
  peringkat: null,
  kebobolan: 0,
  cleanSheet: 0,
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
  it('adds keeper bonuses for clean sheets and one-goal games', () => {
    expect(poinBaris({ ...baris('S1', 'A', null), cleanSheet: 2, kebobolanSatu: 1 }, { clean_sheet: 3, kebobolan_1: 1 })).toBe(7)
  })
})

describe('peringkatKiper', () => {
  const gk = (nama: string, over: Partial<PlayerStats>) => {
    const s = mk(nama, over)
    return { ...s, pemain: { ...s.pemain, posisi: 'GK' as const } }
  }
  it('ranks active keepers by goals conceded per laga, then clean sheets, then laga', () => {
    const list = [
      gk('A', { menang: 2, kebobolan: 4 }), // 2 per laga
      gk('B', { menang: 3, kebobolan: 3, cleanSheet: 1 }), // 1 per laga
      gk('C', { menang: 1, kebobolan: 1, cleanSheet: 0 }), // 1 per laga, tanpa clean sheet
      gk('D', { kebobolan: 0 }), // belum main laga
      mk('E', { menang: 3 }), // outfield
    ]
    expect(peringkatKiper(list).map((s) => s.pemain.nama)).toEqual(['B', 'C', 'A'])
  })
})

describe('computePlayerStats', () => {
  const all = computePlayerStats(data, 'semua', TODAY)
  const byId = (id: string) => all.find((s) => s.pemain.id === id)!

  it('aggregates per player', () => {
    expect(byId('A')).toMatchObject({ hadir: 2, gol: 2, assist: 0, motm: 1, menang: 1, seri: 1, kalah: 0, poin: 16, winRate: 0.5 })
    // rating sesi 8,3 dan 5,9
    expect(byId('A').rating).toBeCloseTo(7.1)
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
    expect(byId('E')).toMatchObject({ hadir: 0, winRate: 0, poin: 0, rating: 0 })
  })

  it('limits to the current month for bulan-ini', () => {
    const bulanIni = computePlayerStats(data, 'bulan-ini', TODAY)
    expect(bulanIni.filter((s) => s.peringkat !== null).map((s) => [s.pemain.id, s.rating])).toEqual([
      ['B', 7.9],
      ['C', 6.7],
      ['A', 5.9],
    ])
  })
})

describe('ratingSesi', () => {
  it('maps a normal session (2,5 poin) to 6,0 and adds 0,2 per poin', () => {
    expect(ratingSesi(2.5)).toBe(6)
    expect(ratingSesi(5.5)).toBe(6.6)
    expect(ratingSesi(10.5)).toBe(7.6)
    expect(ratingSesi(21.5)).toBe(9.8)
  })
  it('clamps to 3,0–10,0', () => {
    expect(ratingSesi(40)).toBe(10)
    expect(ratingSesi(-20)).toBe(3)
  })
})

describe('compareDefault / sortBy', () => {
  it('breaks rating ties by total poin, then gol, then nama', () => {
    expect([mk('X', { poin: 5 }), mk('Y', { poin: 6 })].sort(compareDefault).map((s) => s.pemain.nama)).toEqual(['Y', 'X'])
    expect([mk('X', { gol: 1 }), mk('Y', { gol: 2 })].sort(compareDefault).map((s) => s.pemain.nama)).toEqual(['Y', 'X'])
    expect([mk('Zul'), mk('Ari')].sort(compareDefault).map((s) => s.pemain.nama)).toEqual(['Ari', 'Zul'])
  })

  it('sorts by a stat key, falling back to default order', () => {
    const list = [mk('A', { gol: 1, rating: 5 }), mk('B', { gol: 3 }), mk('C', { gol: 1, rating: 9 })]
    expect(sortBy(list, 'gol').map((s) => s.pemain.nama)).toEqual(['B', 'C', 'A'])
  })

  it('breaks gol ties by assist and assist ties by gol before rating', () => {
    const list = [mk('A', { gol: 2, assist: 1, rating: 9 }), mk('B', { gol: 2, assist: 3, rating: 1 }), mk('C', { gol: 4, assist: 1, rating: 1 })]
    expect(sortBy(list, 'gol').map((s) => s.pemain.nama)).toEqual(['C', 'B', 'A'])
    const list2 = [mk('A', { assist: 2, gol: 0, rating: 9 }), mk('B', { assist: 2, gol: 1, rating: 1 })]
    expect(sortBy(list2, 'assist').map((s) => s.pemain.nama)).toEqual(['B', 'A'])
  })

  it('validates stat keys', () => {
    expect(isStatKey('gol')).toBe(true)
    expect(isStatKey('nama')).toBe(false)
    expect(isStatKey(null)).toBe(false)
  })
})

describe('riwayatPemain', () => {
  it('lists sessions in pekan order with poin', () => {
    expect(riwayatPemain(data, 'A').map((r) => [r.sesi.pekan, r.poin, r.rating, `${r.menang}-${r.seri}-${r.kalah}`])).toEqual([
      [1, 14, 8.3, '1-0-0'],
      [2, 2, 5.9, '0-1-0'],
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
    // tim yang belum main ikut tampil dengan nol, tapi hanya kalau sudah ada laga
    expect(standingSesi([], ['Merah'])).toEqual([])
    expect(standingSesi([laga('Merah', 1, 0, 'Biru')], ['Merah', 'Biru', 'Hitam']).map((t) => [t.tim, t.main, t.poin])).toEqual([
      ['Merah', 1, 3],
      ['Hitam', 0, 0],
      ['Biru', 1, 0],
    ])
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

describe('jadwalRoundRobin', () => {
  it('pairs every team exactly once', () => {
    const jadwal = jadwalRoundRobin(['A', 'B', 'C', 'D'])
    expect(jadwal).toHaveLength(6)
    const pasangan = jadwal.map((p) => [...p].sort().join('-')).sort()
    expect(pasangan).toEqual(['A-B', 'A-C', 'A-D', 'B-C', 'B-D', 'C-D'])
  })

  it('plays round by round so no team plays twice in a row within a round', () => {
    const jadwal = jadwalRoundRobin(['A', 'B', 'C', 'D'])
    for (let i = 0; i < 6; i += 2) expect(new Set([...jadwal[i], ...jadwal[i + 1]]).size).toBe(4)
  })

  it('handles odd and tiny team counts', () => {
    expect(jadwalRoundRobin(['A', 'B', 'C'])).toHaveLength(3)
    expect(jadwalRoundRobin(['A', 'B'])).toEqual([['A', 'B']])
    expect(jadwalRoundRobin(['A'])).toEqual([])
  })
})

describe('sesiLive', () => {
  const laga = (skorA: number | null) => ({ sesiId: 'S3', timA: 'A', timB: 'B', skorA, skorB: skorA })
  const dengan = (jadwal: ReturnType<typeof laga>[]): LeagueData => ({ ...data, sesi: [...data.sesi, sesi('S3', '2026-11-08', 3)], jadwal })

  it('is live on the session day while some matches are saved and some are not', () => {
    expect(sesiLive(dengan([laga(2), laga(null)]), 'S3', '2026-11-08')).toBe(true)
  })
  it('is not live before the first result, after the last one, or on another day', () => {
    expect(sesiLive(dengan([laga(null), laga(null)]), 'S3', '2026-11-08')).toBe(false)
    expect(sesiLive(dengan([laga(2), laga(1)]), 'S3', '2026-11-08')).toBe(false)
    expect(sesiLive(dengan([laga(2), laga(null)]), 'S3', '2026-11-09')).toBe(false)
  })
})

describe('jamLaga', () => {
  it('splits the session time range evenly across matches', () => {
    expect(jamLaga('Jam 18.00 - 20.00', 6)).toEqual(['18.00–18.20', '18.20–18.40', '18.40–19.00', '19.00–19.20', '19.20–19.40', '19.40–20.00'])
    expect(jamLaga('main 19:30–21:00, bawa rompi', 3)).toEqual(['19.30–20.00', '20.00–20.30', '20.30–21.00'])
    expect(jamLaga('23.00 - 01.00', 2)).toEqual(['23.00–00.00', '00.00–01.00'])
  })
  it('returns null without a time range', () => {
    expect(jamLaga('Hujan deras', 4)).toBeNull()
    expect(jamLaga('Jam 18.00', 4)).toBeNull()
    expect(jamLaga('Jam 18.00 - 20.00', 0)).toBeNull()
  })
})

describe('jadwalSesi', () => {
  const lineup = (pemainId: string, tim: string): BarisStat => ({ ...baris('S3', pemainId, null), tim })
  const dasar: LeagueData = { ...data, sesi: [...data.sesi, sesi('S3', '2026-11-08', 3)], statistik: [lineup('A', 'Merah'), lineup('B', 'Biru'), lineup('C', 'Putih')] }

  it('builds a round robin from the lineup teams when nothing is saved', () => {
    const { laga, otomatis } = jadwalSesi(dasar, 'S3')
    expect(otomatis).toBe(true)
    expect(laga.map((l) => `${l.timA}-${l.timB}`)).toEqual(jadwalRoundRobin(['Merah', 'Biru', 'Putih']).map(([a, b]) => `${a}-${b}`))
    expect(laga.every((l) => l.skorA === null)).toBe(true)
  })

  it('uses the saved schedule, played or not, in sheet order', () => {
    const jadwal = [
      { sesiId: 'S3', timA: 'Biru', timB: 'Putih', skorA: 2, skorB: 1 },
      { sesiId: 'S3', timA: 'Merah', timB: 'Biru', skorA: null, skorB: null },
    ]
    expect(jadwalSesi({ ...dasar, jadwal }, 'S3')).toEqual({ laga: jadwal, otomatis: false })
  })
})

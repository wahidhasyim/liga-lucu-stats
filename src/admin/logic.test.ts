import { describe, expect, it } from 'vitest'
import { bagiSeimbang, cekGolTim, jadwalRoundRobin, median, type Kandidat } from './logic'

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

describe('bagiSeimbang', () => {
  const p = (id: string, kekuatan: number, posisi: Kandidat['posisi'] = 'MID'): Kandidat => ({ id, posisi, kekuatan })
  const tanpaAcak = () => 0.5

  it('balances team sizes and strength', () => {
    const tim = bagiSeimbang([p('a', 10), p('b', 9), p('c', 8), p('d', 7), p('e', 6), p('f', 5), p('g', 4), p('h', 3)], 4, tanpaAcak)
    expect(tim.map((t) => t.length)).toEqual([2, 2, 2, 2])
    // terkuat dipasangkan dengan terlemah
    expect(tim).toEqual([
      ['a', 'h'],
      ['b', 'g'],
      ['c', 'f'],
      ['d', 'e'],
    ])
  })

  it('spreads goalkeepers before anyone else', () => {
    const tim = bagiSeimbang([p('x', 10), p('y', 9), p('k1', 1, 'GK'), p('k2', 2, 'GK')], 2, tanpaAcak)
    expect(tim.map((t) => t.filter((id) => id.startsWith('k')).length)).toEqual([1, 1])
  })

  it('assigns every player exactly once', () => {
    const semua = Array.from({ length: 13 }, (_, i) => p(`p${i}`, i % 5))
    const tim = bagiSeimbang(semua, 4)
    expect(tim.flat().sort()).toEqual(semua.map((x) => x.id).sort())
    expect(Math.max(...tim.map((t) => t.length)) - Math.min(...tim.map((t) => t.length))).toBeLessThanOrEqual(1)
  })
})

describe('median', () => {
  it('works for odd, even and empty lists', () => {
    expect(median([3, 1, 2])).toBe(2)
    expect(median([4, 1, 2, 3])).toBe(2.5)
    expect(median([])).toBe(0)
  })
})

describe('cekGolTim', () => {
  it('flags teams whose player goals differ from their scores, ignoring unplayed laga', () => {
    const laga = [
      { timA: 'Tim Budi', skorA: '2', skorB: '1', timB: 'Galacticos' },
      { timA: 'galacticos', skorA: '1', skorB: '1', timB: 'Los Lucu' },
      { timA: 'Tim Budi', skorA: '', skorB: '', timB: 'Los Lucu' },
    ]
    const gol = [
      { tim: 'Tim Budi', gol: 2 },
      { tim: 'Galacticos', gol: 1 },
      { tim: 'Los Lucu', gol: 0 },
    ]
    expect(cekGolTim(['Tim Budi', 'Galacticos', 'Los Lucu'], laga, gol)).toEqual([
      { tim: 'Galacticos', skor: 2, golPemain: 1 },
      { tim: 'Los Lucu', skor: 1, golPemain: 0 },
    ])
  })
})

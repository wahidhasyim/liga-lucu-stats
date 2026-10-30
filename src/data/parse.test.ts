import { afterEach, describe, expect, it, vi } from 'vitest'
import { kunciTim, parseLeague, toCount, toIsoDate } from './parse'
import type { RawTables } from './types'

const raw = (over: Partial<RawTables> = {}): RawTables => ({
  pemain: [
    { id: 'P01', nama: 'Budi Santoso', panggilan: 'Budi', posisi: 'fwd', foto_url: '', aktif: 'TRUE' },
    { id: 'P02', nama: 'Raka Pratama', panggilan: '', posisi: 'XX', foto_url: '', aktif: 'FALSE' },
    { id: '', nama: 'Tanpa ID', panggilan: '', posisi: 'GK', foto_url: '', aktif: '' },
  ],
  sesi: [
    { sesi_id: 'S002', tanggal: '2026-10-10', lokasi: 'A', catatan: '' },
    { sesi_id: 'S001', tanggal: '03/10/2026', lokasi: 'A', catatan: 'hujan' },
  ],
  statistik: [{ sesi_id: 'S001', pemain_id: 'P01', hasil: 'm', gol: '2', assist: '', motm: '1' }],
  laga: [],
  poin: [
    { aksi: 'Gol', poin: '3' },
    { aksi: 'motm', poin: '2,5' },
    { aksi: 'aneh', poin: 'x' },
  ],
  ...over,
})

afterEach(() => vi.restoreAllMocks())

describe('toCount', () => {
  it('parses non-negative integers, otherwise 0', () => {
    expect(toCount('3')).toBe(3)
    expect(toCount(' 2 ')).toBe(2)
    expect(toCount('')).toBe(0)
    expect(toCount(undefined)).toBe(0)
    expect(toCount('abc')).toBe(0)
    expect(toCount('-2')).toBe(0)
  })
})

describe('toIsoDate', () => {
  it('accepts YYYY-MM-DD and DD/MM/YYYY', () => {
    expect(toIsoDate('2026-10-24')).toBe('2026-10-24')
    expect(toIsoDate('24/10/2026')).toBe('2026-10-24')
    expect(toIsoDate('4/9/2026')).toBe('2026-09-04')
  })
  it('rejects anything else', () => {
    expect(toIsoDate('besok')).toBeNull()
    expect(toIsoDate('')).toBeNull()
    expect(toIsoDate('2026-13-01')).toBeNull()
  })
})

describe('parseLeague', () => {
  it('normalizes pemain and skips rows without id', () => {
    const { pemain } = parseLeague(raw())
    expect(pemain).toHaveLength(2)
    expect(pemain[0]).toEqual({ id: 'P01', nama: 'Budi Santoso', panggilan: 'Budi', posisi: 'FWD', fotoUrl: '', aktif: true })
    expect(pemain[1]).toMatchObject({ panggilan: 'Raka', posisi: 'MID', aktif: false })
  })

  it('sorts sesi by tanggal and numbers pekan', () => {
    const { sesi } = parseLeague(raw())
    expect(sesi.map((s) => [s.id, s.tanggal, s.pekan])).toEqual([
      ['S001', '2026-10-03', 1],
      ['S002', '2026-10-10', 2],
    ])
  })

  it('skips sesi with invalid tanggal', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { sesi } = parseLeague(raw({ sesi: [{ sesi_id: 'S9', tanggal: 'kemarin' }] }))
    expect(sesi).toEqual([])
  })

  it('parses statistik rows', () => {
    const { statistik } = parseLeague(raw())
    expect(statistik).toEqual([{ sesiId: 'S001', pemainId: 'P01', tim: '', menang: 1, seri: 0, kalah: 0, gol: 2, assist: 0, motm: true }])
  })

  it('skips statistik rows with unknown ids and warns', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { statistik } = parseLeague(
      raw({
        statistik: [
          { sesi_id: 'S001', pemain_id: 'P99', hasil: 'M' },
          { sesi_id: 'S404', pemain_id: 'P01', hasil: 'M' },
        ],
      }),
    )
    expect(statistik).toEqual([])
    expect(warn).toHaveBeenCalledTimes(2)
  })

  it('keeps rows with invalid hasil as hasil null', () => {
    const { statistik } = parseLeague(raw({ statistik: [{ sesi_id: 'S001', pemain_id: 'P01', hasil: 'menang' }] }))
    expect(statistik[0]).toMatchObject({ menang: 0, seri: 0, kalah: 0, gol: 0, assist: 0, motm: false })
  })

  it('parses poin case-insensitively with comma decimals, dropping invalid numbers', () => {
    expect(parseLeague(raw()).poin).toEqual({ gol: 3, motm: 2.5 })
  })

  it('parses laga, skipping unplayed, unknown-sesi and nameless rows', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { laga } = parseLeague(
      raw({
        laga: [
          { sesi_id: 'S001', tim_a: ' Tim  Budi ', skor_a: '2', skor_b: '1', tim_b: 'Galacticos' },
          { sesi_id: 'S001', tim_a: 'Tim Budi', skor_a: '', skor_b: '', tim_b: 'Los Lucu' },
          { sesi_id: 'S404', tim_a: 'A', skor_a: '1', skor_b: '0', tim_b: 'B' },
          { sesi_id: 'S001', tim_a: '', skor_a: '1', skor_b: '0', tim_b: 'B' },
          { sesi_id: 'S001', tim_a: 'A', skor_a: 'dua', skor_b: '0', tim_b: 'B' },
        ],
      }),
    )
    expect(laga).toEqual([{ sesiId: 'S001', timA: 'Tim Budi', skorA: 2, skorB: 1, timB: 'Galacticos' }])
    expect(warn).toHaveBeenCalledTimes(3)
  })

  it('derives menang/seri/kalah per laga from the player team, ignoring hasil', () => {
    const { statistik } = parseLeague(
      raw({
        statistik: [
          { sesi_id: 'S001', pemain_id: 'P01', tim: 'tim budi', hasil: 'K' },
          { sesi_id: 'S001', pemain_id: 'P02', tim: '', hasil: 'M' },
          { sesi_id: 'S002', pemain_id: 'P01', tim: 'Tim Budi', hasil: 'S' },
        ],
        laga: [
          { sesi_id: 'S001', tim_a: 'Tim Budi', skor_a: '2', skor_b: '1', tim_b: 'Galacticos' },
          { sesi_id: 'S001', tim_a: 'Los Lucu', skor_a: '1', skor_b: '1', tim_b: 'Tim Budi' },
          { sesi_id: 'S001', tim_a: 'Galacticos', skor_a: '3', skor_b: '0', tim_b: 'Los Lucu' },
        ],
      }),
    )
    expect(statistik.map((b) => [b.pemainId, b.sesiId, b.tim, b.menang, b.seri, b.kalah])).toEqual([
      ['P01', 'S001', 'tim budi', 1, 1, 0],
      ['P02', 'S001', '', 0, 0, 0],
      // S002 tanpa laga: kolom hasil tetap dipakai
      ['P01', 'S002', 'Tim Budi', 0, 1, 0],
    ])
  })
})

describe('kunciTim', () => {
  it('ignores case and extra spaces', () => {
    expect(kunciTim('  Tim   Budi ')).toBe('tim budi')
  })
})

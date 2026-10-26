import { afterEach, describe, expect, it, vi } from 'vitest'
import { parseLeague, toCount, toIsoDate } from './parse'
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
    expect(statistik).toEqual([{ sesiId: 'S001', pemainId: 'P01', hasil: 'M', gol: 2, assist: 0, motm: true }])
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
    expect(statistik[0]).toMatchObject({ hasil: null, gol: 0, assist: 0, motm: false })
  })

  it('parses poin case-insensitively with comma decimals, dropping invalid numbers', () => {
    expect(parseLeague(raw()).poin).toEqual({ gol: 3, motm: 2.5 })
  })
})

import { describe, expect, it } from 'vitest'
import { parseCsv } from '../data/sheets'
import { formatAngka, formatDesimal, formatPersen, formatTanggal, formatTanggalPendek, inisial } from './format'

describe('format', () => {
  it('formats dates in Indonesian', () => {
    expect(formatTanggal('2026-10-24')).toBe('Sabtu, 24 Okt 2026')
    expect(formatTanggalPendek('2026-10-24')).toBe('24 Okt 2026')
  })
  it('formats numbers', () => {
    expect(formatAngka(12)).toBe('12')
    expect(formatAngka(2.5)).toBe('2,5')
    expect(formatDesimal(8)).toBe('8,0')
    expect(formatPersen(0.666)).toBe('67%')
  })
  it('builds initials', () => {
    expect(inisial('Budi Santoso')).toBe('BS')
    expect(inisial('Raka')).toBe('R')
    expect(inisial('Muhammad Rizky Hidayat')).toBe('MR')
  })
})

describe('parseCsv', () => {
  it('lowercases and trims headers and skips blank lines', () => {
    expect(parseCsv('ID , Nama\nP01,Budi\n\n,\n')).toEqual([{ id: 'P01', nama: 'Budi' }])
  })
})

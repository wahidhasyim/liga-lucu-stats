import { describe, expect, it } from 'vitest'
import type { RawTables, Row } from '../data/types'
import { jalankanAksi, type Aksi, type InputAksi } from './aksi'

const awal = (over: Partial<RawTables> = {}): RawTables => ({
  pemain: [
    { id: 'P01', nama: 'Budi Santoso', panggilan: 'Budi', posisi: 'OUT', foto_url: '', aktif: 'TRUE' },
    { id: 'P02', nama: 'Raka Pratama', panggilan: 'Raka', posisi: 'GK', foto_url: '', aktif: 'TRUE' },
    { id: 'P09', nama: 'Taufik Hamdani', panggilan: 'Taufik', posisi: 'GK', foto_url: '', aktif: 'FALSE' },
  ],
  sesi: [{ sesi_id: 'S001', tanggal: '2026-10-24', lokasi: 'Margonda', catatan: '' }],
  statistik: [{ sesi_id: 'S001', pemain_id: 'P01', tim: '', hasil: 'M', gol: '2', assist: '0', motm: '1' }],
  laga: [],
  poin: [{ aksi: 'gol', poin: '3' }],
  ...over,
})

// Menjalankan beberapa aksi berurutan di atas tabel yang sama, seperti admin menyimpan berkali-kali.
function siapkan(over?: Partial<RawTables>) {
  let t = awal(over)
  const kirim = <A extends Aksi>(aksi: A, data: InputAksi[A]) => {
    const k = jalankanAksi(t, aksi, data)
    t = k.tabel
    return k
  }
  const gagal = <A extends Aksi>(aksi: A, data: InputAksi[A]) => {
    const sebelum = t
    try {
      kirim(aksi, data)
    } catch (e) {
      expect(t).toBe(sebelum)
      return (e as Error).message
    }
    throw new Error('seharusnya gagal')
  }
  return { kirim, gagal, tabel: () => t }
}

describe('simpanPemain', () => {
  it('adds a player with the next id', () => {
    const { kirim } = siapkan()
    const res = kirim('simpanPemain', { nama: '  Kevin   Ardiansyah ', panggilan: 'Kevin', posisi: 'kiper', fotoUrl: '', aktif: true })
    expect(res.hasil).toEqual({ id: 'P10' })
    expect(res.berubah).toEqual(['pemain'])
    expect(res.tabel.pemain.at(-1)).toEqual({ id: 'P10', nama: 'Kevin Ardiansyah', panggilan: 'Kevin', posisi: 'GK', foto_url: '', aktif: 'TRUE' })
  })

  it('edits an existing player and falls back to outfield', () => {
    const { kirim } = siapkan()
    const res = kirim('simpanPemain', { id: 'P02', nama: 'Raka P.', panggilan: '', posisi: 'striker', fotoUrl: 'https://x/y.jpg', aktif: false })
    expect(res.tabel.pemain[1]).toEqual({ id: 'P02', nama: 'Raka P.', panggilan: '', posisi: 'OUT', foto_url: 'https://x/y.jpg', aktif: 'FALSE' })
    expect(res.tabel.pemain).toHaveLength(3)
  })

  it('requires a name and a known id', () => {
    const { gagal } = siapkan()
    expect(gagal('simpanPemain', { nama: ' ' })).toMatch(/Nama/)
    expect(gagal('simpanPemain', { id: 'P77', nama: 'X' })).toMatch(/P77/)
  })
})

describe('simpanSesi', () => {
  const lineup = [
    { pemainId: 'P01', tim: 'Tim Budi' },
    { pemainId: 'P02', tim: 'Galacticos' },
  ]

  it('creates a session with a lineup', () => {
    const { kirim } = siapkan()
    const res = kirim('simpanSesi', { tanggal: '2026-10-31', lokasi: 'Margonda', catatan: '', lineup })
    expect(res.hasil).toEqual({ id: 'S002', pemainBaru: [] })
    expect(res.berubah).toEqual(['sesi', 'statistik', 'laga'])
    expect(res.tabel.sesi[1]).toEqual({ sesi_id: 'S002', tanggal: '2026-10-31', lokasi: 'Margonda', catatan: '' })
    expect(res.tabel.statistik.filter((r) => r.sesi_id === 'S002')).toEqual([
      { sesi_id: 'S002', pemain_id: 'P01', hasil: '', gol: '0', assist: '0', motm: '0', tim: 'Tim Budi' },
      { sesi_id: 'S002', pemain_id: 'P02', hasil: '', gol: '0', assist: '0', motm: '0', tim: 'Galacticos' },
    ])
  })

  it('keeps goals of players who stay and drops laga of removed teams', () => {
    const { kirim } = siapkan({
      laga: [
        { sesi_id: 'S001', tim_a: 'Tim Budi', skor_a: '2', skor_b: '1', tim_b: 'Galacticos' },
        { sesi_id: 'S001', tim_a: 'Tim Budi', skor_a: '1', skor_b: '0', tim_b: 'Los Lucu' },
      ],
    })
    const res = kirim('simpanSesi', { id: 'S001', tanggal: '2026-10-24', lokasi: 'Cibinong', catatan: 'hujan', lineup })
    expect(res.tabel.sesi).toEqual([{ sesi_id: 'S001', tanggal: '2026-10-24', lokasi: 'Cibinong', catatan: 'hujan' }])
    expect(res.tabel.statistik.find((r) => r.pemain_id === 'P01')).toMatchObject({ gol: '2', motm: '1', hasil: 'M', tim: 'Tim Budi' })
    expect(res.tabel.laga).toEqual([{ sesi_id: 'S001', tim_a: 'Tim Budi', skor_a: '2', skor_b: '1', tim_b: 'Galacticos' }])
  })

  it('registers new players from the lineup in the same save', () => {
    const { kirim } = siapkan()
    const res = kirim('simpanSesi', {
      tanggal: '2026-10-31',
      lineup: [
        { pemainId: 'P01', tim: 'Tim A' },
        { baru: { nama: ' Kevin  Ardiansyah ', posisi: 'gk' }, tim: 'Tim B' },
        { baru: { nama: 'Johan', posisi: '' }, tim: 'Tim B' },
      ],
    })
    expect(res.hasil).toEqual({ id: 'S002', pemainBaru: ['P10', 'P11'] })
    expect(res.berubah).toContain('pemain')
    expect(res.tabel.pemain.slice(-2)).toEqual([
      { id: 'P10', nama: 'Kevin Ardiansyah', panggilan: '', posisi: 'GK', foto_url: '', aktif: 'TRUE' },
      { id: 'P11', nama: 'Johan', panggilan: '', posisi: 'OUT', foto_url: '', aktif: 'TRUE' },
    ])
    expect(res.tabel.statistik.filter((r) => r.sesi_id === 'S002').map((r) => [r.pemain_id, r.tim])).toEqual([
      ['P01', 'Tim A'],
      ['P10', 'Tim B'],
      ['P11', 'Tim B'],
    ])
  })

  it('saves nothing when a new player is invalid', () => {
    const { gagal, tabel } = siapkan()
    expect(gagal('simpanSesi', { tanggal: '2026-10-31', lineup: [{ baru: { nama: 'Ok', posisi: 'OUT' }, tim: 'A' }, { baru: { nama: ' ' }, tim: 'A' }] })).toMatch(/Nama pemain baru/)
    expect(tabel().pemain).toHaveLength(3)
    expect(tabel().sesi).toHaveLength(1)
  })

  it('validates date, lineup and players', () => {
    const { gagal } = siapkan()
    expect(gagal('simpanSesi', { tanggal: '', lineup })).toMatch(/Tanggal/)
    expect(gagal('simpanSesi', { tanggal: '2026-10-31', lineup: [] })).toMatch(/minimal/)
    expect(gagal('simpanSesi', { tanggal: '2026-10-31', lineup: [{ pemainId: 'P99', tim: 'A' }] })).toMatch(/P99/)
    expect(gagal('simpanSesi', { tanggal: '2026-10-31', lineup: [{ pemainId: 'P01', tim: ' ' }] })).toMatch(/tim/)
  })
})

describe('simpanHasil', () => {
  function denganLineup() {
    const s = siapkan()
    s.kirim('simpanSesi', {
      tanggal: '2026-10-31',
      lineup: [
        { pemainId: 'P01', tim: 'Tim Budi' },
        { pemainId: 'P02', tim: 'Galacticos' },
      ],
    })
    return s
  }
  const s002 = (rows: Row[]) => rows.filter((r) => r.sesi_id === 'S002')

  it('replaces laga and updates player stats', () => {
    const { kirim } = denganLineup()
    const hasil = (skorA: string) => ({
      sesiId: 'S002',
      laga: [{ timA: 'tim budi', skorA, skorB: '1', timB: 'Galacticos' }],
      statistik: [
        { pemainId: 'P01', gol: 3, assist: 0, motm: true },
        { pemainId: 'P02', gol: 1, assist: -2, motm: false },
      ],
    })
    kirim('simpanHasil', hasil('2'))
    const res = kirim('simpanHasil', hasil('3'))
    expect(res.berubah).toEqual(['laga', 'statistik'])
    expect(res.tabel.laga).toEqual([{ sesi_id: 'S002', tim_a: 'tim budi', skor_a: '3', skor_b: '1', tim_b: 'Galacticos' }])
    expect(s002(res.tabel.statistik).map((r) => [r.pemain_id, r.gol, r.assist, r.motm])).toEqual([
      ['P01', '3', '0', '1'],
      ['P02', '1', '0', '0'],
    ])
    // sesi lain tidak tersentuh
    expect(res.tabel.statistik.find((r) => r.sesi_id === 'S001')).toMatchObject({ gol: '2' })
  })

  it('saves only laga when statistik is left out, keeping player stats', () => {
    const { kirim } = denganLineup()
    kirim('simpanHasil', { sesiId: 'S002', laga: [], statistik: [{ pemainId: 'P01', gol: 2, assist: 1, motm: true }] })
    const res = kirim('simpanHasil', {
      sesiId: 'S002',
      laga: [
        { timA: 'Tim Budi', skorA: 1, skorB: '0', timB: 'Galacticos' },
        { timA: 'Galacticos', skorA: '', skorB: '', timB: 'Tim Budi' },
      ],
    })
    expect(res.berubah).toEqual(['laga'])
    expect(s002(res.tabel.laga).map((r) => [r.skor_a, r.skor_b])).toEqual([
      ['1', '0'],
      ['', ''],
    ])
    expect(s002(res.tabel.statistik)[0]).toMatchObject({ gol: '2', assist: '1', motm: '1' })
  })

  it('rejects unknown teams, same-team matches, bad scores and players outside the lineup', () => {
    const { gagal } = denganLineup()
    const laga = (timA: string, timB: string, skorA = '1') => ({ sesiId: 'S002', laga: [{ timA, skorA, skorB: '0', timB }], statistik: [] })
    expect(gagal('simpanHasil', laga('Tim Budi', 'Los Lucu'))).toMatch(/line-up/)
    expect(gagal('simpanHasil', laga('Tim Budi', 'TIM BUDI'))).toMatch(/dirinya/)
    expect(gagal('simpanHasil', laga('Tim Budi', 'Galacticos', 'dua'))).toMatch(/skor/)
    expect(gagal('simpanHasil', { sesiId: 'S002', laga: [], statistik: [{ pemainId: 'P09', gol: 1, assist: 0, motm: false }] })).toMatch(/P09/)
    expect(gagal('simpanHasil', { sesiId: 'S404', laga: [], statistik: [] })).toMatch(/S404/)
  })
})

describe('hapusPemain', () => {
  it('removes the player and their statistik rows', () => {
    const { kirim, gagal } = siapkan()
    const res = kirim('hapusPemain', { id: 'P01' })
    expect(res.tabel.pemain.map((p) => p.id)).toEqual(['P02', 'P09'])
    expect(res.tabel.statistik).toEqual([])
    expect(res.tabel.sesi).toHaveLength(1)
    expect(gagal('hapusPemain', { id: 'P01' })).toMatch(/P01/)
  })

  it('removes several players at once, or none if one is unknown', () => {
    const { kirim, gagal } = siapkan()
    expect(gagal('hapusPemain', { ids: ['P02', 'P77'] })).toMatch(/P77/)
    expect(gagal('hapusPemain', { ids: [] })).toMatch(/minimal/)
    const res = kirim('hapusPemain', { ids: ['P02', 'P09'] })
    expect(res.tabel.pemain.map((p) => p.id)).toEqual(['P01'])
    expect(res.tabel.statistik).toHaveLength(1)
  })
})

describe('hapusSesi', () => {
  it('removes the session from sesi, statistik and laga', () => {
    const { kirim, gagal } = siapkan({ laga: [{ sesi_id: 'S001', tim_a: 'A', skor_a: '1', skor_b: '0', tim_b: 'B' }] })
    const res = kirim('hapusSesi', { id: 'S001' })
    expect([res.tabel.sesi, res.tabel.statistik, res.tabel.laga]).toEqual([[], [], []])
    expect(gagal('hapusSesi', { id: 'S001' })).toMatch(/S001/)
  })
})

describe('jalankanAksi', () => {
  it('rejects unknown actions without touching the tables', () => {
    const t = awal()
    expect(() => jalankanAksi(t, 'hapusSemua' as Aksi, {} as never)).toThrow(/tidak dikenal/)
  })
})

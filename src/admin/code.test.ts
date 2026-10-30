import { describe, expect, it } from 'vitest'
import kode from '../../apps-script/Code.gs?raw'
import { buatGas, muatScript } from './gasShim'

const PIN = '4321'

function siapkan(isi: Parameters<typeof buatGas>[0] = {}, props: Record<string, string> = { ADMIN_PIN: PIN }) {
  const gas = buatGas(
    {
      Pemain: [
        ['id', 'nama', 'panggilan', 'posisi', 'foto_url', 'aktif'],
        ['P01', 'Budi Santoso', 'Budi', 'FWD', '', true],
        ['P02', 'Raka Pratama', 'Raka', 'MID', '', true],
        ['P09', 'Taufik Hamdani', 'Taufik', 'GK', '', false],
      ],
      Sesi: [
        ['sesi_id', 'tanggal', 'lokasi', 'catatan'],
        ['S001', new Date(2026, 9, 24), 'Margonda', ''],
      ],
      Statistik: [
        ['sesi_id', 'pemain_id', 'hasil', 'gol', 'assist', 'motm'],
        ['S001', 'P01', 'M', 2, 0, 1],
      ],
      Poin: [
        ['aksi', 'poin'],
        ['gol', 3],
      ],
      ...isi,
    },
    props,
  )
  const { doPost, doGet } = muatScript(kode, gas.globals)
  const kirim = (action: string, data?: unknown, pin = PIN) => JSON.parse(doPost({ postData: { contents: JSON.stringify({ pin, action, data }) } }).getContent())
  const grid = (tab: string) => gas.sheets.get(tab)!.grid.filter((r) => r.some((c) => c !== ''))
  const bacaPublik = () => JSON.parse(doGet().getContent())
  return { kirim, grid, bacaPublik, props }
}

describe('Code.gs: PIN', () => {
  it('rejects a wrong PIN and locks after 10 failures', () => {
    const { kirim } = siapkan()
    expect(kirim('baca', null, '0000')).toEqual({ ok: false, error: 'PIN salah.' })
    for (let i = 0; i < 9; i++) kirim('baca', null, '0000')
    expect(kirim('baca').error).toMatch(/Terlalu banyak/)
  })

  it('rejects unknown actions', () => {
    expect(siapkan().kirim('hapusSemua').ok).toBe(false)
  })
})

describe('Code.gs: baca', () => {
  it('returns every tab as lowercase-keyed string rows, adding missing tabs and columns', () => {
    const { kirim, grid } = siapkan()
    const res = kirim('baca')
    expect(res.ok).toBe(true)
    expect(res.data.sesi).toEqual([{ sesi_id: 'S001', tanggal: '2026-10-24', lokasi: 'Margonda', catatan: '' }])
    expect(res.data.pemain[0]).toEqual({ id: 'P01', nama: 'Budi Santoso', panggilan: 'Budi', posisi: 'FWD', foto_url: '', aktif: 'TRUE' })
    expect(res.data.statistik[0]).toMatchObject({ gol: '2', motm: '1', tim: '' })
    expect(res.data.laga).toEqual([])
    expect(grid('Statistik')[0]).toEqual(['sesi_id', 'pemain_id', 'hasil', 'gol', 'assist', 'motm', 'tim'])
    expect(grid('Laga')[0]).toEqual(['sesi_id', 'tim_a', 'skor_a', 'skor_b', 'tim_b'])
  })
})

describe('Code.gs: simpanPemain', () => {
  it('adds a player with the next id', () => {
    const { kirim } = siapkan()
    const res = kirim('simpanPemain', { nama: '  Kevin   Ardiansyah ', panggilan: 'Kevin', posisi: 'fwd', fotoUrl: '', aktif: true })
    expect(res.hasil).toEqual({ id: 'P10' })
    expect(res.data.pemain.at(-1)).toEqual({ id: 'P10', nama: 'Kevin Ardiansyah', panggilan: 'Kevin', posisi: 'FWD', foto_url: '', aktif: 'TRUE' })
  })

  it('edits an existing player and falls back to MID', () => {
    const { kirim } = siapkan()
    const res = kirim('simpanPemain', { id: 'P02', nama: 'Raka P.', panggilan: '', posisi: 'striker', fotoUrl: 'https://x/y.jpg', aktif: false })
    expect(res.data.pemain[1]).toEqual({ id: 'P02', nama: 'Raka P.', panggilan: '', posisi: 'MID', foto_url: 'https://x/y.jpg', aktif: 'FALSE' })
    expect(res.data.pemain).toHaveLength(3)
  })

  it('requires a name and a known id', () => {
    const { kirim } = siapkan()
    expect(kirim('simpanPemain', { nama: ' ' }).error).toMatch(/Nama/)
    expect(kirim('simpanPemain', { id: 'P77', nama: 'X' }).error).toMatch(/P77/)
  })
})

describe('Code.gs: simpanSesi', () => {
  const lineup = [
    { pemainId: 'P01', tim: 'Tim Budi' },
    { pemainId: 'P02', tim: 'Galacticos' },
  ]

  it('creates a session with a lineup', () => {
    const { kirim, grid } = siapkan()
    const res = kirim('simpanSesi', { tanggal: '2026-10-31', lokasi: 'Margonda', catatan: '', lineup })
    expect(res.hasil).toEqual({ id: 'S002' })
    expect(res.data.statistik.filter((r: { sesi_id: string }) => r.sesi_id === 'S002')).toEqual([
      { sesi_id: 'S002', pemain_id: 'P01', hasil: '', gol: '0', assist: '0', motm: '0', tim: 'Tim Budi' },
      { sesi_id: 'S002', pemain_id: 'P02', hasil: '', gol: '0', assist: '0', motm: '0', tim: 'Galacticos' },
    ])
    // tanggal ditulis sebagai teks
    expect(grid('Sesi')[2]).toEqual(['S002', '2026-10-31', 'Margonda', ''])
  })

  it('keeps goals of players who stay and drops laga of removed teams', () => {
    const { kirim } = siapkan({
      Laga: [
        ['sesi_id', 'tim_a', 'skor_a', 'skor_b', 'tim_b'],
        ['S001', 'Tim Budi', 2, 1, 'Galacticos'],
        ['S001', 'Tim Budi', 1, 0, 'Los Lucu'],
      ],
    })
    const res = kirim('simpanSesi', { id: 'S001', tanggal: '2026-10-24', lokasi: 'Cibinong', catatan: 'hujan', lineup })
    expect(res.data.sesi).toEqual([{ sesi_id: 'S001', tanggal: '2026-10-24', lokasi: 'Cibinong', catatan: 'hujan' }])
    expect(res.data.statistik.find((r: { pemain_id: string }) => r.pemain_id === 'P01')).toMatchObject({ gol: '2', motm: '1', hasil: 'M', tim: 'Tim Budi' })
    expect(res.data.laga).toEqual([{ sesi_id: 'S001', tim_a: 'Tim Budi', skor_a: '2', skor_b: '1', tim_b: 'Galacticos' }])
  })

  it('validates date, lineup and players', () => {
    const { kirim } = siapkan()
    expect(kirim('simpanSesi', { tanggal: '', lineup }).error).toMatch(/Tanggal/)
    expect(kirim('simpanSesi', { tanggal: '2026-10-31', lineup: [] }).error).toMatch(/minimal/)
    expect(kirim('simpanSesi', { tanggal: '2026-10-31', lineup: [{ pemainId: 'P99', tim: 'A' }] }).error).toMatch(/P99/)
    expect(kirim('simpanSesi', { tanggal: '2026-10-31', lineup: [{ pemainId: 'P01', tim: ' ' }] }).error).toMatch(/tim/)
  })
})

describe('Code.gs: simpanHasil', () => {
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
    expect(res.data.laga).toEqual([{ sesi_id: 'S002', tim_a: 'tim budi', skor_a: '3', skor_b: '1', tim_b: 'Galacticos' }])
    const s002 = res.data.statistik.filter((r: { sesi_id: string }) => r.sesi_id === 'S002')
    expect(s002.map((r: Record<string, string>) => [r.pemain_id, r.gol, r.assist, r.motm])).toEqual([
      ['P01', '3', '0', '1'],
      ['P02', '1', '0', '0'],
    ])
    // sesi lain tidak tersentuh
    expect(res.data.statistik.find((r: { sesi_id: string }) => r.sesi_id === 'S001')).toMatchObject({ gol: '2' })
  })

  it('keeps empty scores as unplayed', () => {
    const { kirim } = denganLineup()
    const res = kirim('simpanHasil', { sesiId: 'S002', laga: [{ timA: 'Tim Budi', skorA: '', skorB: '', timB: 'Galacticos' }], statistik: [] })
    expect(res.data.laga[0]).toMatchObject({ skor_a: '', skor_b: '' })
  })

  it('rejects unknown teams, same-team matches, bad scores and players outside the lineup', () => {
    const { kirim } = denganLineup()
    const laga = (timA: string, timB: string, skorA = '1') => ({ sesiId: 'S002', laga: [{ timA, skorA, skorB: '0', timB }], statistik: [] })
    expect(kirim('simpanHasil', laga('Tim Budi', 'Los Lucu')).error).toMatch(/line-up/)
    expect(kirim('simpanHasil', laga('Tim Budi', 'TIM BUDI')).error).toMatch(/dirinya/)
    expect(kirim('simpanHasil', laga('Tim Budi', 'Galacticos', 'dua')).error).toMatch(/skor/)
    expect(kirim('simpanHasil', { sesiId: 'S002', laga: [], statistik: [{ pemainId: 'P09', gol: 1 }] }).error).toMatch(/P09/)
    expect(kirim('simpanHasil', { sesiId: 'S404', laga: [], statistik: [] }).error).toMatch(/S404/)
  })
})

describe('Code.gs: hapusSesi', () => {
  it('removes the session from Sesi, Statistik and Laga', () => {
    const { kirim } = siapkan({
      Laga: [
        ['sesi_id', 'tim_a', 'skor_a', 'skor_b', 'tim_b'],
        ['S001', 'A', 1, 0, 'B'],
      ],
    })
    const res = kirim('hapusSesi', { id: 'S001' })
    expect([res.data.sesi, res.data.statistik, res.data.laga]).toEqual([[], [], []])
    expect(kirim('hapusSesi', { id: 'S001' }).error).toMatch(/S001/)
  })
})

describe('Code.gs: pasang', () => {
  it('sets up every tab, default poin and the PIN once', () => {
    const gas = buatGas({}, {})
    const { doPost } = muatScript(kode, gas.globals)
    const pasang = (pin: string) => JSON.parse(doPost({ postData: { contents: JSON.stringify({ action: 'pasang', pin }) } }).getContent())
    expect(pasang('12').error).toMatch(/minimal/)
    const res = pasang('987654')
    expect(res.ok).toBe(true)
    expect(res.data.pemain).toEqual([])
    expect(res.data.poin).toContainEqual({ aksi: 'seri', poin: '0.5' })
    expect(gas.sheets.get('Statistik')!.grid[0]).toEqual(['sesi_id', 'pemain_id', 'tim', 'hasil', 'gol', 'assist', 'motm'])
    expect(pasang('111111').error).toMatch(/Sudah terpasang/)
    const baca = JSON.parse(doPost({ postData: { contents: JSON.stringify({ action: 'baca', pin: '987654' }) } }).getContent())
    expect(baca.ok).toBe(true)
  })
})

describe('Code.gs: doGet', () => {
  it('serves data without a PIN and refreshes after an admin write', () => {
    const { kirim, bacaPublik } = siapkan()
    expect(bacaPublik().data.pemain).toHaveLength(3)
    kirim('simpanPemain', { nama: 'Pemain Baru' })
    expect(bacaPublik().data.pemain).toHaveLength(4)
  })
})

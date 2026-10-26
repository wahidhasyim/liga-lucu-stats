import { POSISI, type BarisStat, type Hasil, type LeagueData, type Pemain, type Poin, type Posisi, type RawTables, type Row, type Sesi } from './types'

const str = (v: string | undefined) => (v ?? '').trim()

export function toCount(v: string | undefined): number {
  const n = Number.parseInt(str(v), 10)
  return Number.isFinite(n) && n > 0 ? n : 0
}

// Google Sheets bisa mengekspor tanggal sesuai format tampilan (ID: DD/MM/YYYY).
export function toIsoDate(v: string | undefined): string | null {
  const s = str(v)
  let y: number, m: number, d: number
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s)
  const dmy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s)
  if (iso) [y, m, d] = [Number(iso[1]), Number(iso[2]), Number(iso[3])]
  else if (dmy) [y, m, d] = [Number(dmy[3]), Number(dmy[2]), Number(dmy[1])]
  else return null
  if (m < 1 || m > 12 || d < 1 || d > 31) return null
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function toBool(v: string | undefined, fallback: boolean): boolean {
  const s = str(v).toUpperCase()
  if (s === '') return fallback
  return s === 'TRUE' || s === '1' || s === 'YA'
}

function toHasil(v: string | undefined): Hasil | null {
  const s = str(v).toUpperCase()
  return s === 'M' || s === 'S' || s === 'K' ? s : null
}

function parsePemain(rows: Row[]): Pemain[] {
  const out: Pemain[] = []
  for (const r of rows) {
    const id = str(r.id)
    if (!id) continue
    const nama = str(r.nama) || id
    const posisiRaw = str(r.posisi).toUpperCase()
    const posisi: Posisi = (POSISI as string[]).includes(posisiRaw) ? (posisiRaw as Posisi) : 'MID'
    out.push({
      id,
      nama,
      panggilan: str(r.panggilan) || nama.split(' ')[0],
      posisi,
      fotoUrl: str(r.foto_url),
      aktif: toBool(r.aktif, true),
    })
  }
  return out
}

function parseSesi(rows: Row[]): Sesi[] {
  const valid: Omit<Sesi, 'pekan'>[] = []
  for (const r of rows) {
    const id = str(r.sesi_id)
    if (!id) continue
    const tanggal = toIsoDate(r.tanggal)
    if (!tanggal) {
      console.warn(`[sesi] ${id}: tanggal "${str(r.tanggal)}" tidak valid, dilewati`)
      continue
    }
    valid.push({ id, tanggal, lokasi: str(r.lokasi), catatan: str(r.catatan) })
  }
  valid.sort((a, b) => a.tanggal.localeCompare(b.tanggal) || a.id.localeCompare(b.id))
  return valid.map((s, i) => ({ ...s, pekan: i + 1 }))
}

function parseStatistik(rows: Row[], pemainIds: Set<string>, sesiIds: Set<string>): BarisStat[] {
  const out: BarisStat[] = []
  rows.forEach((r, i) => {
    const sesiId = str(r.sesi_id)
    const pemainId = str(r.pemain_id)
    if (!sesiId && !pemainId) return
    if (!sesiIds.has(sesiId) || !pemainIds.has(pemainId)) {
      console.warn(`[statistik] baris ${i + 2}: sesi "${sesiId}" / pemain "${pemainId}" tidak dikenal, dilewati`)
      return
    }
    out.push({
      sesiId,
      pemainId,
      hasil: toHasil(r.hasil),
      gol: toCount(r.gol),
      assist: toCount(r.assist),
      motm: toBool(r.motm, false),
    })
  })
  return out
}

function parsePoin(rows: Row[]): Poin {
  const poin: Poin = {}
  for (const r of rows) {
    const aksi = str(r.aksi).toLowerCase()
    const n = Number.parseFloat(str(r.poin).replace(',', '.'))
    if (aksi && Number.isFinite(n)) poin[aksi] = n
  }
  return poin
}

export function parseLeague(raw: RawTables): LeagueData {
  const pemain = parsePemain(raw.pemain)
  const sesi = parseSesi(raw.sesi)
  const statistik = parseStatistik(raw.statistik, new Set(pemain.map((p) => p.id)), new Set(sesi.map((s) => s.id)))
  return { pemain, sesi, statistik, poin: parsePoin(raw.poin) }
}

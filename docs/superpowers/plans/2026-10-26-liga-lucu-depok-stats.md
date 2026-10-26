# Liga Lucu Depok Stats Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Website statistik pemain ala Transfermarkt untuk komunitas fun football Liga Lucu Depok, dengan data dari Google Sheets.

**Architecture:** SPA statis (Vite + React + TS) yang fetch 4 tab Google Sheets (published CSV) saat dibuka, parse + validasi ke tipe, lalu hitung statistik dengan fungsi murni dan render. Tanpa env var, app membaca CSV contoh di `sheet-template/` (dibundel via `?raw`, code-split).

**Tech Stack:** Vite, React 19, React Router 7 (`react-router-dom`), TypeScript ~5.9, PapaParse, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-26-liga-lucu-depok-stats-design.md`

## Global Constraints

- Semua copy UI dalam Bahasa Indonesia.
- Token warna: `--bg #070707`, `--panel #101010`, `--line #232019`, `--gold #C9A24D`, `--ink #F4F1EA`, `--mute #8A8578`.
- Font: Bebas Neue (judul/angka besar), Montserrat (body/label). Label uppercase letter-spacing ±0.3em. Semua angka tabular.
- Anti-slop: tanpa emoji, tanpa gradient warna-warni, tanpa shadow tebal, tanpa radius besar, satu aksen (emas).
- Logo: `public/logo.svg`.
- Mobile-first, acuan 375px, tanpa scroll horizontal di level halaman (tabel boleh scroll di dalam wadahnya).
- Kolom sheet (header lowercase): `Pemain` = id, nama, panggilan, posisi, foto_url, aktif · `Sesi` = sesi_id, tanggal, lokasi, catatan · `Statistik` = sesi_id, pemain_id, hasil, gol, assist, motm · `Poin` = aksi, poin.
- Env var: `VITE_SHEET_PEMAIN_URL`, `VITE_SHEET_SESI_URL`, `VITE_SHEET_STATISTIK_URL`, `VITE_SHEET_POIN_URL`.

## File Structure

```
index.html, package.json, tsconfig.json, vite.config.ts, vercel.json, .env.example, README.md, SETUP-SHEETS.md
public/logo.svg (sudah ada), public/_redirects
sheet-template/Pemain.csv, Sesi.csv, Statistik.csv, Poin.csv
src/main.tsx                     router + providers
src/vite-env.d.ts                tipe env
src/data/types.ts                tipe domain
src/data/parse.ts (+ .test.ts)   baris CSV mentah → LeagueData tervalidasi
src/data/sheets.ts               fetch/parse CSV, sumber sample vs Sheets
src/data/DataProvider.tsx        state loading/error/ready + retry
src/stats/compute.ts (+ .test.ts) agregasi, rating, peringkat, riwayat
src/lib/format.ts (+ .test.ts)   format tanggal/angka, label posisi
src/styles/tokens.css, global.css
src/components/Layout.tsx        Nav + main (gate status) + footer, useLeague()
src/components/Nav.tsx, StatusStates.tsx, PlayerPhoto.tsx, Segmented.tsx,
               Leaderboard.tsx, StatTable.tsx, PlayerCard.tsx, PointsChart.tsx
src/pages/Home.tsx, Stats.tsx, Players.tsx, PlayerProfile.tsx, Sessions.tsx, SessionDetail.tsx
```

---

### Task 1: Scaffold project

**Files:**
- Create: `package.json` (via npm), `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `src/vite-env.d.ts`

**Interfaces:**
- Produces: scripts `npm run dev|build|test`; env typing for `import.meta.env.VITE_SHEET_*`.

- [ ] **Step 1: Init and install**

```bash
npm init -y
npm pkg set name=liga-lucu-depok private=true type=module version=0.1.0 \
  scripts.dev="vite" scripts.build="tsc --noEmit && vite build" scripts.preview="vite preview" scripts.test="vitest run"
npm pkg delete main scripts.test-old keywords author license description
npm install react@^19 react-dom@^19 react-router-dom@^7 papaparse@^5
npm install -D vite @vitejs/plugin-react typescript@~5.9 vitest @types/react @types/react-dom @types/papaparse
```

- [ ] **Step 2: Config files**

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  },
  "include": ["src", "vite.config.ts"]
}
```

`vite.config.ts`:
```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
```

`src/vite-env.d.ts`:
```ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SHEET_PEMAIN_URL?: string
  readonly VITE_SHEET_SESI_URL?: string
  readonly VITE_SHEET_STATISTIK_URL?: string
  readonly VITE_SHEET_POIN_URL?: string
}
```

`index.html`:
```html
<!doctype html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#070707" />
    <meta name="description" content="Statistik pemain Liga Lucu Depok. Fun football tiap weekend." />
    <link rel="icon" type="image/svg+xml" href="/logo.svg" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Montserrat:wght@500;600;700&display=swap" rel="stylesheet" />
    <title>Liga Lucu Depok</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/main.tsx` (sementara, diganti di Task 5):
```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <h1>Liga Lucu Depok</h1>
  </StrictMode>,
)
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: `dist/` dibuat tanpa error.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json tsconfig.json vite.config.ts index.html src
git commit -m "chore: scaffold Vite + React + TS project"
```

---

### Task 2: Domain types, CSV templates, and parser

**Files:**
- Create: `src/data/types.ts`, `src/data/parse.ts`, `src/data/parse.test.ts`
- Create: `sheet-template/Pemain.csv`, `Sesi.csv`, `Statistik.csv`, `Poin.csv`

**Interfaces:**
- Produces:
  - Types `Posisi`, `POSISI`, `Hasil`, `Row`, `Pemain`, `Sesi`, `BarisStat`, `Poin`, `LeagueData`, `RawTables` (see code).
  - `parseLeague(raw: RawTables): LeagueData`, `toCount(v?: string): number`, `toIsoDate(v?: string): string | null`.

- [ ] **Step 1: Types** — `src/data/types.ts`:

```ts
export type Posisi = 'GK' | 'DEF' | 'MID' | 'FWD'
export const POSISI: Posisi[] = ['GK', 'DEF', 'MID', 'FWD']

export type Hasil = 'M' | 'S' | 'K'

export type Row = Record<string, string | undefined>

export interface Pemain {
  id: string
  nama: string
  panggilan: string
  posisi: Posisi
  fotoUrl: string
  aktif: boolean
}

export interface Sesi {
  id: string
  tanggal: string // YYYY-MM-DD
  lokasi: string
  catatan: string
  pekan: number // urutan berdasarkan tanggal, mulai 1
}

export interface BarisStat {
  sesiId: string
  pemainId: string
  hasil: Hasil | null
  gol: number
  assist: number
  motm: boolean
}

export type Poin = Record<string, number>

export interface LeagueData {
  pemain: Pemain[]
  sesi: Sesi[]
  statistik: BarisStat[]
  poin: Poin
}

export interface RawTables {
  pemain: Row[]
  sesi: Row[]
  statistik: Row[]
  poin: Row[]
}
```

- [ ] **Step 2: Write failing tests** — `src/data/parse.test.ts`:

```ts
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
```

- [ ] **Step 3: Run to verify failure**

Run: `npx vitest run src/data/parse.test.ts`
Expected: FAIL — cannot resolve `./parse`.

- [ ] **Step 4: Implement** — `src/data/parse.ts`:

```ts
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
```

- [ ] **Step 5: Run tests** — `npx vitest run src/data/parse.test.ts` → PASS.

- [ ] **Step 6: Sample CSVs**

`sheet-template/Pemain.csv`:
```csv
id,nama,panggilan,posisi,foto_url,aktif
P01,Budi Santoso,Budi,FWD,,TRUE
P02,Raka Pratama,Raka,MID,,TRUE
P03,Dimas Aji,Dimas,FWD,,TRUE
P04,Fajar Nugroho,Fajar,DEF,,TRUE
P05,Ilham Saputra,Ilham,GK,,TRUE
P06,Yoga Firmansyah,Yoga,MID,,TRUE
P07,Rizky Hidayat,Rizky,DEF,,TRUE
P08,Andre Wijaya,Andre,MID,,TRUE
P09,Taufik Hamdani,Taufik,GK,,TRUE
P10,Hendra Kusuma,Hendra,FWD,,FALSE
```

`sheet-template/Sesi.csv`:
```csv
sesi_id,tanggal,lokasi,catatan
S001,2026-09-26,Lapangan Mini Soccer Margonda,
S002,2026-10-03,Lapangan Mini Soccer Margonda,
S003,2026-10-17,Arena Cibinong,Hujan deras babak kedua
S004,2026-10-24,Lapangan Mini Soccer Margonda,
```

`sheet-template/Statistik.csv`:
```csv
sesi_id,pemain_id,hasil,gol,assist,motm
S001,P01,M,2,0,1
S001,P02,M,0,2,0
S001,P05,M,0,0,0
S001,P07,M,0,0,0
S001,P03,K,1,0,0
S001,P04,K,0,1,0
S001,P06,K,0,0,0
S001,P10,K,1,0,0
S002,P01,S,1,0,0
S002,P03,S,0,1,0
S002,P04,S,0,0,0
S002,P09,S,0,0,0
S002,P02,S,1,1,1
S002,P06,S,0,0,0
S002,P07,S,0,0,0
S002,P08,S,0,0,0
S003,P02,M,1,1,0
S003,P03,M,2,0,1
S003,P06,M,0,1,0
S003,P09,M,0,0,0
S003,P01,K,1,0,0
S003,P04,K,0,0,0
S003,P05,K,0,0,0
S003,P08,K,0,1,0
S004,P01,M,3,0,1
S004,P04,M,0,1,0
S004,P06,M,0,1,0
S004,P08,M,0,0,0
S004,P02,K,0,1,0
S004,P03,K,1,0,0
S004,P05,K,0,0,0
S004,P07,K,0,0,0
```

`sheet-template/Poin.csv`:
```csv
aksi,poin
hadir,1
gol,3
assist,2
motm,5
menang,2
seri,1
```

- [ ] **Step 7: Commit**

```bash
git add src/data sheet-template
git commit -m "feat: add domain types, CSV parser, and sample sheet data"
```

---

### Task 3: Statistics computation

**Files:**
- Create: `src/stats/compute.ts`, `src/stats/compute.test.ts`

**Interfaces:**
- Consumes: types from `src/data/types.ts`.
- Produces:
  - `type Rentang = 'semua' | 'bulan-ini'`
  - `type StatKey = 'rating' | 'hadir' | 'gol' | 'assist' | 'motm' | 'menang' | 'winRate' | 'poinPerSesi'`, `STAT_KEYS: StatKey[]`, `isStatKey(v: unknown): v is StatKey`
  - `interface PlayerStats { pemain; hadir; gol; assist; motm; menang; seri; kalah; winRate; rating; poinPerSesi; peringkat: number | null }`
  - `interface Riwayat { sesi; hasil; gol; assist; motm: boolean; poin }`
  - `interface BarisSesi { pemain: Pemain; baris: BarisStat; poin: number }`
  - `poinBaris(b, poin): number`, `compareDefault(a, b): number`, `sortBy(list, key): PlayerStats[]`, `computePlayerStats(data, rentang?, today?): PlayerStats[]` (semua pemain, terurut default; `peringkat` hanya untuk aktif & hadir>0), `riwayatPemain(data, pemainId): Riwayat[]` (urut pekan naik), `barisSesi(data, sesiId): BarisSesi[]` (poin turun), `ringkasan(data): { totalSesi; totalGol; pemainAktif }`

- [ ] **Step 1: Write failing tests** — `src/stats/compute.test.ts`:

```ts
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
```

- [ ] **Step 2: Run to verify failure** — `npx vitest run src/stats` → FAIL (module missing).

- [ ] **Step 3: Implement** — `src/stats/compute.ts`:

```ts
import type { BarisStat, Hasil, LeagueData, Pemain, Poin, Sesi } from '../data/types'

export type Rentang = 'semua' | 'bulan-ini'

export type StatKey = 'rating' | 'hadir' | 'gol' | 'assist' | 'motm' | 'menang' | 'winRate' | 'poinPerSesi'
export const STAT_KEYS: StatKey[] = ['rating', 'hadir', 'gol', 'assist', 'motm', 'menang', 'winRate', 'poinPerSesi']

export function isStatKey(v: unknown): v is StatKey {
  return typeof v === 'string' && (STAT_KEYS as string[]).includes(v)
}

export interface PlayerStats {
  pemain: Pemain
  hadir: number
  gol: number
  assist: number
  motm: number
  menang: number
  seri: number
  kalah: number
  winRate: number
  rating: number
  poinPerSesi: number
  peringkat: number | null
}

export interface Riwayat {
  sesi: Sesi
  hasil: Hasil | null
  gol: number
  assist: number
  motm: boolean
  poin: number
}

export interface BarisSesi {
  pemain: Pemain
  baris: BarisStat
  poin: number
}

export function poinBaris(b: BarisStat, poin: Poin): number {
  const p = (aksi: string) => poin[aksi] ?? 0
  let total = p('hadir') + b.gol * p('gol') + b.assist * p('assist')
  if (b.motm) total += p('motm')
  if (b.hasil === 'M') total += p('menang')
  else if (b.hasil === 'S') total += p('seri')
  else if (b.hasil === 'K') total += p('kalah')
  return total
}

function bulanKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function sesiDalamRentang(sesi: Sesi[], rentang: Rentang, today: Date): Sesi[] {
  if (rentang === 'semua') return sesi
  const key = bulanKey(today)
  return sesi.filter((s) => s.tanggal.startsWith(key))
}

export function compareDefault(a: PlayerStats, b: PlayerStats): number {
  return b.rating - a.rating || b.poinPerSesi - a.poinPerSesi || b.gol - a.gol || a.pemain.nama.localeCompare(b.pemain.nama, 'id')
}

export function sortBy(list: PlayerStats[], key: StatKey): PlayerStats[] {
  return [...list].sort((a, b) => b[key] - a[key] || compareDefault(a, b))
}

export function computePlayerStats(data: LeagueData, rentang: Rentang = 'semua', today = new Date()): PlayerStats[] {
  const sesiIds = new Set(sesiDalamRentang(data.sesi, rentang, today).map((s) => s.id))
  const byPemain = new Map<string, PlayerStats>()
  for (const pemain of data.pemain) {
    byPemain.set(pemain.id, { pemain, hadir: 0, gol: 0, assist: 0, motm: 0, menang: 0, seri: 0, kalah: 0, winRate: 0, rating: 0, poinPerSesi: 0, peringkat: null })
  }
  for (const b of data.statistik) {
    if (!sesiIds.has(b.sesiId)) continue
    const s = byPemain.get(b.pemainId)
    if (!s) continue
    s.hadir++
    s.gol += b.gol
    s.assist += b.assist
    if (b.motm) s.motm++
    if (b.hasil === 'M') s.menang++
    else if (b.hasil === 'S') s.seri++
    else if (b.hasil === 'K') s.kalah++
    s.rating += poinBaris(b, data.poin)
  }
  const all = [...byPemain.values()]
  for (const s of all) {
    s.winRate = s.hadir ? s.menang / s.hadir : 0
    s.poinPerSesi = s.hadir ? s.rating / s.hadir : 0
  }
  all.sort(compareDefault)
  let rank = 0
  for (const s of all) if (s.pemain.aktif && s.hadir > 0) s.peringkat = ++rank
  return all
}

export function riwayatPemain(data: LeagueData, pemainId: string): Riwayat[] {
  const sesiById = new Map(data.sesi.map((s) => [s.id, s]))
  return data.statistik
    .filter((b) => b.pemainId === pemainId)
    .flatMap((b) => {
      const sesi = sesiById.get(b.sesiId)
      return sesi ? [{ sesi, hasil: b.hasil, gol: b.gol, assist: b.assist, motm: b.motm, poin: poinBaris(b, data.poin) }] : []
    })
    .sort((a, b) => a.sesi.pekan - b.sesi.pekan)
}

export function barisSesi(data: LeagueData, sesiId: string): BarisSesi[] {
  const pemainById = new Map(data.pemain.map((p) => [p.id, p]))
  return data.statistik
    .filter((b) => b.sesiId === sesiId)
    .flatMap((baris) => {
      const pemain = pemainById.get(baris.pemainId)
      return pemain ? [{ pemain, baris, poin: poinBaris(baris, data.poin) }] : []
    })
    .sort((a, b) => b.poin - a.poin || a.pemain.nama.localeCompare(b.pemain.nama, 'id'))
}

export function ringkasan(data: LeagueData) {
  return {
    totalSesi: data.sesi.length,
    totalGol: data.statistik.reduce((n, b) => n + b.gol, 0),
    pemainAktif: data.pemain.filter((p) => p.aktif).length,
  }
}
```

- [ ] **Step 4: Run tests** — `npx vitest run src/stats` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/stats
git commit -m "feat: compute player ratings, rankings, and session stats"
```

---

### Task 4: Data loading and formatting helpers

**Files:**
- Create: `src/data/sheets.ts`, `src/data/DataProvider.tsx`, `src/lib/format.ts`, `src/lib/format.test.ts`

**Interfaces:**
- Consumes: `parseLeague`, `LeagueData`, `RawTables`, `Row`.
- Produces:
  - `parseCsv(text: string): Row[]`, `loadLeague(): Promise<LeagueData>`
  - `DataProvider` component, `useLeagueState(): { state: LeagueState; retry(): void }` where `LeagueState = { status: 'loading' } | { status: 'error'; error: Error } | { status: 'ready'; data: LeagueData }`
  - `formatTanggal(iso)` → "Sabtu, 24 Okt 2026", `formatTanggalPendek(iso)` → "24 Okt 2026", `formatAngka(n)`, `formatDesimal(n)` → "8,0", `formatPersen(r)` → "50%", `POSISI_LABEL: Record<Posisi, string>`, `inisial(nama)` → "BS"

- [ ] **Step 1: Write failing tests** — `src/lib/format.test.ts`:

```ts
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
```

- [ ] **Step 2: Run to verify failure** — `npx vitest run src/lib` → FAIL.

- [ ] **Step 3: Implement** — `src/lib/format.ts`:

```ts
import type { Posisi } from '../data/types'

const tanggalPanjang = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })
const tanggalPendek = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })

function toDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const formatTanggal = (iso: string) => tanggalPanjang.format(toDate(iso))
export const formatTanggalPendek = (iso: string) => tanggalPendek.format(toDate(iso))

export const formatAngka = (n: number) => n.toLocaleString('id-ID', { maximumFractionDigits: 1 })
export const formatDesimal = (n: number) => n.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
export const formatPersen = (r: number) => `${Math.round(r * 100)}%`

export const POSISI_LABEL: Record<Posisi, string> = { GK: 'Kiper', DEF: 'Bek', MID: 'Gelandang', FWD: 'Penyerang' }

export function inisial(nama: string): string {
  return nama
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}
```

`src/data/sheets.ts`:
```ts
import Papa from 'papaparse'
import { parseLeague } from './parse'
import type { LeagueData, RawTables, Row } from './types'

type Tabel = keyof RawTables
const TABEL: Tabel[] = ['pemain', 'sesi', 'statistik', 'poin']

const SHEET_URLS: Record<Tabel, string | undefined> = {
  pemain: import.meta.env.VITE_SHEET_PEMAIN_URL,
  sesi: import.meta.env.VITE_SHEET_SESI_URL,
  statistik: import.meta.env.VITE_SHEET_STATISTIK_URL,
  poin: import.meta.env.VITE_SHEET_POIN_URL,
}

// Dipakai saat env var belum diisi, supaya web bisa dicoba tanpa Google Sheets.
const SAMPLE: Record<Tabel, () => Promise<string>> = {
  pemain: () => import('../../sheet-template/Pemain.csv?raw').then((m) => m.default),
  sesi: () => import('../../sheet-template/Sesi.csv?raw').then((m) => m.default),
  statistik: () => import('../../sheet-template/Statistik.csv?raw').then((m) => m.default),
  poin: () => import('../../sheet-template/Poin.csv?raw').then((m) => m.default),
}

export function parseCsv(text: string): Row[] {
  return Papa.parse<Row>(text, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim().toLowerCase(),
  }).data
}

async function loadText(tabel: Tabel): Promise<string> {
  const url = SHEET_URLS[tabel]
  if (!url) return SAMPLE[tabel]()
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`Gagal memuat tab ${tabel} (HTTP ${res.status})`)
  const text = await res.text()
  // Sheet yang belum di-publish mengembalikan halaman HTML, bukan CSV.
  if (text.trimStart().startsWith('<')) throw new Error(`Tab ${tabel} bukan CSV. Pastikan sudah "Publish to web".`)
  return text
}

export async function loadLeague(): Promise<LeagueData> {
  const [pemain, sesi, statistik, poin] = (await Promise.all(TABEL.map(loadText))).map(parseCsv)
  return parseLeague({ pemain, sesi, statistik, poin })
}
```

`src/data/DataProvider.tsx`:
```tsx
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { loadLeague } from './sheets'
import type { LeagueData } from './types'

export type LeagueState = { status: 'loading' } | { status: 'error'; error: Error } | { status: 'ready'; data: LeagueData }

interface LeagueContextValue {
  state: LeagueState
  retry: () => void
}

const LeagueContext = createContext<LeagueContextValue | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LeagueState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })
    loadLeague().then(
      (data) => !cancelled && setState({ status: 'ready', data }),
      (error: unknown) => !cancelled && setState({ status: 'error', error: error instanceof Error ? error : new Error(String(error)) }),
    )
    return () => {
      cancelled = true
    }
  }, [attempt])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])
  return <LeagueContext.Provider value={{ state, retry }}>{children}</LeagueContext.Provider>
}

export function useLeagueState(): LeagueContextValue {
  const ctx = useContext(LeagueContext)
  if (!ctx) throw new Error('useLeagueState harus dipakai di dalam DataProvider')
  return ctx
}
```

- [ ] **Step 4: Run tests** — `npm test` → all PASS. If the Node ICU output for `id-ID` differs (e.g. "Okt." with a dot), fix the expectation only after checking the browser output matches.

- [ ] **Step 5: Commit**

```bash
git add src/data src/lib
git commit -m "feat: load sheets data with sample fallback and add formatters"
```

---

### Task 5: Visual system, layout shell, and routing

**Files:**
- Create: `src/styles/tokens.css`, `src/styles/global.css`, `src/components/Layout.tsx`, `src/components/Nav.tsx`, `src/components/StatusStates.tsx`, `src/components/PlayerPhoto.tsx`, `src/components/Segmented.tsx`
- Modify: `src/main.tsx` (full replace)

**Interfaces:**
- Consumes: `DataProvider`, `useLeagueState`, `inisial`, `Pemain`.
- Produces:
  - `Layout` (route element), `useLeague(): LeagueData` (only inside routes under Layout)
  - `LoadingState`, `ErrorState({ detail, onRetry })`, `EmptyState({ judul, pesan? })`, `NotFound({ pesan? })`
  - `PlayerPhoto({ pemain, size: 'sm' | 'md' | 'lg' })`
  - `Segmented<T extends string>({ label, value, options: { value: T; label: string }[], onChange })`
  - CSS classes used by later tasks: `wrap disp lbl gold mute page-title sec-head block band filters search grid table-scroll stat-table c-name c-rank c-pos sorted lb-list ranked lb-row lb-rank lb-name lb-pos lb-val badge-motm hasil hasil-M hasil-S hasil-K state state-title btn` plus page-specific ones defined here.

- [ ] **Step 1: Styles**

`src/styles/tokens.css`:
```css
:root {
  --bg: #070707;
  --panel: #101010;
  --line: #232019;
  --gold: #c9a24d;
  --gold-dim: #8f7536;
  --ink: #f4f1ea;
  --mute: #8a8578;
  --font-display: 'Bebas Neue', 'Arial Narrow', sans-serif;
  --font-body: 'Montserrat', system-ui, sans-serif;
  --gutter: 16px;
  --max: 1080px;
}
```

`src/styles/global.css`:
```css
*, *::before, *::after { box-sizing: border-box; }
html { color-scheme: dark; -webkit-text-size-adjust: 100%; }
body {
  margin: 0; min-height: 100vh; background: var(--bg); color: var(--ink);
  font-family: var(--font-body); font-size: 15px; line-height: 1.5;
  font-variant-numeric: tabular-nums; -webkit-font-smoothing: antialiased;
}
/* pendaran emas seperti glow di belakang logo pada poster */
body::before {
  content: ""; position: fixed; inset: 0 0 auto 0; height: 560px; pointer-events: none; z-index: 0;
  background: radial-gradient(ellipse 60% 100% at 50% 0%, rgba(201, 162, 77, 0.13), transparent 70%);
}
#root { position: relative; z-index: 1; min-height: 100vh; display: flex; flex-direction: column; }
a { color: inherit; text-decoration: none; }
img { display: block; max-width: 100%; }
button, input { font: inherit; color: inherit; }
:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }
h1, h2, h3 { margin: 0; font-weight: 400; }

.wrap { width: 100%; max-width: var(--max); margin: 0 auto; padding: 0 var(--gutter); }
.disp { font-family: var(--font-display); font-weight: 400; line-height: 0.92; letter-spacing: 0.01em; }
.lbl { font-size: 10px; font-weight: 600; letter-spacing: 0.3em; text-transform: uppercase; line-height: 1.6; }
.gold { color: var(--gold); }
.mute { color: var(--mute); }

/* nav */
.nav { position: sticky; top: 0; z-index: 10; border-bottom: 1px solid var(--line); background: rgba(7, 7, 7, 0.88); backdrop-filter: blur(8px); }
.nav-inner { display: flex; align-items: center; gap: 20px; min-height: 60px; }
.nav-brand { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.nav-brand img { width: 36px; height: 36px; }
.nav-brand span { font-family: var(--font-display); font-size: 22px; letter-spacing: 0.04em; }
.nav-links { display: flex; gap: 18px; margin-left: auto; overflow-x: auto; scrollbar-width: none; }
.nav-links a { padding: 6px 0; border-bottom: 2px solid transparent; color: var(--mute); white-space: nowrap; font-size: 10px; font-weight: 600; letter-spacing: 0.24em; text-transform: uppercase; }
.nav-links a:hover { color: var(--ink); }
.nav-links a.active { color: var(--ink); border-bottom-color: var(--gold); }
@media (max-width: 560px) { .nav-brand span { display: none; } .nav-links { gap: 14px; } }

.page { flex: 1; padding: 28px 0 64px; }
.footer { border-top: 1px solid var(--line); padding: 22px 0; }
.footer-inner { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 6px 24px; }

/* headings & sections */
.page-title { font-size: clamp(48px, 13vw, 92px); margin: 8px 0 24px; }
.sec-head { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; border-bottom: 2px solid var(--gold); padding-bottom: 6px; }
.sec-head h2 { font-size: 28px; }
.block { margin-bottom: 40px; }

/* band (pita putih-emas dari poster) */
.band { display: grid; grid-template-columns: repeat(3, 1fr); margin-bottom: 36px; }
.band > div { padding: 12px 14px; color: var(--bg); background: var(--ink); }
.band > div:nth-child(2) { background: var(--gold); }
.band .disp { display: block; margin-top: 4px; font-size: clamp(32px, 8vw, 48px); }

/* home */
.hero { display: grid; gap: 24px; align-items: center; padding-bottom: 32px; }
.hero-logo { width: 128px; height: 128px; filter: drop-shadow(0 0 48px rgba(201, 162, 77, 0.35)); }
.hero h1 { margin-top: 10px; font-size: clamp(54px, 15vw, 112px); }
@media (min-width: 760px) { .hero { grid-template-columns: auto 1fr; gap: 44px; padding-top: 12px; } .hero-logo { width: 210px; height: 210px; } }
.latest { display: grid; gap: 16px; padding: 18px; margin-bottom: 40px; border: 1px solid var(--line); background: var(--panel); }
.latest-motm { display: flex; align-items: center; gap: 14px; }
.latest-name { font-size: 36px; }
.scorers { display: flex; flex-wrap: wrap; gap: 4px 18px; margin-top: 4px; font-size: 14px; font-weight: 600; }
.boards { display: grid; gap: 36px; }
@media (min-width: 760px) { .boards { grid-template-columns: 1fr 1fr; gap: 40px 48px; } }

/* leaderboard rows */
.lb-row { display: grid; grid-template-columns: 30px 40px 1fr auto; gap: 12px; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--line); }
.lb-row.no-rank { grid-template-columns: 40px 1fr auto; }
.lb-rank { font-family: var(--font-display); font-size: 22px; color: var(--mute); }
.lb-name { font-size: 14px; font-weight: 600; line-height: 1.25; }
.lb-pos { font-size: 9px; font-weight: 700; letter-spacing: 0.2em; color: var(--mute); text-transform: uppercase; }
.lb-val { font-family: var(--font-display); font-size: 28px; line-height: 1; }
.lb-row:hover .lb-name { color: var(--gold); }
.ranked .lb-row:first-child .lb-rank, .ranked .lb-row:first-child .lb-val { color: var(--gold); }
.lb-empty { padding: 14px 0; color: var(--mute); font-size: 13px; }
.badge-motm { display: inline-block; margin-left: 8px; padding: 1px 6px; vertical-align: 2px; background: var(--gold); color: var(--bg); font-size: 9px; font-weight: 700; letter-spacing: 0.2em; }

/* photo */
.photo { position: relative; display: grid; place-items: center; overflow: hidden; flex-shrink: 0; background: linear-gradient(180deg, #1c1a15, #0c0c0c); border-bottom: 2px solid var(--gold); }
.photo img { width: 100%; height: 100%; object-fit: cover; }
.photo span { font-family: var(--font-display); color: var(--gold-dim); line-height: 1; }
.photo-sm { width: 40px; height: 40px; } .photo-sm span { font-size: 18px; }
.photo-md { width: 100%; aspect-ratio: 4 / 5; } .photo-md span { font-size: 64px; }
.photo-lg { width: 128px; height: 160px; } .photo-lg span { font-size: 64px; }
@media (min-width: 760px) { .photo-lg { width: 184px; height: 230px; } .photo-lg span { font-size: 88px; } }

/* filters */
.filters { display: flex; flex-wrap: wrap; align-items: center; gap: 12px 18px; margin-bottom: 20px; }
.seg { display: inline-flex; border: 1px solid var(--line); }
.seg button { padding: 8px 12px; border: 0; background: none; color: var(--mute); cursor: pointer; font-size: 10px; font-weight: 600; letter-spacing: 0.2em; text-transform: uppercase; }
.seg button:hover { color: var(--ink); }
.seg button[aria-pressed='true'] { background: var(--gold); color: var(--bg); }
.search { width: 100%; max-width: 320px; padding: 10px 12px; border: 1px solid var(--line); border-radius: 0; background: var(--panel); font-size: 14px; }
.search::placeholder { color: var(--mute); }

/* tables */
.table-scroll { overflow-x: auto; border-top: 2px solid var(--gold); }
.stat-table { width: 100%; border-collapse: collapse; white-space: nowrap; font-size: 13px; }
.stat-table th { padding: 10px; border-bottom: 1px solid var(--line); text-align: right; color: var(--mute); font-size: 9px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; }
.stat-table th button { all: unset; cursor: pointer; }
.stat-table th button:focus-visible { outline: 2px solid var(--gold); }
.stat-table th[aria-sort='descending'] { color: var(--gold); }
.stat-table td { padding: 10px; border-bottom: 1px solid var(--line); text-align: right; }
.stat-table .c-name { position: sticky; left: 0; z-index: 1; text-align: left; background: var(--bg); }
.stat-table tbody tr:hover td { background: var(--panel); }
.stat-table td.sorted { color: var(--gold); font-weight: 700; }
.c-rank { display: inline-block; width: 26px; color: var(--mute); font-family: var(--font-display); font-size: 17px; }
.c-name a { font-weight: 600; }
.c-name a:hover { color: var(--gold); }
.c-pos { margin-left: 6px; color: var(--mute); font-size: 9px; font-weight: 700; letter-spacing: 0.2em; }
.hasil { font-family: var(--font-display); font-size: 18px; }
.hasil-M { color: var(--gold); } .hasil-K { color: var(--mute); }

/* players grid */
.grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
@media (min-width: 640px) { .grid { grid-template-columns: repeat(3, 1fr); } }
@media (min-width: 960px) { .grid { grid-template-columns: repeat(4, 1fr); } }
.pcard { display: block; border: 1px solid var(--line); background: var(--panel); transition: border-color 0.15s; }
.pcard:hover { border-color: var(--gold-dim); }
.pcard-body { display: flex; justify-content: space-between; align-items: flex-end; gap: 8px; padding: 10px 12px 12px; }
.pcard-name { font-size: 26px; }
.pcard-rating { font-family: var(--font-display); font-size: 30px; line-height: 1; color: var(--gold); }

/* profile */
.profile-head { display: grid; grid-template-columns: auto 1fr; gap: 18px; align-items: end; padding-bottom: 24px; border-bottom: 1px solid var(--line); }
.profile-head h1 { margin: 6px 0 6px; font-size: clamp(46px, 12vw, 96px); }
.kpis { display: grid; grid-template-columns: repeat(4, 1fr); margin-bottom: 40px; border-bottom: 1px solid var(--line); }
.kpis > div { padding: 14px 12px; border-right: 1px solid var(--line); }
.kpis > div:last-child { border-right: 0; }
.kpis .disp { display: block; margin-top: 4px; font-size: clamp(32px, 8vw, 52px); }
.facts { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0 24px; margin: 0; }
@media (min-width: 760px) { .facts { grid-template-columns: repeat(3, 1fr); } }
.facts div { display: flex; justify-content: space-between; padding: 11px 0; border-bottom: 1px solid var(--line); font-size: 13px; }
.facts dt { color: var(--mute); }
.facts dd { margin: 0; font-weight: 700; }
.chart { display: block; width: 100%; max-width: 680px; height: auto; margin-top: 12px; }
.chart-axis { stroke: var(--line); stroke-width: 1; }
.chart-line { fill: none; stroke: var(--gold); stroke-width: 2.5; stroke-linejoin: round; }
.chart-dot { fill: var(--bg); stroke: var(--gold); stroke-width: 2.5; }
.chart-dot.motm { fill: var(--gold); }
.chart-lbl { fill: var(--mute); font-family: var(--font-body); font-size: 15px; font-weight: 600; }
.chart-val { fill: var(--ink); font-family: var(--font-display); font-size: 22px; }

/* sessions */
.sesi-row { display: grid; grid-template-columns: 56px 1fr auto; gap: 14px; align-items: center; padding: 14px 0; border-bottom: 1px solid var(--line); }
.sesi-row:hover .sesi-date { color: var(--gold); }
.sesi-week { font-family: var(--font-display); font-size: 40px; line-height: 0.9; color: var(--gold); }
.sesi-date { font-weight: 600; }
.sesi-meta { font-size: 13px; }
.sesi-goals { text-align: right; }
.sesi-goals .disp { font-size: 36px; }
.back { display: inline-block; margin-bottom: 18px; }
.back:hover { color: var(--ink); }
.note { margin: -8px 0 24px; color: var(--mute); font-style: italic; }

/* states */
.state { display: grid; justify-items: center; gap: 14px; padding: 48px 0; text-align: center; }
.state p { margin: 0; max-width: 420px; }
.state-title { font-size: clamp(40px, 10vw, 64px); }
.btn { display: inline-block; padding: 12px 20px; border: 0; background: var(--gold); color: var(--bg); cursor: pointer; font-size: 11px; font-weight: 700; letter-spacing: 0.24em; text-transform: uppercase; }
.skeleton { background: var(--panel); animation: pulse 1.4s ease-in-out infinite; }
.sk-title { width: 60%; height: 72px; margin-bottom: 24px; }
.sk-row { height: 52px; margin-bottom: 8px; }
@keyframes pulse { 50% { opacity: 0.45; } }
@media (prefers-reduced-motion: reduce) { .skeleton { animation: none; } }
```

- [ ] **Step 2: Components**

`src/components/Nav.tsx`:
```tsx
import { Link, NavLink } from 'react-router-dom'

const LINKS = [
  { to: '/', label: 'Beranda', end: true },
  { to: '/statistik', label: 'Statistik' },
  { to: '/pemain', label: 'Pemain' },
  { to: '/sesi', label: 'Sesi' },
]

export function Nav() {
  return (
    <header className="nav">
      <div className="wrap nav-inner">
        <Link to="/" className="nav-brand" aria-label="Liga Lucu Depok, beranda">
          <img src="/logo.svg" alt="" width={36} height={36} />
          <span>Liga Lucu Depok</span>
        </Link>
        <nav className="nav-links" aria-label="Navigasi utama">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end}>
              {l.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  )
}
```

`src/components/StatusStates.tsx`:
```tsx
import { Link } from 'react-router-dom'

export function LoadingState() {
  return (
    <div className="wrap" aria-busy="true" aria-label="Memuat data">
      <div className="skeleton sk-title" />
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="skeleton sk-row" />
      ))}
    </div>
  )
}

export function ErrorState({ detail, onRetry }: { detail: string; onRetry: () => void }) {
  return (
    <div className="wrap state" role="alert">
      <h1 className="disp state-title">Data belum bisa dimuat</h1>
      <p className="mute">Cek koneksi internet, lalu coba lagi. Kalau masih gagal, kabari admin.</p>
      <p className="lbl mute">{detail}</p>
      <button type="button" className="btn" onClick={onRetry}>
        Coba lagi
      </button>
    </div>
  )
}

export function EmptyState({ judul, pesan }: { judul: string; pesan?: string }) {
  return (
    <div className="state">
      <h2 className="disp state-title">{judul}</h2>
      {pesan && <p className="mute">{pesan}</p>}
    </div>
  )
}

export function NotFound({ pesan = 'Halaman yang kamu cari tidak ada.' }: { pesan?: string }) {
  return (
    <div className="wrap state">
      <div className="lbl gold">404</div>
      <h1 className="disp state-title">Offside.</h1>
      <p className="mute">{pesan}</p>
      <Link className="btn" to="/">
        Kembali ke beranda
      </Link>
    </div>
  )
}
```

`src/components/PlayerPhoto.tsx`:
```tsx
import { useState } from 'react'
import type { Pemain } from '../data/types'
import { inisial } from '../lib/format'

export function PlayerPhoto({ pemain, size }: { pemain: Pemain; size: 'sm' | 'md' | 'lg' }) {
  const [gagal, setGagal] = useState(false)
  return (
    <div className={`photo photo-${size}`}>
      {pemain.fotoUrl && !gagal ? (
        <img src={pemain.fotoUrl} alt={pemain.nama} loading="lazy" onError={() => setGagal(true)} />
      ) : (
        <span aria-hidden="true">{inisial(pemain.nama)}</span>
      )}
    </div>
  )
}
```

`src/components/Segmented.tsx`:
```tsx
interface Props<T extends string> {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}

export function Segmented<T extends string>({ label, value, options, onChange }: Props<T>) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}
```

`src/components/Layout.tsx`:
```tsx
import { useEffect } from 'react'
import { Outlet, useLocation, useOutletContext } from 'react-router-dom'
import { useLeagueState } from '../data/DataProvider'
import type { LeagueData } from '../data/types'
import { Nav } from './Nav'
import { ErrorState, LoadingState } from './StatusStates'

export function useLeague(): LeagueData {
  return useOutletContext<LeagueData>()
}

export function Layout() {
  const { state, retry } = useLeagueState()
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <>
      <Nav />
      <main className="page">
        {state.status === 'loading' && <LoadingState />}
        {state.status === 'error' && <ErrorState detail={state.error.message} onRetry={retry} />}
        {state.status === 'ready' && <Outlet context={state.data} />}
      </main>
      <footer className="footer">
        <div className="wrap footer-inner">
          <span className="lbl mute">Liga Lucu Depok · Fun football tiap weekend</span>
          <span className="lbl gold">Depok · Cibinong · Sekitarnya</span>
        </div>
      </footer>
    </>
  )
}
```

`src/main.tsx` (replace):
```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { NotFound } from './components/StatusStates'
import { DataProvider } from './data/DataProvider'
import './styles/tokens.css'
import './styles/global.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DataProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            {/* halaman ditambahkan di task berikutnya */}
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </DataProvider>
  </StrictMode>,
)
```

- [ ] **Step 3: Verify** — `npm run build` passes; `npm run dev` then open `/` → nav + "Offside." 404 page renders in the black/gold theme.

- [ ] **Step 4: Commit**

```bash
git add src
git commit -m "feat: add brand visual system, layout shell, and status states"
```

---

### Task 6: Home page

**Files:**
- Create: `src/components/Leaderboard.tsx`, `src/pages/Home.tsx`
- Modify: `src/main.tsx` (add index route)

**Interfaces:**
- Consumes: `useLeague`, `computePlayerStats`, `sortBy`, `barisSesi`, `ringkasan`, `StatKey`, `PlayerStats`, `Sesi`, `LeagueData`, `PlayerPhoto`, `EmptyState`, `formatTanggal`, `formatAngka`.
- Produces: `Leaderboard({ judul, statKey, items, lihatSemua? })`.

- [ ] **Step 1: Leaderboard** — `src/components/Leaderboard.tsx`:

```tsx
import { Link } from 'react-router-dom'
import { formatAngka } from '../lib/format'
import type { PlayerStats, StatKey } from '../stats/compute'
import { PlayerPhoto } from './PlayerPhoto'

interface Props {
  judul: string
  statKey: StatKey
  items: PlayerStats[]
  lihatSemua?: string
}

export function Leaderboard({ judul, statKey, items, lihatSemua }: Props) {
  return (
    <section>
      <div className="sec-head">
        <h2 className="disp">{judul}</h2>
        {lihatSemua && (
          <Link className="lbl gold" to={lihatSemua}>
            Lihat semua
          </Link>
        )}
      </div>
      {items.length === 0 ? (
        <p className="lb-empty">Belum ada data.</p>
      ) : (
        <div className="lb-list ranked">
          {items.map((s, i) => (
            <Link key={s.pemain.id} className="lb-row" to={`/pemain/${s.pemain.id}`}>
              <span className="lb-rank">{String(i + 1).padStart(2, '0')}</span>
              <PlayerPhoto pemain={s.pemain} size="sm" />
              <div>
                <div className="lb-name">{s.pemain.nama}</div>
                <div className="lb-pos">{s.pemain.posisi}</div>
              </div>
              <span className="lb-val">{formatAngka(s[statKey])}</span>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
```

- [ ] **Step 2: Home** — `src/pages/Home.tsx`:

```tsx
import { Link } from 'react-router-dom'
import { useLeague } from '../components/Layout'
import { Leaderboard } from '../components/Leaderboard'
import { PlayerPhoto } from '../components/PlayerPhoto'
import { EmptyState } from '../components/StatusStates'
import type { LeagueData, Sesi } from '../data/types'
import { formatTanggal } from '../lib/format'
import { barisSesi, computePlayerStats, ringkasan, sortBy, type StatKey } from '../stats/compute'

const BOARDS: { judul: string; key: StatKey }[] = [
  { judul: 'Rating pemain', key: 'rating' },
  { judul: 'Topskor', key: 'gol' },
  { judul: 'Top assist', key: 'assist' },
  { judul: 'Raja MOTM', key: 'motm' },
]

function SesiTerakhir({ data, sesi }: { data: LeagueData; sesi: Sesi }) {
  const baris = barisSesi(data, sesi.id)
  const motm = baris.filter((b) => b.baris.motm)
  const pencetak = baris.filter((b) => b.baris.gol > 0).sort((a, b) => b.baris.gol - a.baris.gol)
  return (
    <section className="latest">
      <div className="sec-head">
        <h2 className="disp">Sesi terakhir</h2>
        <Link className="lbl gold" to={`/sesi/${sesi.id}`}>
          Detail
        </Link>
      </div>
      <div className="lbl mute">
        {formatTanggal(sesi.tanggal)}
        {sesi.lokasi && ` · ${sesi.lokasi}`}
      </div>
      {motm.map((m) => (
        <Link key={m.pemain.id} className="latest-motm" to={`/pemain/${m.pemain.id}`}>
          <PlayerPhoto pemain={m.pemain} size="sm" />
          <div>
            <div className="lbl gold">Man of the match</div>
            <div className="disp latest-name">{m.pemain.nama}</div>
          </div>
        </Link>
      ))}
      {pencetak.length > 0 && (
        <div>
          <div className="lbl mute">Pencetak gol</div>
          <div className="scorers">
            {pencetak.map((p) => (
              <Link key={p.pemain.id} to={`/pemain/${p.pemain.id}`}>
                {p.pemain.panggilan} <span className="gold">{p.baris.gol}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

export default function Home() {
  const data = useLeague()
  const stats = computePlayerStats(data).filter((s) => s.peringkat !== null)
  const r = ringkasan(data)
  const terakhir = data.sesi.at(-1)

  return (
    <>
      <section className="wrap hero">
        <img className="hero-logo" src="/logo.svg" alt="Logo Liga Lucu Depok" />
        <div>
          <div className="lbl gold">{terakhir ? `Pekan ${terakhir.pekan} · ${formatTanggal(terakhir.tanggal)}` : 'Fun football tiap weekend'}</div>
          <h1 className="disp">
            Bukan liga pro.
            <br />
            <span className="gold">Ini liga lucu.</span>
          </h1>
        </div>
      </section>
      <div className="wrap">
        <div className="band">
          <div>
            <span className="lbl">Sesi</span>
            <span className="disp">{r.totalSesi}</span>
          </div>
          <div>
            <span className="lbl">Gol</span>
            <span className="disp">{r.totalGol}</span>
          </div>
          <div>
            <span className="lbl">Pemain</span>
            <span className="disp">{r.pemainAktif}</span>
          </div>
        </div>
        {terakhir ? (
          <>
            <SesiTerakhir data={data} sesi={terakhir} />
            <div className="boards">
              {BOARDS.map((b) => (
                <Leaderboard
                  key={b.key}
                  judul={b.judul}
                  statKey={b.key}
                  items={sortBy(stats, b.key).filter((s) => s[b.key] > 0).slice(0, 3)}
                  lihatSemua={`/statistik?urut=${b.key}`}
                />
              ))}
            </div>
          </>
        ) : (
          <EmptyState judul="Belum ada pertandingan" pesan="Leaderboard muncul setelah sesi pertama dicatat di Google Sheets." />
        )}
      </div>
    </>
  )
}
```

- [ ] **Step 3: Route** — in `src/main.tsx` add `import Home from './pages/Home'` and replace the comment line with `<Route index element={<Home />} />`.

- [ ] **Step 4: Verify** — `npm run build` passes; dev server `/` shows Pekan 4 · Sabtu, 24 Okt 2026, band 4/14/9, MOTM Budi Santoso, 4 leaderboards (Rating #1 Budi).

- [ ] **Step 5: Commit**

```bash
git add src
git commit -m "feat: add home page with latest session and leaderboards"
```

---

### Task 7: Statistik page

**Files:**
- Create: `src/components/StatTable.tsx`, `src/pages/Stats.tsx`
- Modify: `src/main.tsx` (add route)

**Interfaces:**
- Consumes: `useLeague`, `computePlayerStats`, `sortBy`, `isStatKey`, `Rentang`, `StatKey`, `PlayerStats`, `POSISI`, `Posisi`, `Segmented`, `EmptyState`, `formatAngka`, `formatDesimal`, `formatPersen`.
- Produces: `StatTable({ rows, urut, onUrut })`; `FilterPosisi` and `POSISI_OPTIONS` exported from `Segmented.tsx` (reused by Players in Task 8).

- [ ] **Step 1: Shared posisi options** — append to `src/components/Segmented.tsx`:

```tsx
import { POSISI, type Posisi } from '../data/types'

export type FilterPosisi = Posisi | 'ALL'
export const POSISI_OPTIONS: { value: FilterPosisi; label: string }[] = [{ value: 'ALL', label: 'Semua' }, ...POSISI.map((p) => ({ value: p, label: p }))]
```
(put the import at the top of the file.)

- [ ] **Step 2: StatTable** — `src/components/StatTable.tsx`:

```tsx
import { Link } from 'react-router-dom'
import { formatAngka, formatDesimal, formatPersen } from '../lib/format'
import type { PlayerStats, StatKey } from '../stats/compute'

const KOLOM: { key: StatKey; label: string; title: string }[] = [
  { key: 'rating', label: 'Rating', title: 'Total poin' },
  { key: 'hadir', label: 'Hadir', title: 'Jumlah sesi' },
  { key: 'gol', label: 'Gol', title: 'Gol' },
  { key: 'assist', label: 'Ast', title: 'Assist' },
  { key: 'motm', label: 'MOTM', title: 'Man of the match' },
  { key: 'menang', label: 'M-S-K', title: 'Menang-seri-kalah' },
  { key: 'winRate', label: 'Win%', title: 'Persentase menang' },
  { key: 'poinPerSesi', label: 'Poin/S', title: 'Rata-rata poin per sesi' },
]

function cell(s: PlayerStats, key: StatKey): string {
  if (key === 'menang') return `${s.menang}-${s.seri}-${s.kalah}`
  if (key === 'winRate') return formatPersen(s.winRate)
  if (key === 'poinPerSesi') return formatDesimal(s.poinPerSesi)
  return formatAngka(s[key])
}

interface Props {
  rows: PlayerStats[]
  urut: StatKey
  onUrut: (key: StatKey) => void
}

export function StatTable({ rows, urut, onUrut }: Props) {
  return (
    <div className="table-scroll">
      <table className="stat-table">
        <thead>
          <tr>
            <th className="c-name">Pemain</th>
            {KOLOM.map((k) => (
              <th key={k.key} title={k.title} aria-sort={urut === k.key ? 'descending' : 'none'}>
                <button type="button" onClick={() => onUrut(k.key)}>
                  {k.label}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((s, i) => (
            <tr key={s.pemain.id}>
              <td className="c-name">
                <span className="c-rank">{i + 1}</span>
                <Link to={`/pemain/${s.pemain.id}`}>{s.pemain.nama}</Link>
                <span className="c-pos">{s.pemain.posisi}</span>
              </td>
              {KOLOM.map((k) => (
                <td key={k.key} className={urut === k.key ? 'sorted' : undefined}>
                  {cell(s, k.key)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 3: Stats page** — `src/pages/Stats.tsx`:

```tsx
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useLeague } from '../components/Layout'
import { POSISI_OPTIONS, Segmented, type FilterPosisi } from '../components/Segmented'
import { StatTable } from '../components/StatTable'
import { EmptyState } from '../components/StatusStates'
import { computePlayerStats, isStatKey, sortBy, type Rentang } from '../stats/compute'

const RENTANG_OPTIONS: { value: Rentang; label: string }[] = [
  { value: 'semua', label: 'Semua waktu' },
  { value: 'bulan-ini', label: 'Bulan ini' },
]

export default function Stats() {
  const data = useLeague()
  const [params, setParams] = useSearchParams()
  const urutParam = params.get('urut')
  const urut = isStatKey(urutParam) ? urutParam : 'rating'
  const [rentang, setRentang] = useState<Rentang>('semua')
  const [posisi, setPosisi] = useState<FilterPosisi>('ALL')

  const rows = sortBy(
    computePlayerStats(data, rentang).filter((s) => s.pemain.aktif && s.hadir > 0 && (posisi === 'ALL' || s.pemain.posisi === posisi)),
    urut,
  )

  return (
    <div className="wrap">
      <div className="lbl gold">Statistik</div>
      <h1 className="disp page-title">
        Angka nggak
        <br />
        <span className="gold">bisa bohong.</span>
      </h1>
      <div className="filters">
        <Segmented label="Rentang waktu" value={rentang} options={RENTANG_OPTIONS} onChange={setRentang} />
        <Segmented label="Posisi" value={posisi} options={POSISI_OPTIONS} onChange={setPosisi} />
      </div>
      {rows.length > 0 ? (
        <StatTable rows={rows} urut={urut} onUrut={(k) => setParams({ urut: k }, { replace: true })} />
      ) : (
        <EmptyState judul={rentang === 'bulan-ini' ? 'Belum ada sesi bulan ini' : 'Belum ada data'} pesan="Coba ganti filter rentang waktu atau posisi." />
      )}
    </div>
  )
}
```

- [ ] **Step 4: Route** — add `import Stats from './pages/Stats'` and `<Route path="statistik" element={<Stats />} />` in `src/main.tsx`.

- [ ] **Step 5: Verify** — build passes; `/statistik?urut=gol` sorts by gol with the Gol column gold; "Bulan ini" hides S001-only data; at 375px the table scrolls inside its container with the name column sticky.

- [ ] **Step 6: Commit**

```bash
git add src
git commit -m "feat: add sortable statistics table with filters"
```

---

### Task 8: Pemain list and profile

**Files:**
- Create: `src/components/PlayerCard.tsx`, `src/components/PointsChart.tsx`, `src/pages/Players.tsx`, `src/pages/PlayerProfile.tsx`
- Modify: `src/main.tsx` (2 routes)

**Interfaces:**
- Consumes: `computePlayerStats`, `riwayatPemain`, `Riwayat`, `PlayerStats`, `PlayerPhoto`, `Segmented`, `POSISI_OPTIONS`, `FilterPosisi`, `EmptyState`, `NotFound`, `POSISI_LABEL`, format helpers.
- Produces: `PlayerCard({ stats })`, `PointsChart({ riwayat })`.

- [ ] **Step 1: PlayerCard** — `src/components/PlayerCard.tsx`:

```tsx
import { Link } from 'react-router-dom'
import { formatAngka, POSISI_LABEL } from '../lib/format'
import type { PlayerStats } from '../stats/compute'
import { PlayerPhoto } from './PlayerPhoto'

export function PlayerCard({ stats }: { stats: PlayerStats }) {
  const { pemain } = stats
  return (
    <Link className="pcard" to={`/pemain/${pemain.id}`}>
      <PlayerPhoto pemain={pemain} size="md" />
      <div className="pcard-body">
        <div>
          <div className="disp pcard-name">{pemain.panggilan}</div>
          <div className="lbl mute">{POSISI_LABEL[pemain.posisi]}</div>
        </div>
        <div className="pcard-rating" title="Rating">
          {stats.hadir > 0 ? formatAngka(stats.rating) : '–'}
        </div>
      </div>
    </Link>
  )
}
```

- [ ] **Step 2: PointsChart** — `src/components/PointsChart.tsx`:

```tsx
import { formatAngka } from '../lib/format'
import type { Riwayat } from '../stats/compute'

const W = 600
const H = 200
const PX = 28
const PT = 36
const PB = 32

export function PointsChart({ riwayat }: { riwayat: Riwayat[] }) {
  if (riwayat.length === 0) return null
  const max = Math.max(...riwayat.map((r) => r.poin), 1)
  const min = Math.min(...riwayat.map((r) => r.poin), 0)
  const step = riwayat.length > 1 ? (W - PX * 2) / (riwayat.length - 1) : 0
  const pts = riwayat.map((r, i) => ({
    r,
    x: riwayat.length > 1 ? PX + i * step : W / 2,
    y: PT + ((max - r.poin) / (max - min)) * (H - PT - PB),
  }))
  const tiap = Math.ceil(riwayat.length / 10)
  const tampilNilai = riwayat.length <= 12

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Grafik poin per sesi dari ${riwayat.length} sesi`}>
      <line className="chart-axis" x1={PX} x2={W - PX} y1={H - PB} y2={H - PB} />
      {pts.length > 1 && <polyline className="chart-line" points={pts.map((p) => `${p.x},${p.y}`).join(' ')} />}
      {pts.map((p, i) => (
        <g key={p.r.sesi.id}>
          <circle className={p.r.motm ? 'chart-dot motm' : 'chart-dot'} cx={p.x} cy={p.y} r={p.r.motm ? 7 : 5}>
            <title>{`Pekan ${p.r.sesi.pekan}: ${formatAngka(p.r.poin)} poin${p.r.motm ? ' (MOTM)' : ''}`}</title>
          </circle>
          {tampilNilai && (
            <text className="chart-val" x={p.x} y={p.y - 14} textAnchor="middle">
              {formatAngka(p.r.poin)}
            </text>
          )}
          {i % tiap === 0 && (
            <text className="chart-lbl" x={p.x} y={H - 8} textAnchor="middle">
              P{p.r.sesi.pekan}
            </text>
          )}
        </g>
      ))}
    </svg>
  )
}
```

- [ ] **Step 3: Players page** — `src/pages/Players.tsx`:

```tsx
import { useState } from 'react'
import { useLeague } from '../components/Layout'
import { PlayerCard } from '../components/PlayerCard'
import { POSISI_OPTIONS, Segmented, type FilterPosisi } from '../components/Segmented'
import { EmptyState } from '../components/StatusStates'
import { computePlayerStats } from '../stats/compute'

export default function Players() {
  const data = useLeague()
  const [q, setQ] = useState('')
  const [posisi, setPosisi] = useState<FilterPosisi>('ALL')
  const aktif = computePlayerStats(data).filter((s) => s.pemain.aktif)
  const query = q.trim().toLowerCase()
  const list = aktif.filter(
    (s) =>
      (posisi === 'ALL' || s.pemain.posisi === posisi) &&
      (!query || s.pemain.nama.toLowerCase().includes(query) || s.pemain.panggilan.toLowerCase().includes(query)),
  )

  return (
    <div className="wrap">
      <div className="lbl gold">Skuad</div>
      <h1 className="disp page-title">
        {aktif.length} pemain,
        <br />
        <span className="gold">satu lapangan.</span>
      </h1>
      <div className="filters">
        <input className="search" type="search" placeholder="Cari nama pemain" aria-label="Cari nama pemain" value={q} onChange={(e) => setQ(e.target.value)} />
        <Segmented label="Posisi" value={posisi} options={POSISI_OPTIONS} onChange={setPosisi} />
      </div>
      {list.length > 0 ? (
        <div className="grid">
          {list.map((s) => (
            <PlayerCard key={s.pemain.id} stats={s} />
          ))}
        </div>
      ) : (
        <EmptyState judul="Pemain tidak ditemukan" pesan="Coba kata kunci atau posisi lain." />
      )}
    </div>
  )
}
```

- [ ] **Step 4: Profile page** — `src/pages/PlayerProfile.tsx`:

```tsx
import { Link, useParams } from 'react-router-dom'
import { useLeague } from '../components/Layout'
import { PlayerPhoto } from '../components/PlayerPhoto'
import { PointsChart } from '../components/PointsChart'
import { EmptyState, NotFound } from '../components/StatusStates'
import { formatAngka, formatDesimal, formatPersen, formatTanggalPendek, POSISI_LABEL } from '../lib/format'
import { computePlayerStats, riwayatPemain } from '../stats/compute'

export default function PlayerProfile() {
  const { id } = useParams()
  const data = useLeague()
  const all = computePlayerStats(data)
  const s = all.find((x) => x.pemain.id === id)
  if (!s) return <NotFound pesan="Pemain tidak ditemukan." />

  const { pemain } = s
  const total = all.filter((x) => x.peringkat !== null).length
  const riwayat = riwayatPemain(data, pemain.id)
  const [depan, ...belakang] = pemain.nama.split(' ')
  const keterangan = [POSISI_LABEL[pemain.posisi], s.peringkat ? `Peringkat #${s.peringkat} dari ${total}` : null, pemain.aktif ? null : 'Tidak aktif']
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="wrap">
      <header className="profile-head">
        <PlayerPhoto pemain={pemain} size="lg" />
        <div>
          <div className="lbl gold">{keterangan}</div>
          <h1 className="disp">
            {depan}
            {belakang.length > 0 && (
              <>
                <br />
                {belakang.join(' ')}
              </>
            )}
          </h1>
          <div className="lbl mute">
            “{pemain.panggilan}” · {s.hadir} sesi
          </div>
        </div>
      </header>

      <div className="kpis">
        <div>
          <span className="lbl mute">Rating</span>
          <span className="disp gold">{formatAngka(s.rating)}</span>
        </div>
        <div>
          <span className="lbl mute">Gol</span>
          <span className="disp">{s.gol}</span>
        </div>
        <div>
          <span className="lbl mute">Assist</span>
          <span className="disp">{s.assist}</span>
        </div>
        <div>
          <span className="lbl mute">MOTM</span>
          <span className="disp">{s.motm}</span>
        </div>
      </div>

      {riwayat.length === 0 ? (
        <EmptyState judul="Belum pernah main" pesan="Statistik muncul setelah sesi pertama dicatat." />
      ) : (
        <>
          <section className="block">
            <div className="sec-head">
              <h2 className="disp">Rekap</h2>
            </div>
            <dl className="facts">
              <div>
                <dt>Hadir</dt>
                <dd>{s.hadir}</dd>
              </div>
              <div>
                <dt>Menang</dt>
                <dd>{s.menang}</dd>
              </div>
              <div>
                <dt>Seri</dt>
                <dd>{s.seri}</dd>
              </div>
              <div>
                <dt>Kalah</dt>
                <dd>{s.kalah}</dd>
              </div>
              <div>
                <dt>Win rate</dt>
                <dd>{formatPersen(s.winRate)}</dd>
              </div>
              <div>
                <dt>Poin per sesi</dt>
                <dd>{formatDesimal(s.poinPerSesi)}</dd>
              </div>
            </dl>
          </section>

          <section className="block">
            <div className="sec-head">
              <h2 className="disp">Poin per sesi</h2>
              <span className="lbl mute">Titik emas = MOTM</span>
            </div>
            <PointsChart riwayat={riwayat} />
          </section>

          <section className="block">
            <div className="sec-head">
              <h2 className="disp">Riwayat sesi</h2>
            </div>
            <div className="table-scroll">
              <table className="stat-table">
                <thead>
                  <tr>
                    <th className="c-name">Sesi</th>
                    <th>Hasil</th>
                    <th>Gol</th>
                    <th>Ast</th>
                    <th>Poin</th>
                  </tr>
                </thead>
                <tbody>
                  {[...riwayat].reverse().map((r) => (
                    <tr key={r.sesi.id}>
                      <td className="c-name">
                        <Link to={`/sesi/${r.sesi.id}`}>Pekan {r.sesi.pekan}</Link>
                        <span className="c-pos">{formatTanggalPendek(r.sesi.tanggal)}</span>
                        {r.motm && <span className="badge-motm">MOTM</span>}
                      </td>
                      <td>{r.hasil ? <span className={`hasil hasil-${r.hasil}`}>{r.hasil}</span> : '–'}</td>
                      <td>{r.gol}</td>
                      <td>{r.assist}</td>
                      <td>{formatAngka(r.poin)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Routes** — add imports and `<Route path="pemain" element={<Players />} />`, `<Route path="pemain/:id" element={<PlayerProfile />} />` in `src/main.tsx`.

- [ ] **Step 6: Verify** — build passes; `/pemain` shows 9 cards (Hendra hidden), search "bud" leaves Budi; `/pemain/P01` shows Peringkat #1 dari 9, chart with 4 points (2 gold MOTM dots), riwayat newest first; `/pemain/P10` opens with "Tidak aktif"; `/pemain/XXX` shows "Offside."

- [ ] **Step 7: Commit**

```bash
git add src
git commit -m "feat: add player list and player profile with points chart"
```

---

### Task 9: Sesi archive and detail

**Files:**
- Create: `src/pages/Sessions.tsx`, `src/pages/SessionDetail.tsx`
- Modify: `src/main.tsx` (2 routes)

**Interfaces:**
- Consumes: `useLeague`, `barisSesi`, `Hasil`, `PlayerPhoto`, `EmptyState`, `NotFound`, `formatTanggal`, `formatAngka`.

- [ ] **Step 1: Sessions** — `src/pages/Sessions.tsx`:

```tsx
import { Link } from 'react-router-dom'
import { useLeague } from '../components/Layout'
import { EmptyState } from '../components/StatusStates'
import { formatTanggal } from '../lib/format'
import { barisSesi } from '../stats/compute'

export default function Sessions() {
  const data = useLeague()
  const list = [...data.sesi].reverse()

  return (
    <div className="wrap">
      <div className="lbl gold">Arsip</div>
      <h1 className="disp page-title">
        Tiap pekan
        <br />
        <span className="gold">ada ceritanya.</span>
      </h1>
      {list.length === 0 ? (
        <EmptyState judul="Belum ada pertandingan" pesan="Sesi muncul di sini setelah admin mengisi tab Sesi dan Statistik." />
      ) : (
        <div>
          {list.map((s) => {
            const baris = barisSesi(data, s.id)
            const gol = baris.reduce((n, b) => n + b.baris.gol, 0)
            const motm = baris
              .filter((b) => b.baris.motm)
              .map((b) => b.pemain.panggilan)
              .join(', ')
            return (
              <Link key={s.id} className="sesi-row" to={`/sesi/${s.id}`}>
                <div>
                  <div className="lbl mute">Pekan</div>
                  <div className="sesi-week">{s.pekan}</div>
                </div>
                <div className="sesi-meta">
                  <div className="sesi-date">{formatTanggal(s.tanggal)}</div>
                  <div className="mute">{[s.lokasi, `${baris.length} pemain`].filter(Boolean).join(' · ')}</div>
                  {motm && <div className="lbl gold">MOTM · {motm}</div>}
                </div>
                <div className="sesi-goals">
                  <div className="disp">{gol}</div>
                  <div className="lbl mute">Gol</div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: SessionDetail** — `src/pages/SessionDetail.tsx`:

```tsx
import { Link, useParams } from 'react-router-dom'
import { useLeague } from '../components/Layout'
import { PlayerPhoto } from '../components/PlayerPhoto'
import { EmptyState, NotFound } from '../components/StatusStates'
import type { Hasil } from '../data/types'
import { formatAngka, formatTanggal } from '../lib/format'
import { barisSesi } from '../stats/compute'

const GRUP: { hasil: Hasil | null; judul: string }[] = [
  { hasil: 'M', judul: 'Menang' },
  { hasil: 'S', judul: 'Seri' },
  { hasil: 'K', judul: 'Kalah' },
  { hasil: null, judul: 'Hasil belum dicatat' },
]

export default function SessionDetail() {
  const { id } = useParams()
  const data = useLeague()
  const sesi = data.sesi.find((s) => s.id === id)
  if (!sesi) return <NotFound pesan="Sesi tidak ditemukan." />

  const baris = barisSesi(data, sesi.id)
  const gol = baris.reduce((n, b) => n + b.baris.gol, 0)
  const assist = baris.reduce((n, b) => n + b.baris.assist, 0)

  return (
    <div className="wrap">
      <Link to="/sesi" className="lbl mute back">
        ← Semua sesi
      </Link>
      <div className="lbl gold">
        {formatTanggal(sesi.tanggal)}
        {sesi.lokasi && ` · ${sesi.lokasi}`}
      </div>
      <h1 className="disp page-title">Pekan {sesi.pekan}</h1>
      {sesi.catatan && <p className="note">{sesi.catatan}</p>}
      <div className="band">
        <div>
          <span className="lbl">Pemain</span>
          <span className="disp">{baris.length}</span>
        </div>
        <div>
          <span className="lbl">Gol</span>
          <span className="disp">{gol}</span>
        </div>
        <div>
          <span className="lbl">Assist</span>
          <span className="disp">{assist}</span>
        </div>
      </div>
      {baris.length === 0 ? (
        <EmptyState judul="Belum ada statistik" pesan="Admin belum mengisi tab Statistik untuk sesi ini." />
      ) : (
        GRUP.map((g) => {
          const isi = baris.filter((b) => b.baris.hasil === g.hasil)
          if (isi.length === 0) return null
          return (
            <section key={g.judul} className="block">
              <div className="sec-head">
                <h2 className="disp">{g.judul}</h2>
                <span className="lbl mute">{isi.length} pemain</span>
              </div>
              <div className="lb-list">
                {isi.map((b) => (
                  <Link key={b.pemain.id} className="lb-row no-rank" to={`/pemain/${b.pemain.id}`}>
                    <PlayerPhoto pemain={b.pemain} size="sm" />
                    <div>
                      <div className="lb-name">
                        {b.pemain.nama}
                        {b.baris.motm && <span className="badge-motm">MOTM</span>}
                      </div>
                      <div className="lb-pos">
                        {[b.pemain.posisi, b.baris.gol ? `${b.baris.gol} gol` : null, b.baris.assist ? `${b.baris.assist} assist` : null]
                          .filter(Boolean)
                          .join(' · ')}
                      </div>
                    </div>
                    <span className="lb-val" title="Poin sesi ini">
                      {formatAngka(b.poin)}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )
        })
      )}
    </div>
  )
}
```

- [ ] **Step 3: Routes** — add imports and `<Route path="sesi" element={<Sessions />} />`, `<Route path="sesi/:id" element={<SessionDetail />} />`.

- [ ] **Step 4: Verify** — build passes; `/sesi` lists Pekan 4→1 with gol totals 4/4/2/4; `/sesi/S003` shows note "Hujan deras babak kedua", groups Menang/Kalah, Dimas with MOTM badge; `/sesi/S999` shows "Offside."

- [ ] **Step 5: Commit**

```bash
git add src
git commit -m "feat: add session archive and session detail pages"
```

---

### Task 10: Deploy config, admin docs, and final verification

**Files:**
- Create: `vercel.json`, `public/_redirects`, `.env.example`, `SETUP-SHEETS.md`, `README.md`

- [ ] **Step 1: Deploy config**

`vercel.json`:
```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

`public/_redirects` (Netlify):
```
/*  /index.html  200
```

`.env.example`:
```
# Link CSV dari Google Sheets: File → Bagikan → Publikasikan ke web → pilih tab → CSV.
# Kosongkan untuk memakai data contoh di sheet-template/.
VITE_SHEET_PEMAIN_URL=
VITE_SHEET_SESI_URL=
VITE_SHEET_STATISTIK_URL=
VITE_SHEET_POIN_URL=
```

- [ ] **Step 2: `SETUP-SHEETS.md`** — panduan admin berbahasa Indonesia: (1) buat Google Sheet baru, buat 4 tab bernama Pemain/Sesi/Statistik/Poin, import tiap CSV dari `sheet-template/` (File → Impor → Upload → "Ganti sheet saat ini"); (2) format kolom `tanggal` sebagai teks biasa `YYYY-MM-DD` (Format → Angka → Teks biasa), atau biarkan format tanggal Indonesia DD/MM/YYYY yang juga diterima; (3) dropdown: Data → Validasi data — `posisi` daftar GK,DEF,MID,FWD; `hasil` daftar M,S,K; `motm` kotak centang atau 0/1; `pemain_id` & `sesi_id` dropdown dari rentang `Pemain!A2:A` & `Sesi!A2:A`; (4) aturan isi: satu baris per pemain yang hadir per sesi, `hasil` = hasil keseluruhan sesi, `foto_url` link gambar publik (mis. dari Google Drive dengan akses "Siapa saja yang memiliki link" atau imgur), `aktif` FALSE untuk menyembunyikan pemain; (5) publish: File → Bagikan → Publikasikan ke web → pilih tab → CSV → salin link, ulangi untuk 4 tab; (6) isi 4 link ke Environment Variables di Vercel lalu Redeploy (sekali saja); (7) catatan: perubahan muncul ±5 menit kemudian karena cache Google; baris dengan ID salah otomatis dilewati.

- [ ] **Step 3: `README.md`** — singkat: deskripsi, `npm install`, `npm run dev`, `npm test`, `npm run build`, deploy ke Vercel (import repo, framework Vite, isi env var), link ke `SETUP-SHEETS.md`.

- [ ] **Step 4: Full verification**

Run: `npm test && npm run build`
Expected: all tests PASS, build succeeds.

Then `npm run preview` and screenshot at 375px and 1280px wide (Chrome headless `--screenshot --window-size=375,2000 --virtual-time-budget=5000`) for `/`, `/statistik`, `/pemain`, `/pemain/P01`, `/sesi`, `/sesi/S003`. Check: no horizontal page scroll, fonts load, gold only accent, logo glow on home.

- [ ] **Step 5: Commit**

```bash
git add vercel.json public/_redirects .env.example SETUP-SHEETS.md README.md
git commit -m "docs: add deploy config and Google Sheets setup guide"
```

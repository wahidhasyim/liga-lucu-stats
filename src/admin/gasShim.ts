// Tiruan in-memory sebagian kecil API Google Apps Script, cukup untuk menjalankan apps-script/Code.gs
// di unit test dan di mode development. Bukan untuk produksi.

type Sel = string | number | boolean | Date
type Grid = Sel[][]

class Sheet {
  constructor(
    readonly name: string,
    public grid: Grid,
  ) {}
  getLastRow(): number {
    for (let r = this.grid.length - 1; r >= 0; r--) if (this.grid[r].some((c) => c !== '')) return r + 1
    return 0
  }
  getLastColumn(): number {
    return this.grid.reduce((m, row) => {
      for (let c = row.length - 1; c >= 0; c--) if (row[c] !== '') return Math.max(m, c + 1)
      return m
    }, 0)
  }
  getDataRange(): Range {
    return new Range(this, 1, 1, Math.max(this.getLastRow(), 1), Math.max(this.getLastColumn(), 1))
  }
  getRange(row: number, col: number, numRows = 1, numCols = 1): Range {
    return new Range(this, row, col, numRows, numCols)
  }
  sel(r: number, c: number): Sel {
    return this.grid[r]?.[c] ?? ''
  }
  set(r: number, c: number, v: Sel) {
    while (this.grid.length <= r) this.grid.push([])
    const row = this.grid[r]
    while (row.length <= c) row.push('')
    row[c] = v
  }
}

class Range {
  constructor(
    private sheet: Sheet,
    private row: number,
    private col: number,
    private numRows: number,
    private numCols: number,
  ) {}
  getValues(): Grid {
    return Array.from({ length: this.numRows }, (_, i) => Array.from({ length: this.numCols }, (_, j) => this.sheet.sel(this.row - 1 + i, this.col - 1 + j)))
  }
  setValues(values: Grid): Range {
    if (values.length !== this.numRows || values.some((r) => r.length !== this.numCols)) throw new Error('Ukuran data tidak cocok dengan range')
    values.forEach((r, i) => r.forEach((v, j) => this.sheet.set(this.row - 1 + i, this.col - 1 + j, v)))
    return this
  }
  clearContent(): Range {
    for (let i = 0; i < this.numRows; i++) for (let j = 0; j < this.numCols; j++) this.sheet.set(this.row - 1 + i, this.col - 1 + j, '')
    return this
  }
  setNumberFormat(): Range {
    return this
  }
}

export interface GasShim {
  globals: Record<string, unknown>
  sheets: Map<string, Sheet>
}

export function buatGas(isi: Record<string, Grid>, props: Record<string, string>): GasShim {
  const sheets = new Map(Object.entries(isi).map(([name, grid]) => [name, new Sheet(name, grid.map((r) => [...r]))]))
  const cache = new Map<string, string>()
  const ss = {
    getSheetByName: (name: string) => sheets.get(name) ?? null,
    insertSheet: (name: string) => {
      const s = new Sheet(name, [])
      sheets.set(name, s)
      return s
    },
  }
  const globals = {
    SpreadsheetApp: { getActiveSpreadsheet: () => ss },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k: string) => props[k] ?? null, setProperty: (k: string, v: string) => void (props[k] = v) }) },
    CacheService: { getScriptCache: () => ({ get: (k: string) => cache.get(k) ?? null, put: (k: string, v: string) => void cache.set(k, v), remove: (k: string) => void cache.delete(k) }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    ContentService: {
      MimeType: { JSON: 'application/json' },
      createTextOutput: (s: string) => ({ setMimeType: () => ({ getContent: () => s }) }),
    },
    Utilities: {
      formatDate: (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
    },
    Session: { getScriptTimeZone: () => 'Asia/Jakarta' },
  }
  return { globals, sheets }
}

type Keluaran = { getContent(): string }
export interface Script {
  doPost: (e: { postData: { contents: string } }) => Keluaran
  doGet: () => Keluaran
}

// Menjalankan teks Code.gs dengan global tiruan dan mengembalikan entry point-nya.
export function muatScript(kode: string, globals: Record<string, unknown>): Script {
  const nama = Object.keys(globals)
  return new Function(...nama, `${kode}\nreturn { doPost, doGet }`)(...nama.map((n) => globals[n])) as Script
}

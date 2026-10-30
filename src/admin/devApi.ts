// Mode development tanpa URL API: Code.gs dijalankan di browser di atas Spreadsheet tiruan
// yang diisi data contoh. Perubahan hilang saat halaman dimuat ulang. PIN: 1234.
import Papa from 'papaparse'
import kode from '../../apps-script/Code.gs?raw'
import { SAMPLE, TABEL } from '../data/sheets'
import { buatGas, muatScript } from './gasShim'

const NAMA_TAB = { pemain: 'Pemain', sesi: 'Sesi', statistik: 'Statistik', laga: 'Laga', poin: 'Poin' }

export async function buatDevTransport() {
  const isi: Record<string, string[][]> = {}
  for (const t of TABEL) isi[NAMA_TAB[t]] = Papa.parse<string[]>(await SAMPLE[t](), { skipEmptyLines: 'greedy' }).data
  const { doPost } = muatScript(kode, buatGas(isi, { ADMIN_PIN: '1234' }).globals)
  return async (body: string) => {
    // jeda kecil meniru jaringan, supaya status "menyimpan" ikut teruji
    await new Promise((r) => setTimeout(r, 300))
    return JSON.parse(doPost({ postData: { contents: body } }).getContent())
  }
}

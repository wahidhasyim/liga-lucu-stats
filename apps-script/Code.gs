/**
 * Liga Lucu Depok: API halaman admin.
 *
 * GET  → data semua tab untuk web publik (tanpa PIN; datanya memang publik). Di-cache 1 menit.
 * POST → aksi admin, wajib PIN. Body JSON: { pin, action, data }.
 *
 * Cara pasang ada di SETUP-SHEETS.md. Setelah deploy pertama, aksi "pasang" (tanpa PIN, hanya
 * berlaku selama ADMIN_PIN belum ada) menyiapkan header semua tab dan menyimpan PIN admin.
 */

const TAB = { pemain: 'Pemain', sesi: 'Sesi', statistik: 'Statistik', laga: 'Laga', poin: 'Poin' }

// Kolom wajib tiap tab. Kolom yang belum ada ditambahkan di ujung kanan.
const KOLOM = {
  pemain: ['id', 'nama', 'panggilan', 'posisi', 'foto_url', 'aktif'],
  sesi: ['sesi_id', 'tanggal', 'lokasi', 'catatan'],
  statistik: ['sesi_id', 'pemain_id', 'tim', 'hasil', 'gol', 'assist', 'motm'],
  laga: ['sesi_id', 'tim_a', 'skor_a', 'skor_b', 'tim_b'],
  poin: ['aksi', 'poin'],
}

const KOLOM_ANGKA = ['gol', 'assist', 'motm', 'skor_a', 'skor_b', 'poin']
const POSISI = ['GK', 'DEF', 'MID', 'FWD']
const MAKS_GAGAL = 10
const POIN_AWAL = [
  ['hadir', 1],
  ['gol', 3],
  ['assist', 2],
  ['motm', 5],
  ['menang', 1],
  ['seri', 0.5],
]
const KUNCI_CACHE = 'data_publik'

function doGet() {
  const cache = CacheService.getScriptCache()
  let isi = cache.get(KUNCI_CACHE)
  if (!isi) {
    isi = JSON.stringify({ ok: true, data: bacaSemua() })
    // nilai cache maksimal 100 KB; data yang lebih besar dibaca langsung setiap kali
    try {
      cache.put(KUNCI_CACHE, isi, 60)
    } catch (err) {}
  }
  return ContentService.createTextOutput(isi).setMimeType(ContentService.MimeType.JSON)
}

function doPost(e) {
  let req
  try {
    req = JSON.parse(e.postData.contents)
  } catch (err) {
    return balas({ ok: false, error: 'Request tidak valid.' })
  }
  if (req.action === 'pasang') return balas(pasang(String(req.pin || '')))
  const salahPin = cekPin(String(req.pin || ''))
  if (salahPin) return balas({ ok: false, error: salahPin })
  const aksi = AKSI[req.action]
  if (!aksi) return balas({ ok: false, error: `Aksi "${req.action}" tidak dikenal.` })

  const lock = LockService.getScriptLock()
  lock.waitLock(20000)
  try {
    const hasil = aksi(req.data || {})
    CacheService.getScriptCache().remove(KUNCI_CACHE)
    return balas({ ok: true, hasil, data: bacaSemua() })
  } catch (err) {
    return balas({ ok: false, error: err.message })
  } finally {
    lock.releaseLock()
  }
}

function balas(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON)
}

function cekPin(pin) {
  const benar = PropertiesService.getScriptProperties().getProperty('ADMIN_PIN')
  if (!benar) return 'ADMIN_PIN belum diatur di Script properties.'
  const cache = CacheService.getScriptCache()
  const gagal = Number(cache.get('pin_gagal') || 0)
  if (gagal >= MAKS_GAGAL) return 'Terlalu banyak PIN salah. Coba lagi 10 menit lagi.'
  if (pin !== benar) {
    cache.put('pin_gagal', String(gagal + 1), 600)
    return 'PIN salah.'
  }
  return null
}

// Sekali jalan setelah deploy pertama: siapkan semua tab dan simpan PIN admin.
function pasang(pin) {
  const props = PropertiesService.getScriptProperties()
  if (props.getProperty('ADMIN_PIN')) return { ok: false, error: 'Sudah terpasang. Ganti PIN lewat Script properties.' }
  if (!/^\S{4,}$/.test(pin)) return { ok: false, error: 'PIN minimal 4 karakter tanpa spasi.' }
  const lock = LockService.getScriptLock()
  lock.waitLock(20000)
  try {
    Object.keys(TAB).forEach((nama) => tabel(nama))
    const poin = tabel('poin')
    if (poin.rows.length === 0) {
      poin.rows = POIN_AWAL.map(([aksi, nilai]) => ({ aksi, poin: nilai }))
      tulis(poin)
    }
    props.setProperty('ADMIN_PIN', pin)
    return { ok: true, data: bacaSemua() }
  } finally {
    lock.releaseLock()
  }
}

const AKSI = {
  baca() {
    return null
  },

  simpanPemain(d) {
    const t = tabel('pemain')
    const nama = teks(d.nama)
    if (!nama) throw new Error('Nama pemain wajib diisi.')
    let row = null
    if (d.id) {
      row = t.rows.find((r) => r.id === d.id)
      if (!row) throw new Error(`Pemain ${d.id} tidak ditemukan.`)
    } else {
      row = { id: idBaru('P', t.rows.map((r) => r.id), 2) }
      t.rows.push(row)
    }
    const posisi = teks(d.posisi).toUpperCase()
    Object.assign(row, {
      nama,
      panggilan: teks(d.panggilan),
      posisi: POSISI.indexOf(posisi) >= 0 ? posisi : 'MID',
      foto_url: teks(d.fotoUrl),
      aktif: d.aktif === false ? 'FALSE' : 'TRUE',
    })
    tulis(t)
    return { id: row.id }
  },

  simpanSesi(d) {
    const tanggal = teks(d.tanggal)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) throw new Error('Tanggal sesi wajib diisi.')
    const lineup = Array.isArray(d.lineup) ? d.lineup : []
    if (lineup.length === 0) throw new Error('Pilih minimal satu pemain yang hadir.')
    // Pemain baru dari form sesi ({ baru: { nama, posisi } }) didaftarkan ke tab Pemain sekaligus.
    const pemain = tabel('pemain')
    const pemainBaru = []
    lineup.forEach((l) => {
      if (!teks(l.tim)) throw new Error('Semua pemain yang hadir harus punya tim.')
      if (l.baru) {
        const nama = teks(l.baru.nama)
        if (!nama) throw new Error('Nama pemain baru wajib diisi.')
        const posisi = teks(l.baru.posisi).toUpperCase()
        l.pemainId = idBaru('P', pemain.rows.map((r) => r.id), 2)
        pemain.rows.push({ id: l.pemainId, nama, panggilan: '', posisi: POSISI.indexOf(posisi) >= 0 ? posisi : 'MID', foto_url: '', aktif: 'TRUE' })
        pemainBaru.push(l.pemainId)
      } else if (!pemain.rows.some((r) => r.id === l.pemainId)) {
        throw new Error(`Pemain ${l.pemainId} tidak dikenal.`)
      }
    })

    const sesi = tabel('sesi')
    let row = null
    if (d.id) {
      row = sesi.rows.find((r) => r.sesi_id === d.id)
      if (!row) throw new Error(`Sesi ${d.id} tidak ditemukan.`)
    } else {
      row = { sesi_id: idBaru('S', sesi.rows.map((r) => r.sesi_id), 3) }
      sesi.rows.push(row)
    }
    Object.assign(row, { tanggal, lokasi: teks(d.lokasi), catatan: teks(d.catatan) })
    const id = row.sesi_id

    // Ganti baris Statistik sesi ini; gol/assist/MOTM pemain yang tetap hadir dipertahankan.
    const stat = tabel('statistik')
    const lama = {}
    stat.rows.filter((r) => r.sesi_id === id).forEach((r) => (lama[r.pemain_id] = r))
    stat.rows = stat.rows
      .filter((r) => r.sesi_id !== id)
      .concat(lineup.map((l) => Object.assign({ hasil: '', gol: 0, assist: 0, motm: 0 }, lama[l.pemainId] || {}, { sesi_id: id, pemain_id: l.pemainId, tim: teks(l.tim) })))

    // Laga yang timnya sudah tidak ada di line-up tidak bisa dipakai lagi.
    const timAda = lineup.map((l) => kunciTim(l.tim))
    const laga = tabel('laga')
    laga.rows = laga.rows.filter((r) => r.sesi_id !== id || (timAda.indexOf(kunciTim(r.tim_a)) >= 0 && timAda.indexOf(kunciTim(r.tim_b)) >= 0))

    if (pemainBaru.length) tulis(pemain)
    tulis(sesi)
    tulis(stat)
    tulis(laga)
    return { id, pemainBaru }
  },

  simpanHasil(d) {
    const sesiId = teks(d.sesiId)
    if (!tabel('sesi').rows.some((r) => r.sesi_id === sesiId)) throw new Error(`Sesi ${sesiId} tidak ditemukan.`)
    const stat = tabel('statistik')
    const barisSesi = stat.rows.filter((r) => r.sesi_id === sesiId)
    const timAda = barisSesi.map((r) => kunciTim(r.tim))

    const lagaBaru = (Array.isArray(d.laga) ? d.laga : []).map((l, i) => {
      const timA = teks(l.timA)
      const timB = teks(l.timB)
      if (timAda.indexOf(kunciTim(timA)) < 0 || timAda.indexOf(kunciTim(timB)) < 0) throw new Error(`Laga ${i + 1}: tim tidak ada di line-up sesi ini.`)
      if (kunciTim(timA) === kunciTim(timB)) throw new Error(`Laga ${i + 1}: tim tidak boleh melawan dirinya sendiri.`)
      return { sesi_id: sesiId, tim_a: timA, skor_a: skor(l.skorA, i), skor_b: skor(l.skorB, i), tim_b: timB }
    })

    const perPemain = {}
    barisSesi.forEach((r) => (perPemain[r.pemain_id] = r))
    ;(Array.isArray(d.statistik) ? d.statistik : []).forEach((s) => {
      const r = perPemain[s.pemainId]
      if (!r) throw new Error(`Pemain ${s.pemainId} tidak ada di line-up sesi ini.`)
      r.gol = jumlah(s.gol)
      r.assist = jumlah(s.assist)
      r.motm = s.motm ? 1 : 0
    })

    const laga = tabel('laga')
    laga.rows = laga.rows.filter((r) => r.sesi_id !== sesiId).concat(lagaBaru)
    tulis(laga)
    tulis(stat)
    return { sesiId }
  },

  hapusSesi(d) {
    const id = teks(d.id)
    const sesi = tabel('sesi')
    if (!sesi.rows.some((r) => r.sesi_id === id)) throw new Error(`Sesi ${id} tidak ditemukan.`)
    ;['sesi', 'statistik', 'laga'].forEach((nama) => {
      const t = nama === 'sesi' ? sesi : tabel(nama)
      t.rows = t.rows.filter((r) => r.sesi_id !== id)
      tulis(t)
    })
    return { id }
  },
}

// ---------- akses tab ----------

function tabel(nama) {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  const sheet = ss.getSheetByName(TAB[nama]) || ss.insertSheet(TAB[nama])
  const values = sheet.getDataRange().getValues()
  let header = values[0].map((h) => String(h).trim().toLowerCase())
  if (header.length === 1 && header[0] === '') header = []
  const kurang = KOLOM[nama].filter((k) => header.indexOf(k) < 0)
  if (kurang.length) {
    sheet.getRange(1, header.length + 1, 1, kurang.length).setValues([kurang])
    header = header.concat(kurang)
  }
  const rows = values
    .slice(1)
    .filter((r) => r.some((c) => c !== '' && c !== null))
    .map((r) => {
      const o = {}
      header.forEach((h, i) => (o[h] = keTeks(r[i])))
      return o
    })
  return { sheet, header, rows }
}

// Menulis ulang seluruh isi tab (header + baris). Validasi data/dropdown di sel tidak ikut terhapus.
function tulis(t) {
  const lama = t.sheet.getLastRow()
  if (lama > 1) t.sheet.getRange(2, 1, lama - 1, Math.max(t.sheet.getLastColumn(), t.header.length)).clearContent()
  if (t.rows.length === 0) return
  const iTanggal = t.header.indexOf('tanggal')
  if (iTanggal >= 0) t.sheet.getRange(2, iTanggal + 1, t.rows.length, 1).setNumberFormat('@')
  const values = t.rows.map((o) => t.header.map((h) => keSel(h, o[h])))
  t.sheet.getRange(2, 1, values.length, t.header.length).setValues(values)
}

function bacaSemua() {
  const out = {}
  Object.keys(TAB).forEach((nama) => (out[nama] = tabel(nama).rows))
  return out
}

// ---------- konversi nilai ----------

function keTeks(v) {
  if (v === null || v === undefined) return ''
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd')
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE'
  return String(v).trim()
}

function keSel(kolom, v) {
  const s = v === null || v === undefined ? '' : String(v)
  if (KOLOM_ANGKA.indexOf(kolom) >= 0 && s !== '') return Number(s)
  return s
}

function teks(v) {
  return v === null || v === undefined ? '' : String(v).trim().replace(/\s+/g, ' ')
}

function kunciTim(nama) {
  return teks(nama).toLowerCase()
}

function jumlah(v) {
  const n = Math.floor(Number(v))
  return Number.isFinite(n) && n > 0 ? n : 0
}

function skor(v, i) {
  const s = teks(v)
  if (s === '') return ''
  if (!/^\d+$/.test(s)) throw new Error(`Laga ${i + 1}: skor "${s}" tidak valid.`)
  return Number(s)
}

function idBaru(awalan, ids, digit) {
  const maks = ids.reduce((m, id) => {
    const cocok = new RegExp(`^${awalan}(\\d+)$`).exec(String(id))
    return cocok ? Math.max(m, Number(cocok[1])) : m
  }, 0)
  return awalan + String(maks + 1).padStart(digit, '0')
}

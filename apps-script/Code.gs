/**
 * Liga Lucu Depok: API halaman admin.
 *
 * Cara pasang (sekali saja, lihat SETUP-SHEETS.md):
 * 1. Di Google Sheet data liga, buka Ekstensi → Apps Script, hapus isi Code.gs, tempel file ini, simpan.
 * 2. Project Settings (ikon gear) → Script properties → tambahkan ADMIN_PIN berisi PIN admin.
 * 3. Deploy → New deployment → Web app. Execute as: Me. Who has access: Anyone. Salin URL-nya.
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

const KOLOM_ANGKA = ['gol', 'assist', 'motm', 'skor_a', 'skor_b']
const POSISI = ['GK', 'DEF', 'MID', 'FWD']
const MAKS_GAGAL = 10

function doPost(e) {
  let req
  try {
    req = JSON.parse(e.postData.contents)
  } catch (err) {
    return balas({ ok: false, error: 'Request tidak valid.' })
  }
  const salahPin = cekPin(String(req.pin || ''))
  if (salahPin) return balas({ ok: false, error: salahPin })
  const aksi = AKSI[req.action]
  if (!aksi) return balas({ ok: false, error: `Aksi "${req.action}" tidak dikenal.` })

  const lock = LockService.getScriptLock()
  lock.waitLock(20000)
  try {
    const hasil = aksi(req.data || {})
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
    const pemainIds = tabel('pemain').rows.map((r) => r.id)
    lineup.forEach((l) => {
      if (pemainIds.indexOf(l.pemainId) < 0) throw new Error(`Pemain ${l.pemainId} tidak dikenal.`)
      if (!teks(l.tim)) throw new Error('Semua pemain yang hadir harus punya tim.')
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

    tulis(sesi)
    tulis(stat)
    tulis(laga)
    return { id }
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

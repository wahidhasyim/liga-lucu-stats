import { EMAS, slug, warnaTim } from './warnaTim'

// Gambar line-up untuk Instagram, digambar langsung di canvas supaya ukurannya pasti:
// story 9:16 (1080×1920) dan feed 4:5 (1080×1350), satu foto per tim plus satu foto jadwal laga.

export interface TimGambar {
  nama: string
  warna: string
  pemain: { nama: string; kiper: boolean }[]
}

export interface DataGambar {
  pekan: number
  tanggal: string // sudah diformat, misal "Minggu, 8 Nov 2026"
  info: string // lokasi · catatan
  tim: TimGambar[]
  jadwal: { timA: string; timB: string; jam?: string }[]
  jadwalOtomatis: boolean // jadwal belum disimpan admin, hasil acak urutan round robin
}

const W = 1080
const BG = '#070707'
const INK = '#f4f1ea'
const MUTE = '#8a8578'
const DISP = '"Bebas Neue", "Arial Narrow", sans-serif'
const BODY = 'Montserrat, system-ui, sans-serif'
const WEB = 'LIGALUCUDEPOK.WEB.APP'

let logo: Promise<HTMLImageElement> | null = null

// Font dan logo harus siap sebelum menggambar, kalau tidak canvas memakai font cadangan.
function siapkan(): Promise<HTMLImageElement> {
  logo ??= (async () => {
    await Promise.all([`100px "Bebas Neue"`, `500 40px Montserrat`, `600 40px Montserrat`, `700 40px Montserrat`].map((f) => document.fonts.load(f)))
    const img = new Image(512, 512)
    img.src = '/logo.svg'
    await img.decode()
    return img
  })()
  return logo
}

type Ctx = CanvasRenderingContext2D

interface Gaya {
  font: string
  warna?: string
  rata?: CanvasTextAlign
  jarak?: number // letter-spacing dalam px
  maks?: number // lebar maksimal; teks dipotong dengan "…"
}

function tulis(ctx: Ctx, teks: string, x: number, y: number, { font, warna = INK, rata = 'left', jarak = 0, maks }: Gaya) {
  ctx.font = font
  ctx.fillStyle = warna
  ctx.textAlign = rata
  ctx.textBaseline = 'alphabetic'
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${jarak}px`
  let t = teks
  if (maks) while (t.length > 1 && ctx.measureText(t).width > maks) t = `${t.slice(0, -2).trimEnd()}…`
  ctx.fillText(t, x, y)
  return ctx.measureText(t).width
}

// Ukuran huruf terbesar (≤ maks) yang membuat teks muat di lebar tertentu.
function hurufPas(ctx: Ctx, teks: string, keluarga: string, maks: number, lebar: number) {
  let ukuran = maks
  ctx.font = `${ukuran}px ${keluarga}`
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px'
  while (ukuran > 20 && ctx.measureText(teks).width > lebar) ctx.font = `${--ukuran}px ${keluarga}`
  return ukuran
}

function kanvas(h: number): [HTMLCanvasElement, Ctx] {
  const cv = document.createElement('canvas')
  cv.width = W
  cv.height = h
  const ctx = cv.getContext('2d')!
  ctx.fillStyle = BG
  ctx.fillRect(0, 0, W, h)
  // pendaran emas di atas, seperti di web
  const glow = ctx.createRadialGradient(W / 2, 0, 0, W / 2, 0, h * 0.55)
  glow.addColorStop(0, 'rgba(201, 162, 77, 0.26)')
  glow.addColorStop(1, 'rgba(201, 162, 77, 0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, W, h)
  return [cv, ctx]
}

function kotak(ctx: Ctx, x: number, y: number, w: number, h: number, warna: string) {
  ctx.fillStyle = warna
  ctx.fillRect(x, y, w, h)
}

function badgeGk(ctx: Ctx, kanan: number, y: number, ukuran: number) {
  ctx.font = `700 ${Math.round(ukuran * 0.55)}px ${BODY}`
  if ('letterSpacing' in ctx) ctx.letterSpacing = '2px'
  const w = ctx.measureText('GK').width + ukuran * 0.5
  const h = ukuran * 0.85
  kotak(ctx, kanan - w, y - h * 0.8, w, h, EMAS)
  tulis(ctx, 'GK', kanan - w / 2, y - h * 0.8 + h * 0.72, { font: `700 ${Math.round(ukuran * 0.55)}px ${BODY}`, warna: BG, rata: 'center', jarak: 2 })
  return w
}

// Daftar pemain bernomor di dalam kotak; tinggi baris dan huruf menyesuaikan jumlah pemain.
function daftarPemain(ctx: Ctx, tim: TimGambar, x: number, y: number, w: number, tinggi: number, maksHuruf: number, nomorDisp: boolean) {
  const n = Math.max(tim.pemain.length, 1)
  const baris = Math.min(maksHuruf * 1.75, tinggi / n)
  const huruf = Math.min(maksHuruf, Math.floor(baris * 0.58))
  const kolomNo = huruf * 1.4
  tim.pemain.forEach((p, i) => {
    const dasar = y + baris * i + baris * 0.68
    if (nomorDisp) tulis(ctx, String(i + 1), x, dasar, { font: `${Math.round(huruf * 1.15)}px ${DISP}`, warna: tim.warna })
    else tulis(ctx, String(i + 1), x + kolomNo * 0.7, dasar, { font: `700 ${Math.round(huruf * 0.62)}px ${BODY}`, warna: MUTE, rata: 'right' })
    const gk = p.kiper ? badgeGk(ctx, x + w, dasar, huruf) + huruf * 0.4 : 0
    tulis(ctx, p.nama, x + kolomNo, dasar, { font: `600 ${huruf}px ${BODY}`, maks: w - kolomNo - gk })
    if (i < tim.pemain.length - 1) kotak(ctx, x, y + baris * (i + 1), w, 2, 'rgba(255, 255, 255, 0.07)')
  })
}

const keBlob = (cv: HTMLCanvasElement) => new Promise<Blob>((ok, gagal) => cv.toBlob((b) => (b ? ok(b) : gagal(new Error('Gagal membuat gambar.'))), 'image/png'))

export async function gambarStory(d: DataGambar): Promise<File> {
  const img = await siapkan()
  const H = 1920
  const [cv, ctx] = kanvas(H)
  ctx.drawImage(img, W / 2 - 80, 100, 160, 160)
  tulis(ctx, 'LIGA LUCU DEPOK · LINE-UP', W / 2, 330, { font: `700 30px ${BODY}`, warna: EMAS, rata: 'center', jarak: 8 })
  tulis(ctx, `PEKAN ${d.pekan}`, W / 2, 540, { font: `230px ${DISP}`, rata: 'center', jarak: 2 })
  tulis(ctx, d.tanggal.toUpperCase(), W / 2, 610, { font: `700 34px ${BODY}`, warna: EMAS, rata: 'center', jarak: 5 })
  if (d.info) tulis(ctx, d.info, W / 2, 662, { font: `500 34px ${BODY}`, rata: 'center', maks: W - 120 })
  const total = d.tim.reduce((n, t) => n + t.pemain.length, 0)
  tulis(ctx, `${total} PEMAIN · ${d.tim.length} TIM`, W / 2, 714, { font: `700 26px ${BODY}`, warna: MUTE, rata: 'center', jarak: 7 })

  const kolom = d.tim.length === 1 ? 1 : 2
  const barisTim = Math.ceil(d.tim.length / kolom)
  const tepi = 56
  const jarak = 24
  const atas = 770
  const bawah = 1790
  const kartuW = (W - tepi * 2 - jarak * (kolom - 1)) / kolom
  const kartuH = (bawah - atas - jarak * (barisTim - 1)) / barisTim
  const maksPemain = Math.max(...d.tim.map((t) => t.pemain.length), 1)
  d.tim.forEach((t, i) => {
    const x = tepi + (i % kolom) * (kartuW + jarak)
    const y = atas + Math.floor(i / kolom) * (kartuH + jarak)
    kotak(ctx, x, y, kartuW, kartuH, 'rgba(255, 255, 255, 0.045)')
    kotak(ctx, x, y, kartuW, 8, t.warna)
    const pad = 26
    const judul = Math.min(64, kartuH * 0.2)
    tulis(ctx, String(t.pemain.length), x + kartuW - pad, y + 24 + judul * 0.9, { font: `${judul}px ${DISP}`, warna: t.warna, rata: 'right' })
    tulis(ctx, t.nama.toUpperCase(), x + pad, y + 24 + judul * 0.9, { font: `${judul}px ${DISP}`, jarak: 1, maks: kartuW - pad * 2 - judul })
    const isiAtas = y + 40 + judul
    // tinggi baris sama untuk semua tim, supaya kartu terlihat rapi berdampingan
    const tinggi = ((kartuH - (isiAtas - y) - 18) / maksPemain) * t.pemain.length
    daftarPemain(ctx, t, x + pad, isiAtas, kartuW - pad * 2, tinggi, 36, false)
  })
  tulis(ctx, WEB, W / 2, 1862, { font: `700 26px ${BODY}`, warna: MUTE, rata: 'center', jarak: 8 })
  return new File([await keBlob(cv)], `liga-lucu-pekan-${d.pekan}-story.png`, { type: 'image/png' })
}

// Kerangka satu foto feed: garis warna, logo, nomor urut foto, judul besar, dan footer tanggal. Mengembalikan posisi y di bawah judul.
function kerangkaFeed(ctx: Ctx, img: HTMLImageElement, d: DataGambar, warna: string, label: string, ke: number, dari: number, judul: string, sub: string) {
  kotak(ctx, 0, 0, W, 16, warna)
  ctx.drawImage(img, 70, 66, 96, 96)
  tulis(ctx, 'LIGA LUCU DEPOK', 190, 108, { font: `700 28px ${BODY}`, jarak: 6 })
  tulis(ctx, `PEKAN ${d.pekan} · ${label}`, 190, 148, { font: `700 26px ${BODY}`, warna: EMAS, jarak: 6 })
  tulis(ctx, `${ke}/${dari}`, W - 70, 108, { font: `56px ${DISP}`, warna: MUTE, rata: 'right' })

  const nama = judul.toUpperCase()
  const ukuran = hurufPas(ctx, nama, DISP, 190, W - 140)
  tulis(ctx, nama, 70, 260 + ukuran * 0.85, { font: `${ukuran}px ${DISP}` })
  const garis = 260 + ukuran * 0.85 + 28
  kotak(ctx, 70, garis, 220, 12, warna)
  tulis(ctx, sub, 70, garis + 70, { font: `700 28px ${BODY}`, warna: MUTE, jarak: 7 })

  kotak(ctx, 70, 1206, W - 140, 2, 'rgba(255, 255, 255, 0.12)')
  const lebarWeb = tulis(ctx, WEB, W - 70, 1258, { font: `700 20px ${BODY}`, warna: EMAS, rata: 'right', jarak: 5 })
  tulis(ctx, d.tanggal, 70, 1258, { font: `600 26px ${BODY}`, maks: W - 140 - lebarWeb - 32 })
  if (d.info) tulis(ctx, d.info, 70, 1300, { font: `500 24px ${BODY}`, warna: MUTE, maks: W - 140 })
  return garis + 110
}

// Daftar laga bernomor (atau berjam, kalau jam diketahui): tim A rata kanan, "VS" di tengah, tim B rata kiri, masing-masing dengan kotak warna tim.
function daftarJadwal(ctx: Ctx, laga: DataGambar['jadwal'], y: number, tinggi: number) {
  const x = 70
  const w = W - 140
  const baris = Math.min(120, tinggi / Math.max(laga.length, 1))
  const berjam = laga.some((l) => l.jam)
  const kolomNo = berjam ? 120 : 64
  const tengah = x + kolomNo + (w - kolomNo) / 2
  const sisi = (w - kolomNo) / 2 - 70 // lebar nama tim + kotak warna
  const terpanjang = laga.flatMap((l) => [l.timA, l.timB]).reduce((a, b) => (b.length > a.length ? b : a), '').toUpperCase()
  const huruf = Math.min(Math.floor(baris * 0.55), hurufPas(ctx, terpanjang, DISP, 64, sisi - 40))
  const kotakW = Math.round(huruf * 0.42)
  laga.forEach((l, i) => {
    const dasar = y + baris * i + baris * 0.5 + huruf * 0.34
    tulis(ctx, l.jam ?? String(i + 1), x, dasar, { font: `${Math.round(huruf * 0.8)}px ${DISP}`, warna: EMAS })
    tulis(ctx, 'VS', tengah, dasar - huruf * 0.08, { font: `700 ${Math.round(huruf * 0.42)}px ${BODY}`, warna: MUTE, rata: 'center', jarak: 3 })
    const atasKotak = dasar - huruf * 0.34 - kotakW / 2 - huruf * 0.04
    kotak(ctx, tengah - 70 - kotakW, atasKotak, kotakW, kotakW, warnaTim(l.timA))
    tulis(ctx, l.timA.toUpperCase(), tengah - 70 - kotakW - 18, dasar, { font: `${huruf}px ${DISP}`, rata: 'right', jarak: 1, maks: sisi - kotakW - 18 })
    kotak(ctx, tengah + 70, atasKotak, kotakW, kotakW, warnaTim(l.timB))
    tulis(ctx, l.timB.toUpperCase(), tengah + 70 + kotakW + 18, dasar, { font: `${huruf}px ${DISP}`, jarak: 1, maks: sisi - kotakW - 18 })
    if (i < laga.length - 1) kotak(ctx, x, y + baris * (i + 1), w, 2, 'rgba(255, 255, 255, 0.07)')
  })
}

export async function gambarFeed(d: DataGambar): Promise<File[]> {
  const img = await siapkan()
  const H = 1350
  const hasil: File[] = []
  const dari = d.tim.length + (d.jadwal.length > 0 ? 1 : 0)
  for (const [i, t] of d.tim.entries()) {
    const [cv, ctx] = kanvas(H)
    const atas = kerangkaFeed(ctx, img, d, t.warna, 'LINE-UP', i + 1, dari, t.nama, `${t.pemain.length} PEMAIN`)
    daftarPemain(ctx, t, 70, atas, W - 140, 1180 - atas, 54, true)
    hasil.push(new File([await keBlob(cv)], `liga-lucu-pekan-${d.pekan}-${i + 1}-${slug(t.nama)}.png`, { type: 'image/png' }))
  }
  if (d.jadwal.length > 0) {
    const [cv, ctx] = kanvas(H)
    const sementara = [d.jadwalOtomatis && 'URUTAN', d.jadwal.some((l) => l.jam) && 'JAM'].filter(Boolean).join(' & ')
    const sub = `${d.jadwal.length} LAGA${sementara ? ` · ${sementara} SEMENTARA` : ''}`
    const atas = kerangkaFeed(ctx, img, d, EMAS, 'JADWAL', dari, dari, 'Jadwal laga', sub)
    daftarJadwal(ctx, d.jadwal, atas - 20, 1190 - atas)
    hasil.push(new File([await keBlob(cv)], `liga-lucu-pekan-${d.pekan}-${dari}-jadwal.png`, { type: 'image/png' }))
  }
  return hasil
}

// Bagikan lewat menu share HP; kalau tidak didukung (misalnya di laptop), gambar diunduh.
export async function bagikan(files: File[], judul: string): Promise<'dibagikan' | 'diunduh' | 'batal'> {
  if (navigator.canShare?.({ files })) {
    try {
      await navigator.share({ files, title: judul })
      return 'dibagikan'
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'batal'
    }
  }
  for (const f of files) {
    const url = URL.createObjectURL(f)
    const a = document.createElement('a')
    a.href = url
    a.download = f.name
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  }
  return 'diunduh'
}

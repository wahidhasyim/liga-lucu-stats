# Liga Lucu Depok — Website Statistik Pemain

**Tanggal:** 2026-10-26
**Status:** Disetujui per bagian, menunggu review spec

## Tujuan

Website statistik ala Transfermarkt untuk komunitas fun football Liga Lucu Depok, supaya komunitas terasa serius: leaderboard, profil pemain, dan arsip sesi mingguan.

**Konteks komunitas:** ±30 anggota aktif, main seminggu sekali, tim diacak tiap sesi (bukan tim tetap). Karena itu fokusnya statistik individu, tanpa klasemen tim.

**Kriteria sukses:**
- Admin bisa input satu sesi dalam ±5 menit lewat Google Sheets, tanpa sentuh kode.
- Data baru muncul di web tanpa deploy ulang (jeda maksimal ±5 menit dari cache Google).
- Nyaman dibuka di HP dari link grup WA.
- Biaya hosting Rp0.

## Di luar cakupan (YAGNI)

- Login atau panel admin di web.
- Klasemen tim, jadwal, dan statistik per game rotasi.
- Market value fiktif.
- Preview link (OG image) per pemain. Bisa dikerjakan nanti dengan upgrade ke Next.js tanpa mengubah sheet.
- Nomor punggung.

## Arsitektur

Web statis (SPA) yang membaca Google Sheets langsung dari browser.

```
Google Sheets (4 tab, "Publish to web" → CSV)
        │  fetch tiap halaman dibuka
        ▼
Browser: parse CSV → validasi → hitung statistik → render
        │
Hosting statis gratis (Vercel)
```

- **Stack:** Vite + React + TypeScript, React Router, PapaParse untuk CSV, Vitest untuk tes.
- **Konfigurasi:** URL CSV tiap tab disimpan di environment variable (`VITE_SHEET_PEMAIN_URL`, `VITE_SHEET_SESI_URL`, `VITE_SHEET_STATISTIK_URL`, `VITE_SHEET_POIN_URL`).
- **Routing:** BrowserRouter, dengan `vercel.json` rewrite ke `index.html`.
- **Data diambil sekali per kunjungan,** dicache di memori selama sesi browser, lalu dipakai bersama oleh semua halaman.

## Struktur Google Sheets

Satu file Sheets dengan 4 tab.

**`Pemain`**: `id`, `nama`, `panggilan`, `posisi` (GK/DEF/MID/FWD), `foto_url`, `aktif` (TRUE/FALSE)

**`Sesi`**: `sesi_id`, `tanggal` (YYYY-MM-DD), `lokasi`, `catatan`

**`Statistik`**: satu baris per pemain yang hadir per sesi, dengan kolom `sesi_id`, `pemain_id`, `hasil` (M/S/K), `gol`, `assist`, `motm` (0/1)
- Pemain dianggap hadir kalau punya baris di sesi itu.
- `hasil` adalah hasil keseluruhan pemain di sesi itu.

**`Poin`**: kolom `aksi` dan `poin`. Nilai default:

| aksi | poin |
|---|---|
| hadir | 1 |
| gol | 3 |
| assist | 2 |
| motm | 5 |
| menang | 2 |
| seri | 1 |

**Template:** proyek menyertakan file CSV contoh untuk keempat tab (`sheet-template/`) dan panduan `SETUP-SHEETS.md` yang menjelaskan cara import, membuat dropdown validasi (M/S/K, posisi, daftar ID pemain), dan cara publish ke CSV.

## Perhitungan statistik

Semua perhitungan berupa fungsi murni di `src/stats/`, dan semuanya dites.

Per pemain, untuk rentang waktu tertentu (semua waktu atau bulan ini):
- `hadir`, `gol`, `assist`, `motm`, `menang`, `seri`, `kalah`
- `winRate` = menang / hadir (0 kalau hadir = 0)
- `rating` = Σ (jumlah aksi × poin aksi dari tab Poin). Aksi yang tidak ada di tab Poin bernilai 0.
- `poinPerSesi` = rating / hadir
- `peringkat`: urut berdasarkan rating, lalu poinPerSesi, lalu gol, lalu nama (A–Z)
- `riwayat`: daftar per sesi berisi poin, hasil, gol, assist, dan MOTM, untuk grafik dan tabel riwayat

Leaderboard Topskor, Top Assist, dan MOTM diurutkan berdasarkan statistiknya masing-masing, dengan tie-breaker yang sama.

**Nomor pekan** = urutan sesi berdasarkan tanggal (sesi pertama = Pekan 1).

**Pemain non-aktif** (`aktif = FALSE`) disembunyikan dari leaderboard dan daftar pemain, tapi profil dan riwayatnya tetap bisa dibuka lewat link.

## Halaman

1. **Beranda `/`**: judul pekan terbaru, strip angka komunitas (total sesi, total gol, pemain aktif), ringkasan sesi terakhir (MOTM dan pencetak gol), lalu 4 cuplikan leaderboard top 3 (Rating, Topskor, Top Assist, MOTM) dengan tautan "Lihat semua".
2. **Statistik `/statistik`**: tabel lengkap dengan kolom peringkat, nama, posisi, rating, hadir, gol, assist, MOTM, M/S/K, win rate, dan poin/sesi. Semua kolom bisa diurutkan, dengan filter posisi dan filter "Semua waktu / Bulan ini". Di HP tabelnya bisa di-scroll ke samping dengan kolom nama tetap terlihat (sticky).
3. **Pemain `/pemain`**: grid kartu berisi foto, panggilan, posisi, dan rating, dengan kolom pencarian nama dan filter posisi.
4. **Profil `/pemain/:id`**: header berisi foto, nama, posisi, dan "Peringkat #n dari N". Di bawahnya 4 angka utama (Rating, Gol, Assist, MOTM), statistik lengkap, grafik garis poin per sesi (SVG buatan sendiri, tanpa library), dan tabel riwayat sesi.
5. **Sesi `/sesi`**: arsip sesi dari yang terbaru. **Detail `/sesi/:id`**: daftar pemain yang hadir, dikelompokkan berdasarkan hasil, lengkap dengan gol, assist, dan MOTM.

## Desain visual

Mengikuti poster brand Liga Lucu Depok (hitam, emas, putih). Desain disetujui lewat mockup `visual-style-v2.html`.

- **Token warna:** `--bg #070707`, `--panel #101010`, `--line #232019`, `--gold #C9A24D`, `--ink #F4F1EA`, `--mute #8A8578`.
- **Tipografi:** judul dan angka besar memakai **Bebas Neue**. Body dan label memakai **Montserrat**. Label ditulis huruf kapital dengan spasi huruf ±0.3em. Semua angka memakai tabular figures.
- **Motif:** pendaran emas radial di bagian atas halaman (meniru glow di belakang logo), judul dua baris dengan baris kedua berwarna emas, pita putih-emas untuk strip angka, garis bawah emas untuk judul section dan nav aktif.
- **Anti-slop:**
  - Tanpa emoji dan tanpa gradient warna-warni.
  - Kartu tanpa bayangan tebal dan tanpa sudut membulat besar.
  - Hanya satu warna aksen (emas).
  - Elemen bola hadir lewat logo dan tipografi, bukan clip-art.
- **Logo:** `public/logo.svg` (SVG resmi, emas ring `#AA9050`). Dipakai di nav, hero beranda dengan glow emas di belakangnya, dan favicon. Token `--gold #C9A24D` (dari poster) tetap dipakai untuk teks/aksen karena lebih terang dan kontras di latar hitam.
- **Foto pemain:** kalau `foto_url` kosong, ditampilkan inisial panggilan di atas panel gelap dengan garis bawah emas.
- **Mobile-first:** lebar acuan 375px, tanpa scroll horizontal di level halaman.

## Error handling

- **Loading:** skeleton baris dan kartu dengan warna `--panel`.
- **Gagal fetch atau CSV tidak bisa di-parse:** tampil pesan "Data belum bisa dimuat" dan tombol "Coba lagi".
- **Validasi baris** di `src/data/`:
  - Baris di `Statistik` dengan `pemain_id` atau `sesi_id` yang tidak dikenal dilewati dan dicatat lewat `console.warn`.
  - Angka yang kosong atau tidak valid dianggap 0.
  - `hasil` di luar M/S/K dianggap tidak menang, tidak seri, dan tidak kalah, tapi pemain tetap dihitung hadir.
- **ID tidak ditemukan** (`/pemain/:id` atau `/sesi/:id`): tampil halaman "Tidak ditemukan" dengan tautan kembali.
- **Belum ada data sesi:** tampil empty state "Belum ada pertandingan".

## Struktur kode

```
src/
  data/       sheets.ts (fetch + PapaParse), parse.ts (validasi → tipe), DataProvider.tsx
  stats/      compute.ts (agregasi, rating, peringkat, riwayat), compute.test.ts
  components/ Nav, Leaderboard, StatTable, PlayerCard, PlayerPhoto, PointsChart, StatusStates
  pages/      Home, Stats, Players, PlayerProfile, Sessions, SessionDetail, NotFound
  styles/     tokens.css, global.css
sheet-template/  Pemain.csv, Sesi.csv, Statistik.csv, Poin.csv
SETUP-SHEETS.md
```

## Testing

- **Unit test (Vitest):**
  - `parse.ts`: baris valid, ID tak dikenal, angka kosong, hasil tidak valid.
  - `compute.ts`: rating dengan poin custom, win rate dengan hadir 0, urutan tie-breaker, filter bulan ini, pemain non-aktif.
- **Data contoh:** `sheet-template/` berisi data dummy (±10 pemain, 4 sesi). Saat env var belum diisi, web membaca file ini secara lokal, jadi bisa dijalankan dan dicek tanpa Google Sheets.
- **Cek manual:** semua halaman di lebar 375px dan desktop sebelum dinyatakan selesai.

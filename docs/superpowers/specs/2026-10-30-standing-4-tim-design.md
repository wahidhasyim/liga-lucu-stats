# Standing 4 Tim per Sesi

Disetujui 2026-10-30. Melengkapi `2026-10-26-liga-lucu-depok-stats-design.md`.

## Tujuan

Tiap sesi dimainkan 4 tim dengan format liga mini, dan skor setiap laga dicatat. Website menampilkan klasemen (standing) sesi tersebut di kartu "Sesi terakhir" dan di halaman detail sesi. Hasil menang/seri/kalah pemain dihitung otomatis dari laga yang dimainkan timnya.

## Data (Google Sheets)

**Tab baru `Laga`**: satu baris per pertandingan. Tab ini dibaca lewat env var kelima, `VITE_SHEET_LAGA_URL`.

| Kolom | Isi |
|---|---|
| `sesi_id` | Kode sesi dari tab Sesi |
| `tim_a`, `tim_b` | Nama tim, ditulis bebas per sesi |
| `skor_a`, `skor_b` | Gol tiap tim (bilangan bulat ≥ 0) |

**Tab `Statistik`** mendapat kolom baru `tim`.

- Nama tim dicocokkan tanpa membedakan huruf besar/kecil. Spasi di awal/akhir diabaikan, dan spasi ganda dianggap satu spasi.
- Nama yang tampil di web adalah ejaan pertama yang muncul di tab Laga.

Aturan validasi:

- Laga dengan `sesi_id` yang tidak dikenal dilewati dan memunculkan peringatan di console.
- Laga yang salah satu skornya kosong dianggap belum dimainkan dan dilewati tanpa peringatan.
- Laga yang nama tim A atau tim B-nya kosong juga dilewati dengan peringatan.

## Aturan hitung

**Standing per sesi**

- Kolom: Main, M, S, K, Gol masuk (GM), Kemasukan (GK), Selisih (SG), Poin.
- Poin tim selalu 3 untuk menang, 1 untuk seri, 0 untuk kalah. Nilai ini tidak diambil dari tab Poin, karena tab Poin khusus untuk rating pemain.
- Urutan: Poin, lalu Selisih gol, lalu Gol masuk, lalu nama tim (abjad). Head-to-head tidak dipakai.

**M/S/K pemain dihitung per laga**

- Jika sesi punya data laga: pemain mendapat M/S/K untuk setiap laga yang dimainkan timnya. Kolom `hasil` diabaikan. Pemain yang `tim`-nya kosong atau tidak cocok dengan tim mana pun mendapat 0 laga.
- Jika sesi belum punya data laga: kolom `hasil` tetap dipakai dan dihitung sebagai 1 laga. Jalur ini menjaga data sesi lama.

**Efek ke rating dan statistik**

- Rating: `menang × poin.menang + seri × poin.seri + kalah × poin.kalah`, ditambah komponen lain yang sudah ada sebelumnya.
- Win rate: menang dibagi jumlah laga (M + S + K). Jika jumlah laga 0, win rate 0.
- Nilai default di template berubah menjadi menang 1, seri 0,5. Tujuannya agar menang tidak terlalu mendominasi rating dibanding gol.

## Pemuatan data

- Jika keempat env var lama dan env var Laga kosong semua, web memakai data contoh dari `sheet-template/` untuk semua tab.
- Jika sebagian env var sudah diisi:
  - `VITE_SHEET_LAGA_URL` boleh kosong. Akibatnya tidak ada laga, dan semua sesi memakai kolom `hasil`.
  - Env var lain yang kosong memunculkan error yang jelas. Data contoh tidak dicampur dengan data asli.

## Tampilan

**Beranda, kartu "Sesi terakhir"**

- MOTM dan pencetak gol tetap tampil.
- Di bawahnya ada tabel standing ringkas dengan kolom #, Tim, Main, M, S, K, SG, Poin. Kolom GM dan GK disembunyikan di layar ≤ 560px.
- Tim peringkat 1 ditandai warna gold.
- Tabel standing tidak tampil jika sesi itu tidak punya laga.

**Detail sesi**

- Tabel standing yang sama. Di layar ≤ 560px kolom GM dan GK juga disembunyikan, supaya kolom SG dan Poin tetap terlihat.
- Daftar hasil laga, contohnya `Tim Budi 2 – 1 Galacticos`. Pemenang laga ditebalkan.
- Pemain dikelompokkan per tim, mengikuti urutan standing. Pemain tanpa tim masuk grup "Tanpa tim".
- Sesi tanpa laga tetap memakai pengelompokan lama: Menang, Seri, Kalah, Belum dicatat.

**Profil pemain, tabel riwayat sesi**

- Kolom Hasil diganti kolom M-S-K, contohnya `2-1-0`. Nama tim tampil sebagai baris kecil di bawah "Pekan N", supaya tabel tetap muat di layar HP.

**Tabel statistik**

- Kolom M-S-K dan Win% sekarang dihitung per laga.

## Pengujian

- Unit test untuk parsing Laga: skor kosong, `sesi_id` tidak dikenal, dan normalisasi nama tim.
- Unit test untuk rekap M/S/K per laga, termasuk jalur cadangan `hasil`.
- Unit test untuk urutan standing, termasuk setiap tie-breaker.
- Unit test untuk rating dan win rate per laga.
- Verifikasi visual di lebar 375px dan 1280px.

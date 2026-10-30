# Panduan Admin: Google Sheets

Semua data website diambil dari satu file Google Sheets. Admin cukup mengisi sheet. Website ikut berubah sendiri tanpa perlu menyentuh kode.

## 1. Buat sheet dari template

1. Buka [sheets.new](https://sheets.new) untuk membuat Google Sheet baru, lalu beri nama, misalnya **Data Liga Lucu Depok**.
2. Buat 5 tab dengan nama persis seperti ini: **Pemain**, **Sesi**, **Statistik**, **Laga**, **Poin**.
3. Isi tiap tab dengan file CSV dari folder `sheet-template/`:
   1. Buka tab yang mau diisi.
   2. Pilih **File → Impor → Upload**, lalu pilih file CSV yang namanya sama dengan tab tersebut.
   3. Pada pilihan lokasi impor, pilih **Ganti sheet saat ini**.
4. Hapus baris contoh di tab Pemain, Sesi, Statistik, dan Laga, lalu ganti dengan data asli. **Baris pertama (judul kolom) jangan diubah.**

## 2. Isi kolom

### Tab `Pemain` (diisi sekali, ditambah kalau ada anggota baru)

| Kolom | Isi |
|---|---|
| `id` | Kode unik, misalnya `P01`, `P02`. Jangan diganti setelah dipakai. |
| `nama` | Nama lengkap. |
| `panggilan` | Nama panggilan yang muncul di kartu pemain. |
| `posisi` | Salah satu dari `GK`, `DEF`, `MID`, `FWD`. |
| `foto_url` | Link gambar yang bisa dibuka publik. Kosongkan kalau belum ada; web akan menampilkan inisial. |
| `aktif` | `TRUE`, atau `FALSE` untuk menyembunyikan pemain yang sudah tidak ikut. Riwayatnya tetap tersimpan. |

### Tab `Sesi` (satu baris tiap minggu)

| Kolom | Isi |
|---|---|
| `sesi_id` | Kode unik, misalnya `S001`, `S002`. |
| `tanggal` | Format `YYYY-MM-DD` (contoh `2026-10-24`). Format `24/10/2026` juga diterima. |
| `lokasi` | Nama lapangan. |
| `catatan` | Opsional, misalnya "Hujan deras babak kedua". |

Nomor pekan dihitung otomatis dari urutan tanggal.

### Tab `Statistik` (inti data: satu baris per pemain yang hadir di tiap sesi)

| Kolom | Isi |
|---|---|
| `sesi_id` | Kode sesi dari tab Sesi. |
| `pemain_id` | Kode pemain dari tab Pemain. |
| `tim` | Nama tim pemain di sesi itu. Harus sama dengan nama di tab Laga; huruf besar/kecil tidak masalah. |
| `hasil` | Opsional. Hanya dipakai kalau sesi itu **belum** punya data di tab Laga: `M` (menang), `S` (seri), atau `K` (kalah). |
| `gol` | Jumlah gol (angka). |
| `assist` | Jumlah assist (angka). |
| `motm` | `1` kalau pemain jadi Man of the Match, `0` kalau tidak. |

Pemain yang punya baris di sebuah sesi dihitung **hadir** di sesi itu. Pemain yang tidak datang tidak perlu dibuatkan baris.

### Tab `Laga` (satu baris per pertandingan antartim)

| Kolom | Isi |
|---|---|
| `sesi_id` | Kode sesi dari tab Sesi. |
| `tim_a` | Nama tim pertama. Bebas, misalnya `Tim Budi`. |
| `skor_a` | Gol tim pertama (angka). |
| `skor_b` | Gol tim kedua (angka). |
| `tim_b` | Nama tim kedua. |

Dari tab ini web membuat **klasemen sesi** (menang 3 poin, seri 1, kalah 0; urutan: poin, selisih gol, gol masuk). Menang/seri/kalah tiap pemain juga dihitung otomatis **per laga** dari timnya: kalau timnya main 3 laga dengan hasil 2 menang 1 kalah, pemain itu dapat 2 menang dan 1 kalah. Laga yang skornya masih kosong dianggap belum dimainkan.

### Tab `Poin` (rumus rating)

Nilai poin untuk setiap aksi bisa diubah sesuka komunitas. Aksi yang tersedia: `hadir`, `gol`, `assist`, `motm`, `menang`, `seri`, dan `kalah` (opsional, boleh minus). Rating pemain dihitung dari total poin ini. Karena `menang`, `seri`, dan `kalah` dihitung per laga, nilainya sengaja kecil (template: menang 1, seri 0,5) supaya tidak mengalahkan poin gol.

## 3. Pasang dropdown supaya admin tidak salah ketik (disarankan)

Blok kolom yang mau diberi dropdown, lalu pilih **Data → Validasi data → Tambahkan aturan**:

- `Pemain!D:D` (posisi): **Dropdown**, berisi `GK`, `DEF`, `MID`, `FWD`
- `Statistik!D:D` (hasil): **Dropdown**, berisi `M`, `S`, `K`
- `Statistik!A:A` (sesi_id): **Dropdown (dari rentang)** `Sesi!A2:A`
- `Statistik!B:B` (pemain_id): **Dropdown (dari rentang)** `Pemain!A2:A`
- `Statistik!G:G` (motm): **Dropdown**, berisi `0`, `1`
- `Laga!A:A` (sesi_id): **Dropdown (dari rentang)** `Sesi!A2:A`

Supaya kolom `tanggal` tidak diubah otomatis oleh Sheets, blok kolom `Sesi!B:B`, lalu pilih **Format → Angka → Teks biasa**.

## 4. Publikasikan ke web

1. Pilih **File → Bagikan → Publikasikan ke web**.
2. Pada pilihan pertama, pilih tab **Pemain**. Pada pilihan kedua, pilih **Nilai yang dipisahkan koma (.csv)**.
3. Klik **Publikasikan**, lalu salin link yang muncul.
4. Ulangi langkah 2–3 untuk tab **Sesi**, **Statistik**, **Laga**, dan **Poin**. Hasilnya 5 link.

Link ini hanya bisa dipakai untuk membaca data. Orang lain tidak bisa mengedit sheet lewat link tersebut.

## 5. Sambungkan ke website (sekali saja)

Di Vercel, buka **Project → Settings → Environment Variables**, lalu tambahkan:

| Nama | Isi |
|---|---|
| `VITE_SHEET_PEMAIN_URL` | link CSV tab Pemain |
| `VITE_SHEET_SESI_URL` | link CSV tab Sesi |
| `VITE_SHEET_STATISTIK_URL` | link CSV tab Statistik |
| `VITE_SHEET_LAGA_URL` | link CSV tab Laga |
| `VITE_SHEET_POIN_URL` | link CSV tab Poin |

Setelah itu buka **Deployments**, klik **Redeploy** pada deployment terakhir, dan tunggu sampai selesai.

## Rutinitas mingguan

1. Tambah satu baris baru di tab **Sesi**.
2. Tambah satu baris per pemain yang hadir di tab **Statistik**, lengkap dengan nama timnya.
3. Tambah satu baris per pertandingan di tab **Laga**.
4. Selesai. Perubahan muncul di website sekitar 5 menit kemudian, karena Google menyimpan cache untuk link yang dipublikasikan.

## Kalau ada yang aneh

- **Data pemain atau sesi tidak muncul.** Cek apakah `pemain_id` dan `sesi_id` di tab Statistik sudah persis sama dengan yang ada di tab Pemain dan tab Sesi. Baris dengan ID yang salah dilewati secara otomatis.
- **Website menampilkan "Data belum bisa dimuat".** Pastikan kelima tab masih berstatus dipublikasikan (langkah 4) dan semua link sudah diisi di Vercel.
- **Pemain dapat 0 laga padahal timnya main.** Cek ejaan kolom `tim` di tab Statistik; harus sama dengan nama tim di tab Laga.
- **Foto tidak tampil.** Pastikan link foto bisa dibuka di jendela incognito. Untuk Google Drive, ubah akses file menjadi "Siapa saja yang memiliki link".

# Panduan Admin: Google Sheets

Semua data website tersimpan di satu Google Sheet, **[Data Liga Lucu Depok](https://docs.google.com/spreadsheets/d/1Z0RTEO_EzG3iJB4zz_o7mKki1HZ0bc-MVN2A6a4JTHQ/edit)**, milik akun hasyimwahid694@gmail.com. Website membaca dan menulis sheet ini lewat Apps Script yang menempel di sheet tersebut. Kode Apps Script-nya ada di `apps-script/Code.gs`.

| Bagian | Alamat |
|---|---|
| Web publik | https://ligalucudepok.web.app |
| Halaman admin | https://ligalucudepok.web.app/admin (pakai PIN) |
| Editor Apps Script | https://script.google.com/d/181OenjMKMmC7-5UIpsxxZQG3pOgBSA2RHqSfxAE2Sv9lhR5TUWUqIaLi/edit |
| Web app (API) | `API_URL` di `src/config.ts` |

Perubahan dari halaman admin langsung tersimpan ke sheet. Web publik ikut berubah paling lama 1 menit kemudian, karena datanya di-cache selama 1 menit.

## Rutinitas mingguan (lewat halaman admin)

Buka https://ligalucudepok.web.app/admin dari HP, lalu masukkan PIN.

1. **Sebelum main, buka tab Sesi.** Pilih **+ Sesi baru**, lalu isi tanggal dan lokasi. Atur jumlah tim dengan **+ Tambah tim** atau ✕ (2–8 tim), dan beri nama tim sesukamu. Centang pemain yang hadir. Pemain yang belum terdaftar cukup diketik namanya, pilih posisinya, lalu tekan **+ Tambah**; saat sesi disimpan, pemain itu otomatis masuk daftar pemain. Tekan **Acak tim seimbang** atau pilih tim tiap pemain satu per satu, lalu tekan **Buat sesi**.
2. **Setelah main, buka tab Hasil.** Isi skor tiap laga. Laga yang tidak jadi dimainkan bisa dihapus dengan ✕. Isi gol dan assist tiap pemain dengan tombol −/+, pilih MOTM dengan ★, lalu tekan **Simpan hasil**.
3. **Ada anggota baru? Buka tab Pemain** dan tekan **+ Tambah pemain**. Anggota yang sudah tidak ikut bisa dinonaktifkan; riwayatnya tetap tersimpan.

## Mengganti PIN admin

Buka editor Apps Script, lalu pilih **Project Settings** (ikon gear) → **Script properties**. Ubah nilai `ADMIN_PIN`, lalu klik **Save script properties**. Setelah itu, admin perlu masuk lagi dengan PIN yang baru.

## Isi sheet (kalau mau mengedit langsung)

Halaman admin sudah mengisi semua kolom ini. Bagian ini hanya perlu dibaca kalau kamu mengedit sheet secara manual. **Baris pertama (judul kolom) jangan diubah.**

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

### Dropdown supaya tidak salah ketik (opsional)

Blok kolom yang mau diberi dropdown, lalu pilih **Data → Validasi data → Tambahkan aturan**:

- `Pemain!D:D` (posisi): **Dropdown**, berisi `GK`, `DEF`, `MID`, `FWD`
- `Statistik!D:D` (hasil): **Dropdown**, berisi `M`, `S`, `K`
- `Statistik!A:A` (sesi_id): **Dropdown (dari rentang)** `Sesi!A2:A`
- `Statistik!B:B` (pemain_id): **Dropdown (dari rentang)** `Pemain!A2:A`
- `Statistik!G:G` (motm): **Dropdown**, berisi `0`, `1`
- `Laga!A:A` (sesi_id): **Dropdown (dari rentang)** `Sesi!A2:A`

Supaya kolom `tanggal` tidak diubah otomatis oleh Sheets, blok kolom `Sesi!B:B`, lalu pilih **Format → Angka → Teks biasa**.

## Memperbarui Apps Script (untuk pengelola website)

Kode di `apps-script/` terhubung ke project Apps Script lewat [clasp](https://github.com/google/clasp) (`apps-script/.clasp.json`).

```bash
cd apps-script
npx @google/clasp push --force
npx @google/clasp deploy -i AKfycbwqbBweUYb_NpWkpJt56KSLZdqm2TqjtAbl-6by_yAoW4achQT8D-n0WE3SMbP3c1pZaA
```

Perintah `deploy -i` memperbarui deployment yang sudah ada, jadi URL Web app tetap sama. Kalau ada izin baru yang diperlukan, jalankan fungsi `doGet` sekali dari editor Apps Script, lalu setujui izinnya.

## Kalau ada yang aneh

- **Data pemain atau sesi tidak muncul.** Cek apakah `pemain_id` dan `sesi_id` di tab Statistik sudah persis sama dengan yang ada di tab Pemain dan tab Sesi. Baris dengan ID yang salah dilewati secara otomatis.
- **Website menampilkan "Data belum bisa dimuat".** Buka link Web app di bawah. Kalau hasilnya bukan teks berawalan `{"ok":true`, cek apakah deployment Apps Script masih ada dan berakses **Anyone**.
- **Pemain dapat 0 laga padahal timnya main.** Cek ejaan kolom `tim` di tab Statistik; harus sama dengan nama tim di tab Laga.
- **Halaman admin bilang "PIN salah" padahal benar.** Cek `ADMIN_PIN` di Script properties (spasi ikut dihitung). Kalau muncul "Terlalu banyak PIN salah", tunggu 10 menit.
- **Halaman admin bilang "Tidak bisa menghubungi server".** Pastikan deployment Web app masih ada dan berakses **Anyone**.
- **Foto tidak tampil.** Pastikan link foto bisa dibuka di jendela incognito. Untuk Google Drive, ubah akses file menjadi "Siapa saja yang memiliki link".

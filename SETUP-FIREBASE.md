# Panduan Admin: Firebase

Semua data website tersimpan di **Cloud Firestore** project Firebase `ligalucudepok` (region Jakarta). Web publik membaca langsung dari Firestore dan ikut berubah beberapa detik setelah admin menyimpan, tanpa perlu dimuat ulang.

| Bagian | Alamat |
|---|---|
| Web publik | https://ligalucudepok.web.app |
| Halaman admin | https://ligalucudepok.web.app/admin (pakai password admin) |
| Data (Firestore) | https://console.firebase.google.com/project/ligalucudepok/firestore |
| Akun admin | https://console.firebase.google.com/project/ligalucudepok/authentication/users |
| Arsip Google Sheet | [Data Liga Lucu Depok](https://docs.google.com/spreadsheets/d/1Z0RTEO_EzG3iJB4zz_o7mKki1HZ0bc-MVN2A6a4JTHQ/edit) (tidak dipakai lagi sejak 9 Nov 2026) |

## Rutinitas mingguan (lewat halaman admin)

Buka https://ligalucudepok.web.app/admin dari HP, lalu masukkan password admin. HP yang sama tidak perlu login lagi sampai kamu menekan **Keluar**.

1. **Sebelum main, buka tab Sesi.** Pilih **+ Sesi baru**, lalu isi tanggal dan lokasi. Tulis jam main di catatan, misalnya `Jam 18.00 - 20.00`, supaya jadwal menampilkan jam tiap laga. Atur jumlah tim dengan **+ Tambah tim** atau ✕ (2–8 tim), dan beri nama tim sesukamu. Centang pemain yang hadir. Pemain yang belum terdaftar cukup diketik namanya, lalu tekan **+ Tambah**; saat sesi disimpan, pemain itu otomatis masuk daftar pemain sebagai outfield. Tambahkan `(GK)` di belakang nama untuk kiper. Kalau daftarnya banyak, tekan **Paste daftar nama** lalu tempel list dari WhatsApp, satu nama per baris: nama yang sudah terdaftar langsung dicentang, sisanya jadi pemain baru. Kalau ada yang minta setim (misalnya Budi sama Buci), tambahkan di **Request setim** sebelum mengacak. Tekan **Acak tim seimbang** atau pilih tim tiap pemain satu per satu, lalu tekan **Buat sesi**. Untuk mengumumkan line-up, buka halaman sesi itu di web lalu tekan **Story · 9:16** atau **Feed** (satu gambar 4:5 per tim plus satu gambar jadwal). Di HP, menu share langsung terbuka; di laptop, gambarnya diunduh.
2. **Selama main, buka tab Hasil.** Setiap laga selesai, isi skornya lalu tekan **Selesai**. Kartu laga berubah jadi "Tersimpan ✓", dan web publik langsung menampilkan skor serta klasemen sesi dengan tanda **LIVE**. Salah ketik? Ubah skornya lalu tekan **Simpan ulang**. Laga yang tidak jadi dimainkan bisa dihapus dengan ✕.
3. **Setelah main, masih di tab Hasil.** Isi gol dan assist tiap pemain dengan tombol −/+, pilih MOTM dengan ★, lalu tekan **Simpan hasil**.
4. **Ada anggota baru? Buka tab Pemain** dan tekan **+ Tambah pemain**. Anggota yang sudah tidak ikut bisa dinonaktifkan; riwayatnya tetap tersimpan.

## Mengganti password admin

Email admin bukan kotak surat sungguhan, jadi tombol reset password lewat email tidak bisa dipakai. Buka [akun admin](https://console.firebase.google.com/project/ligalucudepok/authentication/users), hapus user `admin@ligalucudepok.web.app` (menu ⋮ → **Delete account**), lalu **Add user** lagi dengan email yang sama dan password baru. HP yang sudah login perlu masuk lagi.

## Isi data

Firestore menyimpan lima dokumen di koleksi `tabel`: `pemain`, `sesi`, `statistik`, `laga`, dan `poin`. Masing-masing berisi `rows`, daftar baris dengan kolom berikut (semua nilai berupa teks). Halaman admin sudah mengisi semuanya; bagian ini hanya perlu dibaca kalau mengedit lewat Firebase Console.

| Dokumen | Kolom |
|---|---|
| `pemain` | `id` (P01…), `nama`, `panggilan`, `posisi` (`GK` atau `OUT`), `foto_url`, `aktif` (`TRUE`/`FALSE`) |
| `sesi` | `sesi_id` (S001…), `tanggal` (`YYYY-MM-DD`), `lokasi`, `catatan` |
| `statistik` | `sesi_id`, `pemain_id`, `tim`, `hasil` (dipakai hanya kalau sesi belum punya laga), `gol`, `assist`, `motm` (`1`/`0`) |
| `laga` | `sesi_id`, `tim_a`, `skor_a`, `skor_b`, `tim_b`; skor kosong berarti belum dimainkan |
| `poin` | `aksi` (`hadir`, `gol`, `assist`, `motm`, `menang`, `seri`, `kalah`, `clean_sheet`, `kebobolan_1`), `poin` |

Nomor pekan dihitung otomatis dari urutan tanggal. Klasemen sesi: menang 3 poin, seri 1, kalah 0; urutan poin, selisih gol, gol masuk. Menang/seri/kalah pemain dihitung per laga dari timnya.

Poin kiper (pemain dengan posisi `GK`) dihitung otomatis dari skor laga timnya: `clean_sheet` untuk tiap laga tanpa kebobolan dan `kebobolan_1` untuk tiap laga kebobolan tepat 1 gol. Papan "Kiper terbaik" di beranda mengurutkan kiper dari rata-rata kebobolan per laga terkecil, lalu clean sheet terbanyak. Kiper dianggap jaga gawang satu sesi penuh untuk timnya.

## Keamanan

Aturannya ada di `firestore.rules`: semua orang boleh membaca, dan hanya akun `admin@ligalucudepok.web.app` yang boleh menulis. Setelah mengubah file itu, jalankan `firebase deploy --only firestore:rules`.

## Kalau ada yang aneh

- **Halaman admin bilang "Password salah" padahal benar.** Cek password di Firebase Console (reset kalau perlu). Kalau muncul "Terlalu banyak percobaan", tunggu beberapa menit.
- **"Tidak punya izin menyimpan".** Tekan **Keluar**, lalu masuk lagi.
- **Website menampilkan "Data belum bisa dimuat".** Cek koneksi, lalu cek apakah koleksi `tabel` masih ada di Firestore.
- **Pemain dapat 0 laga padahal timnya main.** Cek ejaan `tim` di statistik; harus sama dengan nama tim di laga (huruf besar/kecil tidak masalah).
- **Foto tidak tampil.** Pastikan link foto bisa dibuka di jendela incognito. Untuk Google Drive, ubah akses file menjadi "Siapa saja yang memiliki link".

# Pindah penyimpanan dari Google Sheets ke Firestore

## Kenapa

Web publik dan halaman admin lambat karena setiap baca/tulis lewat Apps Script (cold start 1–3 detik, lalu baca-tulis Sheets). Firestore dibaca langsung dari browser, ~0,3 detik, dan bisa di-cache di HP.

## Keputusan

- **Login admin:** password bersama (Firebase Auth email/password dengan satu akun admin tetap). Admin hanya mengetik password, seperti PIN sekarang. Password tidak pernah ditulis di repo atau file mana pun.
- **Google Sheets:** jadi arsip. Data disalin sekali ke Firestore lewat tombol impor di halaman admin; setelah itu Sheets dan Apps Script tidak dipakai lagi.

## Model data

Satu dokumen per tabel di koleksi `tabel`: `tabel/pemain`, `tabel/sesi`, `tabel/statistik`, `tabel/laga`, `tabel/poin`. Isinya `{ rows: Record<string, string>[] }`, bentuk baris persis seperti `RawTables` sekarang (kolom dan nilai teks sama dengan header Sheets). Dengan begitu `parseLeague` dan semua perhitungan statistik tidak berubah.

Batas dokumen Firestore 1 MB. Baris statistik ~110 byte, jadi `tabel/statistik` muat ±9.000 baris (±300 sesi berisi 28 pemain, kira-kira 6 tahun mingguan). Kalau kelak mendekati batas, statistik dipecah per tahun.

## Alur

- **Web publik:** `DataProvider` berlangganan koleksi `tabel` (onSnapshot) dengan cache persisten IndexedDB. Kunjungan berikutnya langsung tampil dari cache lalu diperbarui; perubahan admin muncul tanpa muat ulang.
- **Admin:** logika aksi di `apps-script/Code.gs` (simpanPemain, simpanSesi, simpanHasil, hapusPemain, hapusSesi) dipindah ke `src/admin/aksi.ts`, fungsi murni di atas `RawTables` yang mengembalikan hasil dan daftar tabel yang berubah. Penyimpanan memakai transaksi Firestore: baca kelima dokumen, jalankan aksi, tulis dokumen yang berubah. Validasi dan pesan error sama dengan sekarang. `code.test.ts` diubah menjadi `aksi.test.ts`.
- **Login:** `signInWithEmailAndPassword(EMAIL_ADMIN, password)`. Sesi login diingat Firebase, jadi PIN di localStorage tidak dipakai lagi. Firebase Auth membatasi percobaan password yang salah.
- **Impor sekali jalan:** saat admin login dan Firestore masih kosong, halaman admin menampilkan tombol "Impor dari Google Sheets" yang membaca `doGet` Apps Script lalu menulis kelima dokumen. Kalau Poin kosong, diisi nilai awal (hadir 1, gol 3, assist 2, motm 5, menang 1, seri 0.5).
- **Development:** tanpa konfigurasi Firebase (`VITE_FIREBASE=off`), web memakai data contoh dan admin menjalankan `aksi.ts` di memori (password contoh `1234`), menggantikan `devApi`/`gasShim`.

## Keamanan (firestore.rules)

```
match /tabel/{nama} {
  allow read: if true;
  allow write: if request.auth != null && request.auth.token.email == EMAIL_ADMIN
               && nama in ['pemain', 'sesi', 'statistik', 'laga', 'poin'];
}
```

Semua dokumen lain ditolak.

## Setup Firebase (sekali)

1. Buat database Firestore (region `asia-southeast2`, Jakarta), lewat CLI atau Console.
2. Aktifkan provider Email/Password di Authentication (Console).
3. Buat user `EMAIL_ADMIN` dengan password admin (Console, dilakukan pemilik).
4. Deploy rules (`firebase deploy --only firestore:rules`) dan hosting.
5. Login di /admin, klik "Impor dari Google Sheets".

## Yang dihapus

`src/data/sheets.ts` (fetch CSV/Apps Script), `src/admin/api.ts` versi fetch, `devApi.ts`, `gasShim.ts`, `code.test.ts`. Folder `apps-script/` dan `sheet-template/` disimpan: Code.gs sebagai arsip, CSV sebagai data contoh development. SETUP-SHEETS.md diganti SETUP-FIREBASE.md.

## Pengujian

- `aksi.test.ts`: semua kasus `code.test.ts` dipindah ke fungsi murni.
- Uji transport dev end-to-end di browser (login, simpan sesi, hasil, hapus).
- Setelah impor: bandingkan isi Firestore dengan `doGet` Apps Script, lalu cek halaman publik dan admin di produksi.

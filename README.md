# Liga Lucu Depok

Website statistik pemain untuk komunitas fun football Liga Lucu Depok. Isinya leaderboard, profil pemain, arsip sesi mingguan, dan halaman admin. Semua data tersimpan di Cloud Firestore (Firebase); web publik ikut berubah begitu admin menyimpan.

## Jalankan di komputer

```bash
npm install
npm run dev     # http://localhost:5173
npm test        # unit test
npm run build   # build produksi ke dist/
```

`npm run dev` memakai data contoh dari `sheet-template/` di memori (password admin `1234`, perubahan hilang saat reload), jadi data uji tidak pernah masuk ke database asli. Untuk menyambung ke Firestore asli, **termasuk saat menyimpan dari halaman admin**:

```bash
VITE_FIREBASE=on npm run dev
```

## Deploy ke Firebase Hosting

```bash
firebase deploy --only hosting           # build otomatis, lalu upload ke https://ligalucudepok.web.app
firebase deploy --only firestore:rules   # setelah mengubah firestore.rules
```

Panduan admin, akun admin, dan isi data ada di [SETUP-FIREBASE.md](SETUP-FIREBASE.md).

## Halaman admin

`/admin` dipakai untuk mengelola pemain, line-up sesi, dan hasil pertandingan dari HP. Admin login dengan password akun `admin@ligalucudepok.web.app` (Firebase Authentication). Skor tiap laga bisa disimpan begitu laga selesai, dan web publik menampilkan klasemen live.

## Struktur kode

- `src/data/`: berlangganan data Firestore (atau data contoh saat development) dan memvalidasi isinya.
- `src/admin/`: halaman admin; `aksi.ts` berisi logika simpan sebagai fungsi murni yang ada tesnya.
- `apps-script/`: arsip API Google Sheets lama, hanya dipakai tombol impor sekali jalan.
- `src/stats/`: menghitung rating, peringkat, dan riwayat pemain. Semuanya fungsi murni yang ada tesnya.
- `src/pages/` dan `src/components/`: tampilan website.
- `docs/superpowers/`: spec desain dan rencana implementasi.

# Liga Lucu Depok

Website statistik pemain untuk komunitas fun football Liga Lucu Depok. Isinya leaderboard, profil pemain, dan arsip sesi mingguan. Semua data diambil dari Google Sheets.

## Jalankan di komputer

```bash
npm install
npm run dev     # http://localhost:5173
npm test        # unit test
npm run build   # build produksi ke dist/
```

Kalau env var belum diisi, website memakai data contoh dari `sheet-template/`.

## Deploy ke Firebase Hosting

```bash
firebase deploy --only hosting   # build otomatis, lalu upload ke https://ligalucudepok.web.app
```

Link Google Sheets diambil dari file `.env.production.local` (tidak ikut ke git) saat build. Isinya 5 baris `VITE_SHEET_*` seperti di `.env.example`.

## Deploy ke Vercel (alternatif)

1. Push repo ini ke GitHub.
2. Di Vercel, pilih **Add New → Project**, import repo ini, lalu pilih framework **Vite**.
3. Isi 5 environment variable `VITE_SHEET_*`. Daftarnya ada di `.env.example`.
4. Klik **Deploy**.

Cara menyiapkan Google Sheets dan mengisi data mingguan dijelaskan di [SETUP-SHEETS.md](SETUP-SHEETS.md).

## Halaman admin

`/admin` dipakai untuk mengelola pemain, line-up sesi, dan hasil pertandingan dari HP. Halaman ini menulis ke Google Sheets lewat `apps-script/Code.gs`; cara memasangnya ada di SETUP-SHEETS.md. Saat `npm run dev` tanpa `VITE_ADMIN_API_URL`, admin berjalan di atas data contoh dengan PIN `1234`, dan perubahannya hilang saat halaman dimuat ulang.

## Struktur kode

- `src/data/`: mengambil CSV dari Google Sheets dan memvalidasi isinya.
- `src/admin/` dan `apps-script/`: halaman admin dan API Google Apps Script-nya.
- `src/stats/`: menghitung rating, peringkat, dan riwayat pemain. Semuanya fungsi murni yang ada tesnya.
- `src/pages/` dan `src/components/`: tampilan website.
- `docs/superpowers/`: spec desain dan rencana implementasi.

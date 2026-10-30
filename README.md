# Liga Lucu Depok

Website statistik pemain untuk komunitas fun football Liga Lucu Depok. Isinya leaderboard, profil pemain, arsip sesi mingguan, dan halaman admin. Semua data tersimpan di Google Sheets dan dibaca/ditulis lewat Google Apps Script.

## Jalankan di komputer

```bash
npm install
npm run dev     # http://localhost:5173
npm test        # unit test
npm run build   # build produksi ke dist/
```

Secara default, `npm run dev` memakai data asli lewat `API_URL` di `src/config.ts`, **termasuk saat menyimpan dari halaman admin**. Untuk mencoba dengan data contoh dari `sheet-template/`, jalankan:

```bash
VITE_API_URL= npm run dev   # data contoh; PIN admin 1234; perubahan hilang saat reload
```

## Deploy ke Firebase Hosting

```bash
firebase deploy --only hosting   # build otomatis, lalu upload ke https://ligalucudepok.web.app
```

Link Google Sheet, editor Apps Script, dan cara memperbarui script ada di [SETUP-SHEETS.md](SETUP-SHEETS.md).

## Halaman admin

`/admin` dipakai untuk mengelola pemain, line-up sesi, dan hasil pertandingan dari HP, dengan PIN admin yang disimpan di Script properties Apps Script. Halaman ini menulis ke Google Sheets lewat `apps-script/Code.gs`.

## Struktur kode

- `src/data/`: mengambil data (Apps Script, atau CSV sebagai cadangan) dan memvalidasi isinya.
- `src/admin/` dan `apps-script/`: halaman admin dan API Google Apps Script-nya.
- `src/stats/`: menghitung rating, peringkat, dan riwayat pemain. Semuanya fungsi murni yang ada tesnya.
- `src/pages/` dan `src/components/`: tampilan website.
- `docs/superpowers/`: spec desain dan rencana implementasi.

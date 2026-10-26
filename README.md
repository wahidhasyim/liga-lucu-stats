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

## Deploy ke Vercel

1. Push repo ini ke GitHub.
2. Di Vercel, pilih **Add New → Project**, import repo ini, lalu pilih framework **Vite**.
3. Isi 4 environment variable `VITE_SHEET_*`. Daftarnya ada di `.env.example`.
4. Klik **Deploy**.

Cara menyiapkan Google Sheets dan mengisi data mingguan dijelaskan di [SETUP-SHEETS.md](SETUP-SHEETS.md).

## Struktur kode

- `src/data/`: mengambil CSV dari Google Sheets dan memvalidasi isinya.
- `src/stats/`: menghitung rating, peringkat, dan riwayat pemain. Semuanya fungsi murni yang ada tesnya.
- `src/pages/` dan `src/components/`: tampilan website.
- `docs/superpowers/`: spec desain dan rencana implementasi.

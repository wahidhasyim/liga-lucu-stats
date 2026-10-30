# Halaman Admin

Disetujui 2026-10-30. Melengkapi spec situs utama dan spec standing 4 tim.

## Tujuan

Admin bisa mengelola semua data rutin dari HP lewat `/admin`, tanpa membuka Google Sheets. Data yang dikelola: pemain, sesi beserta line-up tim, dan hasil sesi. Google Sheets tetap menjadi satu-satunya sumber data.

## Revisi 2026-10-30: baca publik lewat Apps Script

Atas persetujuan pemilik, web publik juga membaca data lewat Apps Script (`doGet`, tanpa PIN, di-cache 1 menit dan dikosongkan setiap kali admin menyimpan). Langkah *Publish to web* tidak diperlukan lagi; link CSV hanya menjadi cadangan. Ada juga aksi `pasang` yang hanya bisa dipakai selama `ADMIN_PIN` belum diatur: aksi ini menyiapkan semua tab, mengisi Poin default, dan menyimpan PIN. Project Apps Script dibuat dan di-deploy dengan clasp. Izinnya dibatasi ke `spreadsheets.currentonly`.

## Revisi 2026-10-30: form sesi

- Jumlah tim bisa diatur 2–8 dengan tombol tambah/hapus tim. Pemain di tim yang dihapus jadi belum dapat tim. Kalau timnya lebih dari 4, pilihan tim tiap pemain memakai dropdown.
- Pemain baru bisa diketik langsung di form sesi (nama dan posisi). Di `simpanSesi`, entri line-up `{ baru: { nama, posisi }, tim }` mendaftarkan pemain itu ke tab Pemain dalam penyimpanan yang sama. Kalau ada data yang tidak valid, tidak ada yang tersimpan. Pengecekan nama kembar dilakukan di browser lewat konfirmasi.

## Arsitektur

- **API admin:** `apps-script/Code.gs`, sebuah Google Apps Script yang menempel di file Sheet, di-deploy sebagai Web app (*Execute as: Me*, *Who has access: Anyone*).
  - Semua request berupa `POST` dengan body JSON `{ pin, action, data }`. Content-Type `text/plain` dipakai supaya browser tidak mengirim preflight CORS.
  - Setiap aksi yang berhasil mengembalikan `{ ok: true, hasil, data }`. Isi `data` adalah semua tab dalam bentuk baris objek. Formatnya sama dengan `RawTables`, jadi bisa langsung diproses `parseLeague`.
  - Kalau gagal, respons berisi `{ ok: false, error }` dengan pesan berbahasa Indonesia.
- **Halaman admin** membaca dan menulis lewat API ini, sehingga perubahan langsung terlihat oleh admin. Web publik tetap membaca CSV *Publish to web*, jadi ikut berubah sekitar 5 menit kemudian.
- **Konfigurasi:** link API dan link CSV dipusatkan di `src/config.ts`. Nilainya diambil dari env var kalau ada; kalau tidak, dari konstanta di file itu. Tidak ada yang rahasia di sini: CSV memang publik, dan API dilindungi PIN.
- **Mode development:** kalau link API kosong saat `npm run dev`, halaman admin menjalankan `Code.gs` yang sama di browser memakai tiruan Spreadsheet in-memory, dengan isi awal dari `sheet-template/`. PIN-nya `1234`. Tiruan yang sama dipakai unit test untuk menguji `Code.gs`. Di build produksi tanpa link API, halaman admin menampilkan pesan "belum disambungkan".

## Keamanan

- PIN disimpan di Script Properties (`ADMIN_PIN`), tidak pernah masuk repo.
- Setelah 10 kali PIN salah, API dikunci selama 10 menit (CacheService).
- PIN diingat di localStorage HP admin sampai admin menekan Keluar.
- `/admin` tidak ditampilkan di menu.
- Semua penulisan dijalankan di dalam `LockService`, supaya dua admin yang menyimpan bersamaan tidak saling menimpa.

## Aksi API

| Aksi | Data | Efek |
|---|---|---|
| `baca` | – | Tidak mengubah apa pun; hanya mengembalikan data terbaru. |
| `simpanPemain` | `{ id?, nama, panggilan, posisi, fotoUrl, aktif }` | Tanpa `id`: tambah pemain dengan ID otomatis (`P` + 2 digit, lanjut dari nomor terbesar). Dengan `id`: ubah pemain itu. |
| `simpanSesi` | `{ id?, tanggal, lokasi, catatan, lineup: [{ pemainId, tim }] }` | Tambah sesi (ID `S` + 3 digit) atau ubah sesi. Baris Statistik sesi itu diganti sesuai line-up; gol, assist, dan MOTM pemain yang tetap ada di line-up dipertahankan. Laga yang timnya sudah tidak ada di line-up ikut dihapus. |
| `simpanHasil` | `{ sesiId, laga: [{ timA, skorA, skorB, timB }], statistik: [{ pemainId, gol, assist, motm }] }` | Semua baris Laga sesi itu diganti. Gol, assist, dan MOTM di baris Statistik sesi itu diperbarui. |
| `hapusSesi` | `{ id }` | Menghapus baris sesi itu di tab Sesi, Statistik, dan Laga. |

Aturan validasi:

- Nama pemain wajib diisi. Posisi yang tidak valid menjadi `MID`.
- Tanggal sesi harus berformat `YYYY-MM-DD`. Line-up minimal berisi 1 pemain. Setiap pemain harus punya tim, dan semua pemain harus dikenal di tab Pemain.
- Tim di laga harus salah satu tim dari line-up sesi. Skor boleh kosong (artinya belum dimainkan) atau bilangan bulat ≥ 0.

Aturan penulisan ke Sheet:

- Kolom dicari berdasarkan nama header, bukan urutan. Kolom wajib yang belum ada ditambahkan di ujung kanan. Kolom tambahan buatan admin tetap dipertahankan.
- Kolom tanggal ditulis dalam format teks biasa, supaya Sheets tidak mengubahnya jadi format tanggal lain.

## Tampilan (mobile first)

**Gerbang PIN**

- Logo, judul "Admin", input PIN, dan tombol Masuk.

**Tab Pemain**

- Daftar pemain berisi nama, posisi, dan status aktif/nonaktif. Ketuk pemain untuk mengedit, atau ketuk "Tambah pemain".
- Form berisi: nama, panggilan, posisi (segmented), link foto, dan aktif.

**Tab Sesi**

- Pilih "Sesi baru" atau sesi lama yang mau diedit.
- Isi tanggal, lokasi (dengan saran dari lokasi sebelumnya), dan catatan.
- Pilih jumlah tim: 2, 3, atau 4. Defaultnya 4.
- Nama tim bisa diisi bebas.
- Setiap pemain aktif ditampilkan per baris. Ketuk nama untuk menandai hadir, lalu pilih tim dengan tombol huruf A–D.
- Tombol **Acak seimbang** membagi pemain yang hadir ke tim. Kiper disebar lebih dulu, lalu pemain lain dimasukkan satu per satu ke tim dengan jumlah pemain paling sedikit; kalau jumlahnya sama, ke tim dengan total kekuatan paling kecil. Kekuatan diambil dari poin per sesi; pemain baru diberi nilai median. Ada sedikit unsur acak, jadi menekan tombol lagi memberi hasil yang berbeda.
- Ada tombol hapus sesi, dengan konfirmasi.

**Tab Hasil**

- Pilih sesi. Defaultnya sesi terbaru yang sudah punya line-up.
- Kalau sesi belum punya laga, jadwal round-robin dibuat otomatis (setiap tim bertemu sekali). Laga bisa dihapus atau ditambah.
- Setiap laga berisi pilihan tim dan skor. Skor kosong berarti laga belum dimainkan.
- Pemain dikelompokkan per tim. Gol dan assist diisi dengan tombol −/+, dan MOTM dipilih dengan tombol ★.
- Kalau jumlah gol pemain sebuah tim tidak sama dengan total skor tim itu di semua laga, muncul peringatan. Peringatan ini tidak menghalangi penyimpanan, misalnya untuk kasus gol bunuh diri.

**Semua tab**

- Tombol Simpan menempel di bawah layar, bersama pesan status (menyimpan, tersimpan, atau error).

## Perubahan di web publik

- Kartu "Sesi terakhir" memakai sesi terbaru yang tanggalnya ≤ hari ini, supaya sesi yang baru disusun line-up-nya tidak tampil sebagai sesi terakhir.

## Pengujian

- Unit test untuk `Code.gs` lewat tiruan Spreadsheet: PIN salah, penguncian setelah gagal berkali-kali, ID otomatis, upsert pemain, line-up yang mempertahankan gol, penggantian laga, hapus sesi, kolom yang hilang, dan tanggal.
- Unit test untuk round-robin, bagi seimbang, dan cek gol tim.
- Verifikasi visual halaman admin di lebar 375px.

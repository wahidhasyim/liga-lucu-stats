const env = import.meta.env

// Build produksi selalu memakai Firestore. Saat development defaultnya data contoh di memori, supaya
// data uji tidak pernah masuk ke database asli; VITE_FIREBASE=on menyambungkan dev ke Firestore.
export const PAKAI_FIREBASE = env.PROD || env.VITE_FIREBASE === 'on'

// Satu akun admin bersama; admin cukup mengetik password-nya. Akun dibuat di Firebase Console.
export const EMAIL_ADMIN = 'admin@ligalucudepok.web.app'

// Apps Script lama (arsip Google Sheets). Hanya dipakai tombol impor sekali jalan di halaman admin.
export const SHEETS_API_URL = 'https://script.google.com/macros/s/AKfycbwqbBweUYb_NpWkpJt56KSLZdqm2TqjtAbl-6by_yAoW4achQT8D-n0WE3SMbP3c1pZaA/exec'

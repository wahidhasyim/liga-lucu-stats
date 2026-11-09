import { FirebaseError } from 'firebase/app'
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { doc, runTransaction } from 'firebase/firestore'
import { EMAIL_ADMIN } from '../config'
import { TABEL, tabelKosong } from '../data/tabel'
import type { Row } from '../data/types'
import { appFirebase, db } from '../lib/firebase'
import { jalankanAksi } from './aksi'
import { bacaSheets, type Backend } from './api'

// Pesan error Firebase yang mungkin ditemui admin, dalam bahasa sehari-hari.
function pesan(err: unknown): Error {
  if (!(err instanceof FirebaseError)) return err instanceof Error ? err : new Error(String(err))
  const kode: Record<string, string> = {
    'auth/invalid-credential': 'Password salah.',
    'auth/wrong-password': 'Password salah.',
    'auth/user-not-found': 'Akun admin belum dibuat di Firebase Console.',
    'auth/too-many-requests': 'Terlalu banyak percobaan. Coba lagi beberapa menit lagi.',
    'auth/network-request-failed': 'Tidak bisa menghubungi server. Cek koneksi internet.',
    'auth/operation-not-allowed': 'Login Email/Password belum diaktifkan di Firebase Console.',
    'permission-denied': 'Tidak punya izin menyimpan. Coba keluar lalu masuk lagi.',
    unavailable: 'Tidak bisa menghubungi server. Cek koneksi internet.',
  }
  return new Error(kode[err.code] ?? err.message)
}

const dokumen = (nama: string) => doc(db(), 'tabel', nama)

export function buatBackendFirebase(): Backend {
  const auth = getAuth(appFirebase())
  return {
    pantauLogin: (cb) => onAuthStateChanged(auth, (u) => cb(u?.email === EMAIL_ADMIN)),

    async masuk(password) {
      try {
        await signInWithEmailAndPassword(auth, EMAIL_ADMIN, password)
      } catch (err) {
        throw pesan(err)
      }
    },

    keluar: () => signOut(auth),

    // Satu transaksi: baca semua tabel, jalankan aksi, tulis tabel yang berubah. Kalau ada admin lain yang
    // menyimpan di saat bersamaan, Firestore mengulang transaksi dengan data terbaru.
    async jalankan(aksi, data) {
      try {
        return await runTransaction(db(), async (tx) => {
          const snaps = await Promise.all(TABEL.map((t) => tx.get(dokumen(t))))
          const tabel = tabelKosong()
          TABEL.forEach((t, i) => (tabel[t] = (snaps[i].data()?.rows as Row[] | undefined) ?? []))
          const k = jalankanAksi(tabel, aksi, data)
          for (const t of k.berubah) tx.set(dokumen(t), { rows: k.tabel[t] })
          return k.hasil
        })
      } catch (err) {
        throw pesan(err)
      }
    },

    async impor() {
      const sheets = await bacaSheets()
      try {
        await runTransaction(db(), async (tx) => {
          const snaps = await Promise.all(TABEL.map((t) => tx.get(dokumen(t))))
          if (snaps.some((s) => s.exists())) throw new Error('Firebase sudah berisi data; impor dibatalkan supaya tidak menimpa.')
          for (const t of TABEL) tx.set(dokumen(t), { rows: sheets[t] })
        })
      } catch (err) {
        throw pesan(err)
      }
      return TABEL.reduce((n, t) => n + sheets[t].length, 0)
    },
  }
}

import { getApps, initializeApp, type FirebaseApp } from 'firebase/app'
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, type Firestore } from 'firebase/firestore'

// Config web Firebase memang publik (ikut terkirim ke browser), jadi aman disimpan di repo.
// Yang menjaga data adalah firestore.rules: semua orang boleh baca, hanya admin yang login boleh menulis.
export const firebaseConfig = {
  apiKey: 'AIzaSyAJp7ID1usg70Aj-tUQAO69jjGRxWfrIec',
  authDomain: 'ligalucudepok.firebaseapp.com',
  projectId: 'ligalucudepok',
  storageBucket: 'ligalucudepok.firebasestorage.app',
  messagingSenderId: '699615468760',
  appId: '1:699615468760:web:bc0e94d2bee412e1478bad',
  measurementId: 'G-4EBC9QL9BY',
}

export const appFirebase = (): FirebaseApp => getApps()[0] ?? initializeApp(firebaseConfig)

let firestore: Firestore | null = null

// Cache IndexedDB membuat kunjungan berikutnya langsung tampil, lalu diperbarui dari server.
export function db(): Firestore {
  firestore ??= initializeFirestore(appFirebase(), { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) })
  return firestore
}

let kirim: ((path: string) => void) | null = null
let halamanTerakhir: string | null = null

// Hanya di build produksi, supaya kunjungan saat development tidak ikut terhitung.
// SDK dimuat terpisah agar tidak memperlambat tampilan pertama.
export async function mulaiAnalytics(): Promise<void> {
  if (!import.meta.env.PROD) return
  const [{ appFirebase }, { initializeAnalytics, isSupported, logEvent }] = await Promise.all([import('./firebase'), import('firebase/analytics')])
  if (!(await isSupported())) return
  // page_view dikirim manual dari catatHalaman, karena perpindahan halaman SPA tidak tercatat otomatis.
  const analytics = initializeAnalytics(appFirebase(), { config: { send_page_view: false } })
  kirim = (path) => logEvent(analytics, 'page_view', { page_path: path, page_location: location.href, page_title: document.title })
  if (halamanTerakhir) kirim(halamanTerakhir)
}

// Dipanggil tiap pindah halaman. Halaman yang dibuka sebelum SDK siap dikirim begitu SDK siap.
export function catatHalaman(path: string): void {
  halamanTerakhir = path
  kirim?.(path)
}

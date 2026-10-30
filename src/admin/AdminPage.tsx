import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Segmented } from '../components/Segmented'
import { LoadingState } from '../components/StatusStates'
import type { LeagueData } from '../data/types'
import { adminTersambung, panggil, type Aksi } from './api'
import { HasilAdmin } from './HasilAdmin'
import { PemainAdmin } from './PemainAdmin'
import { SesiAdmin } from './SesiAdmin'

export type Kirim = <T = unknown>(action: Aksi, data?: unknown) => Promise<T>

type Tab = 'sesi' | 'hasil' | 'pemain'
const TABS: { value: Tab; label: string }[] = [
  { value: 'sesi', label: 'Sesi' },
  { value: 'hasil', label: 'Hasil' },
  { value: 'pemain', label: 'Pemain' },
]

const KUNCI_PIN = 'lld-admin-pin'

function bacaPin(): string {
  try {
    return localStorage.getItem(KUNCI_PIN) ?? ''
  } catch {
    return ''
  }
}

function tulisPin(pin: string | null) {
  try {
    if (pin) localStorage.setItem(KUNCI_PIN, pin)
    else localStorage.removeItem(KUNCI_PIN)
  } catch {
    // penyimpanan diblokir: admin cukup memasukkan PIN lagi lain kali
  }
}

export default function AdminPage() {
  const [pin, setPin] = useState(bacaPin)
  const [data, setData] = useState<LeagueData | null>(null)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<Tab>('sesi')

  const masuk = useCallback(async (coba: string) => {
    setError('')
    try {
      const res = await panggil(coba, 'baca')
      tulisPin(coba)
      setPin(coba)
      setData(res.data)
    } catch (err) {
      const pesan = (err as Error).message
      // PIN tetap diingat kalau gagalnya karena jaringan
      if (/PIN salah|Terlalu banyak/.test(pesan)) tulisPin(null)
      setPin('')
      setError(pesan)
    }
  }, [])

  // PIN tersimpan dari kunjungan sebelumnya: langsung coba masuk.
  useEffect(() => {
    const tersimpan = bacaPin()
    if (tersimpan && adminTersambung) void masuk(tersimpan)
  }, [masuk])

  const kirim: Kirim = useCallback(
    async <T,>(action: Aksi, payload?: unknown) => {
      try {
        const res = await panggil<T>(pin, action, payload)
        setData(res.data)
        return res.hasil
      } catch (err) {
        if (/PIN salah/.test((err as Error).message)) {
          tulisPin(null)
          setData(null)
          setPin('')
        }
        throw err
      }
    },
    [pin],
  ) as Kirim

  const keluar = () => {
    tulisPin(null)
    setPin('')
    setData(null)
  }

  return (
    <main className="page admin">
      <div className="wrap">
        <div className="admin-top">
          <Link to="/" className="lbl mute back">
            ← Web publik
          </Link>
          {data && (
            <button type="button" className="lbl mute link-btn" onClick={keluar}>
              Keluar
            </button>
          )}
        </div>
        {!adminTersambung ? (
          <BelumTersambung />
        ) : data ? (
          <>
            <div className="admin-head">
              <h1 className="disp admin-title">Admin</h1>
              <Segmented label="Menu admin" value={tab} options={TABS} onChange={setTab} />
            </div>
            {tab === 'sesi' && <SesiAdmin data={data} kirim={kirim} />}
            {tab === 'hasil' && <HasilAdmin data={data} kirim={kirim} />}
            {tab === 'pemain' && <PemainAdmin data={data} kirim={kirim} />}
          </>
        ) : pin && !error ? (
          <LoadingState />
        ) : (
          <PinGate error={error} onMasuk={masuk} />
        )}
      </div>
    </main>
  )
}

function PinGate({ error, onMasuk }: { error: string; onMasuk: (pin: string) => Promise<void> }) {
  const [isi, setIsi] = useState('')
  const [sibuk, setSibuk] = useState(false)
  const kirim = async (e: FormEvent) => {
    e.preventDefault()
    if (!isi) return
    setSibuk(true)
    await onMasuk(isi)
    setSibuk(false)
  }
  return (
    <form className="pin-gate" onSubmit={kirim}>
      <img src="/logo.svg" alt="" width={96} height={96} />
      <h1 className="disp admin-title">Admin</h1>
      <p className="mute">Masukkan PIN admin untuk mengelola pemain, sesi, dan hasil.</p>
      <input className="input pin-input" type="password" inputMode="numeric" autoComplete="current-password" aria-label="PIN admin" value={isi} autoFocus onChange={(e) => setIsi(e.target.value)} />
      {error && (
        <p className="pin-error" role="alert">
          {error}
        </p>
      )}
      {import.meta.env.DEV && <p className="field-hint">Mode development: PIN contoh 1234, data tidak disimpan permanen.</p>}
      <button type="submit" className="btn" disabled={sibuk || !isi}>
        {sibuk ? 'Memeriksa…' : 'Masuk'}
      </button>
    </form>
  )
}

function BelumTersambung() {
  return (
    <div className="state">
      <h1 className="disp state-title">Belum tersambung</h1>
      <p className="mute">Halaman admin belum disambungkan ke Google Sheets. Pasang Apps Script sesuai panduan di SETUP-SHEETS.md, lalu isi link Web app-nya.</p>
    </div>
  )
}

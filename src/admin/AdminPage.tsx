import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Segmented } from '../components/Segmented'
import { ErrorState, LoadingState } from '../components/StatusStates'
import { PAKAI_FIREBASE } from '../config'
import { useLeagueState } from '../data/DataProvider'
import type { LeagueData } from '../data/types'
import type { Aksi, HasilAksi, InputAksi } from './aksi'
import { ambilBackend, PASSWORD_CONTOH, type Backend } from './api'
import { HasilAdmin } from './HasilAdmin'
import { PemainAdmin } from './PemainAdmin'
import { SesiAdmin } from './SesiAdmin'

export type Kirim = <A extends Aksi>(action: A, data: InputAksi[A]) => Promise<HasilAksi[A]>

type Tab = 'sesi' | 'hasil' | 'pemain'
const TABS: { value: Tab; label: string }[] = [
  { value: 'sesi', label: 'Sesi' },
  { value: 'hasil', label: 'Hasil' },
  { value: 'pemain', label: 'Pemain' },
]

export default function AdminPage() {
  const [backend, setBackend] = useState<Backend | null>(null)
  // null = status login belum diketahui (Firebase masih memeriksa sesi login sebelumnya)
  const [masuk, setMasuk] = useState<boolean | null>(null)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<Tab>('sesi')
  const { state, retry } = useLeagueState()

  useEffect(() => {
    let berhenti: (() => void) | undefined
    let batal = false
    ambilBackend().then(
      (b) => {
        if (batal) return
        setBackend(b)
        berhenti = b.pantauLogin(setMasuk)
      },
      (err: Error) => !batal && setError(err.message),
    )
    return () => {
      batal = true
      berhenti?.()
    }
  }, [])

  const kirim = useCallback<Kirim>((action, data) => backend!.jalankan(action, data), [backend])

  const coba = async (password: string) => {
    setError('')
    try {
      await backend!.masuk(password)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <main className="page admin">
      <div className="wrap">
        <div className="admin-top">
          <Link to="/" className="lbl mute back">
            ← Web publik
          </Link>
          {masuk && (
            <button type="button" className="lbl mute link-btn" onClick={() => void backend?.keluar()}>
              Keluar
            </button>
          )}
        </div>
        {masuk === null && !error ? (
          <LoadingState />
        ) : !masuk ? (
          <LoginGate error={error} onMasuk={coba} />
        ) : state.status === 'loading' ? (
          <LoadingState />
        ) : state.status === 'error' ? (
          <ErrorState detail={state.error.message} onRetry={retry} />
        ) : kosong(state.data) && PAKAI_FIREBASE ? (
          <Impor backend={backend!} />
        ) : (
          <>
            <div className="admin-head">
              <h1 className="disp admin-title">Admin</h1>
              <Segmented label="Menu admin" value={tab} options={TABS} onChange={setTab} />
            </div>
            {tab === 'sesi' && <SesiAdmin data={state.data} kirim={kirim} />}
            {tab === 'hasil' && <HasilAdmin data={state.data} kirim={kirim} />}
            {tab === 'pemain' && <PemainAdmin data={state.data} kirim={kirim} />}
          </>
        )}
      </div>
    </main>
  )
}

const kosong = (d: LeagueData) => d.pemain.length === 0 && d.sesi.length === 0 && d.statistik.length === 0

function LoginGate({ error, onMasuk }: { error: string; onMasuk: (password: string) => Promise<void> }) {
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
      <p className="mute">Masukkan password admin untuk mengelola pemain, sesi, dan hasil.</p>
      <input className="input pin-input" type="password" autoComplete="current-password" aria-label="Password admin" value={isi} autoFocus onChange={(e) => setIsi(e.target.value)} />
      {error && (
        <p className="pin-error" role="alert">
          {error}
        </p>
      )}
      {!PAKAI_FIREBASE && <p className="field-hint">Mode development: password contoh {PASSWORD_CONTOH}, data tidak disimpan permanen.</p>}
      <button type="submit" className="btn" disabled={sibuk || !isi}>
        {sibuk ? 'Memeriksa…' : 'Masuk'}
      </button>
    </form>
  )
}

// Firestore masih kosong: salin data dari Google Sheets sekali saja.
function Impor({ backend }: { backend: Backend }) {
  const [status, setStatus] = useState<{ sibuk: boolean; pesan: string }>({ sibuk: false, pesan: '' })
  const impor = async () => {
    setStatus({ sibuk: true, pesan: '' })
    try {
      const n = await backend.impor()
      setStatus({ sibuk: false, pesan: `${n} baris tersalin.` })
    } catch (err) {
      setStatus({ sibuk: false, pesan: (err as Error).message })
    }
  }
  return (
    <div className="state">
      <h1 className="disp state-title">Database masih kosong</h1>
      <p className="mute">Salin semua data (pemain, sesi, statistik, laga, poin) dari Google Sheets ke Firebase. Cukup sekali; setelah itu Google Sheets jadi arsip.</p>
      <button type="button" className="btn" disabled={status.sibuk} onClick={impor}>
        {status.sibuk ? 'Menyalin…' : 'Impor dari Google Sheets'}
      </button>
      {status.pesan && (
        <p className="mute" role="status">
          {status.pesan}
        </p>
      )}
    </div>
  )
}

import { Link } from 'react-router-dom'

export function LoadingState() {
  return (
    <div className="wrap" aria-busy="true" aria-label="Memuat data">
      <div className="skeleton sk-title" />
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="skeleton sk-row" />
      ))}
    </div>
  )
}

export function ErrorState({ detail, onRetry }: { detail: string; onRetry: () => void }) {
  return (
    <div className="wrap state" role="alert">
      <h1 className="disp state-title">Data belum bisa dimuat</h1>
      <p className="mute">Cek koneksi internet, lalu coba lagi. Kalau masih gagal, kabari admin.</p>
      <p className="lbl mute">{detail}</p>
      <button type="button" className="btn" onClick={onRetry}>
        Coba lagi
      </button>
    </div>
  )
}

export function EmptyState({ judul, pesan }: { judul: string; pesan?: string }) {
  return (
    <div className="state">
      <h2 className="disp state-title">{judul}</h2>
      {pesan && <p className="mute">{pesan}</p>}
    </div>
  )
}

export function NotFound({ pesan = 'Halaman yang kamu cari tidak ada.' }: { pesan?: string }) {
  return (
    <div className="wrap state">
      <div className="lbl gold">404</div>
      <h1 className="disp state-title">Offside.</h1>
      <p className="mute">{pesan}</p>
      <Link className="btn" to="/">
        Kembali ke beranda
      </Link>
    </div>
  )
}

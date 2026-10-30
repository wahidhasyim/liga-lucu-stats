import { useState, type ReactNode } from 'react'

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="field">
      <span className="lbl mute">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  )
}

export function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div className="stepper" role="group" aria-label={label}>
      <button type="button" aria-label={`Kurangi ${label}`} disabled={value === 0} onClick={() => onChange(Math.max(0, value - 1))}>
        −
      </button>
      <span aria-live="polite">{value}</span>
      <button type="button" aria-label={`Tambah ${label}`} onClick={() => onChange(value + 1)}>
        +
      </button>
    </div>
  )
}

type Status = { jenis: 'idle' } | { jenis: 'proses' } | { jenis: 'ok'; pesan: string } | { jenis: 'error'; pesan: string }

// Status simpan bersama untuk bar bawah: menyimpan → tersimpan / error.
export function useSimpan() {
  const [status, setStatus] = useState<Status>({ jenis: 'idle' })
  const jalankan = async (aksi: () => Promise<string>) => {
    setStatus({ jenis: 'proses' })
    try {
      setStatus({ jenis: 'ok', pesan: await aksi() })
    } catch (err) {
      setStatus({ jenis: 'error', pesan: err instanceof Error ? err.message : String(err) })
    }
  }
  return { status, jalankan, sibuk: status.jenis === 'proses' }
}

export function SaveBar({ status, children }: { status: Status; children: ReactNode }) {
  return (
    <div className="savebar">
      <div className="wrap savebar-inner">
        <span className={`savebar-msg ${status.jenis}`} role="status">
          {status.jenis === 'proses' ? 'Menyimpan…' : status.jenis === 'ok' || status.jenis === 'error' ? status.pesan : ''}
        </span>
        <div className="savebar-actions">{children}</div>
      </div>
    </div>
  )
}

export const HURUF_TIM = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

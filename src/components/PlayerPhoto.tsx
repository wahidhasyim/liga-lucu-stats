import { useState } from 'react'
import type { Pemain } from '../data/types'
import { inisial } from '../lib/format'

export function PlayerPhoto({ pemain, size }: { pemain: Pemain; size: 'sm' | 'md' | 'lg' }) {
  const [gagal, setGagal] = useState(false)
  return (
    <div className={`photo photo-${size}`}>
      {pemain.fotoUrl && !gagal ? (
        <img src={pemain.fotoUrl} alt={pemain.nama} loading="lazy" onError={() => setGagal(true)} />
      ) : (
        <span aria-hidden="true">{inisial(pemain.nama)}</span>
      )}
    </div>
  )
}

import type { BarisStanding } from '../stats/compute'

const selisih = (n: number) => (n > 0 ? `+${n}` : String(n))

// Kolom GM/GK disembunyikan di layar sempit supaya SG dan Poin tetap terlihat tanpa scroll.
export function StandingTable({ rows }: { rows: BarisStanding[] }) {
  return (
    <div className="table-scroll">
      <table className="stat-table standing">
        <thead>
          <tr>
            <th className="c-name">Tim</th>
            <th title="Main">Mn</th>
            <th title="Menang">M</th>
            <th title="Seri">S</th>
            <th title="Kalah">K</th>
            <th className="c-opt" title="Gol masuk">GM</th>
            <th className="c-opt" title="Kemasukan">GK</th>
            <th title="Selisih gol">SG</th>
            <th title="Poin (3-1-0)">Poin</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t, i) => (
            <tr key={t.tim} className={i === 0 ? 'juara' : undefined}>
              <td className="c-name">
                <span className="c-rank">{i + 1}</span>
                <span className="st-tim">{t.tim}</span>
              </td>
              <td>{t.main}</td>
              <td>{t.menang}</td>
              <td>{t.seri}</td>
              <td>{t.kalah}</td>
              <td className="c-opt">{t.golMasuk}</td>
              <td className="c-opt">{t.kemasukan}</td>
              <td>{selisih(t.selisih)}</td>
              <td className="st-poin">{t.poin}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

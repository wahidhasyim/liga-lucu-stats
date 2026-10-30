import { Link, useParams } from 'react-router-dom'
import { useLeague } from '../components/Layout'
import { PlayerPhoto } from '../components/PlayerPhoto'
import { PointsChart } from '../components/PointsChart'
import { EmptyState, NotFound } from '../components/StatusStates'
import { formatAngka, formatDesimal, formatPersen, formatTanggalPendek, POSISI_LABEL } from '../lib/format'
import { computePlayerStats, riwayatPemain } from '../stats/compute'

export default function PlayerProfile() {
  const { id } = useParams()
  const data = useLeague()
  const all = computePlayerStats(data)
  const s = all.find((x) => x.pemain.id === id)
  if (!s) return <NotFound pesan="Pemain tidak ditemukan." />

  const { pemain } = s
  const total = all.filter((x) => x.peringkat !== null).length
  const riwayat = riwayatPemain(data, pemain.id)
  const [depan, ...belakang] = pemain.nama.split(' ')
  const keterangan = [POSISI_LABEL[pemain.posisi], s.peringkat ? `Peringkat #${s.peringkat} dari ${total}` : null, pemain.aktif ? null : 'Tidak aktif']
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="wrap">
      <header className="profile-head">
        <PlayerPhoto pemain={pemain} size="lg" />
        <div>
          <div className="lbl gold">{keterangan}</div>
          <h1 className="disp">
            {depan}
            {belakang.length > 0 && (
              <>
                <br />
                {belakang.join(' ')}
              </>
            )}
          </h1>
          <div className="lbl mute">
            “{pemain.panggilan}” · {s.hadir} sesi
          </div>
        </div>
      </header>

      <div className="kpis">
        <div>
          <span className="lbl mute">Rating</span>
          <span className="disp gold">{formatAngka(s.rating)}</span>
        </div>
        <div>
          <span className="lbl mute">Gol</span>
          <span className="disp">{s.gol}</span>
        </div>
        <div>
          <span className="lbl mute">Assist</span>
          <span className="disp">{s.assist}</span>
        </div>
        <div>
          <span className="lbl mute">MOTM</span>
          <span className="disp">{s.motm}</span>
        </div>
      </div>

      {riwayat.length === 0 ? (
        <EmptyState judul="Belum pernah main" pesan="Statistik muncul setelah sesi pertama dicatat." />
      ) : (
        <>
          <section className="block">
            <div className="sec-head">
              <h2 className="disp">Rekap</h2>
            </div>
            <dl className="facts">
              <div>
                <dt>Hadir</dt>
                <dd>{s.hadir}</dd>
              </div>
              <div>
                <dt>Menang</dt>
                <dd>{s.menang}</dd>
              </div>
              <div>
                <dt>Seri</dt>
                <dd>{s.seri}</dd>
              </div>
              <div>
                <dt>Kalah</dt>
                <dd>{s.kalah}</dd>
              </div>
              <div>
                <dt>Win rate</dt>
                <dd>{formatPersen(s.winRate)}</dd>
              </div>
              <div>
                <dt>Poin per sesi</dt>
                <dd>{formatDesimal(s.poinPerSesi)}</dd>
              </div>
            </dl>
          </section>

          <section className="block">
            <div className="sec-head">
              <h2 className="disp">Poin per sesi</h2>
              <span className="lbl mute">Titik emas = MOTM</span>
            </div>
            <PointsChart riwayat={riwayat} />
          </section>

          <section className="block">
            <div className="sec-head">
              <h2 className="disp">Riwayat sesi</h2>
            </div>
            <div className="table-scroll">
              <table className="stat-table rapat">
                <thead>
                  <tr>
                    <th className="c-name">Sesi</th>
                    <th title="Menang-seri-kalah per laga">M-S-K</th>
                    <th>Gol</th>
                    <th>Ast</th>
                    <th>Poin</th>
                  </tr>
                </thead>
                <tbody>
                  {[...riwayat].reverse().map((r) => (
                    <tr key={r.sesi.id}>
                      <td className="c-name">
                        <Link to={`/sesi/${r.sesi.id}`}>Pekan {r.sesi.pekan}</Link>
                        {r.motm && <span className="badge-motm">MOTM</span>}
                        <span className="c-sub">{[formatTanggalPendek(r.sesi.tanggal), r.tim].filter(Boolean).join(' · ')}</span>
                      </td>
                      <td>{r.menang + r.seri + r.kalah > 0 ? `${r.menang}-${r.seri}-${r.kalah}` : '–'}</td>
                      <td>{r.gol}</td>
                      <td>{r.assist}</td>
                      <td>{formatAngka(r.poin)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  )
}

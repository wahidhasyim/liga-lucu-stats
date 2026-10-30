import { Link } from 'react-router-dom'
import { useLeague } from '../components/Layout'
import { Leaderboard } from '../components/Leaderboard'
import { PlayerPhoto } from '../components/PlayerPhoto'
import { StandingTable } from '../components/StandingTable'
import { EmptyState } from '../components/StatusStates'
import type { LeagueData, Sesi } from '../data/types'
import { formatTanggal } from '../lib/format'
import { barisSesi, computePlayerStats, lagaSesi, ringkasan, sortBy, standingSesi, type StatKey } from '../stats/compute'

const BOARDS: { judul: string; key: StatKey }[] = [
  { judul: 'Rating pemain', key: 'rating' },
  { judul: 'Topskor', key: 'gol' },
  { judul: 'Top assist', key: 'assist' },
  { judul: 'Raja MOTM', key: 'motm' },
]

function SesiTerakhir({ data, sesi }: { data: LeagueData; sesi: Sesi }) {
  const baris = barisSesi(data, sesi.id)
  const motm = baris.filter((b) => b.baris.motm)
  const pencetak = baris.filter((b) => b.baris.gol > 0).sort((a, b) => b.baris.gol - a.baris.gol)
  const standing = standingSesi(lagaSesi(data, sesi.id))
  return (
    <section className="latest">
      <div className="sec-head">
        <h2 className="disp">Sesi terakhir</h2>
        <Link className="lbl gold" to={`/sesi/${sesi.id}`}>
          Detail
        </Link>
      </div>
      <div className="lbl mute">
        {formatTanggal(sesi.tanggal)}
        {sesi.lokasi && ` · ${sesi.lokasi}`}
      </div>
      {motm.map((m) => (
        <Link key={m.pemain.id} className="latest-motm" to={`/pemain/${m.pemain.id}`}>
          <PlayerPhoto pemain={m.pemain} size="sm" />
          <div>
            <div className="lbl gold">Man of the match</div>
            <div className="disp latest-name">{m.pemain.nama}</div>
          </div>
        </Link>
      ))}
      {pencetak.length > 0 && (
        <div>
          <div className="lbl mute">Pencetak gol</div>
          <div className="scorers">
            {pencetak.map((p) => (
              <Link key={p.pemain.id} to={`/pemain/${p.pemain.id}`}>
                {p.pemain.panggilan} <span className="gold">{p.baris.gol}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
      {standing.length > 0 && (
        <div>
          <div className="lbl mute">Klasemen sesi</div>
          <StandingTable rows={standing} />
        </div>
      )}
    </section>
  )
}

export default function Home() {
  const data = useLeague()
  const stats = computePlayerStats(data).filter((s) => s.peringkat !== null)
  const r = ringkasan(data)
  const terakhir = data.sesi.at(-1)

  return (
    <>
      <section className="wrap hero">
        <img className="hero-logo" src="/logo.svg" alt="Logo Liga Lucu Depok" />
        <div>
          <div className="lbl gold">{terakhir ? `Pekan ${terakhir.pekan} · ${formatTanggal(terakhir.tanggal)}` : 'Fun football tiap weekend'}</div>
          <h1 className="disp">
            Bukan liga pro.
            <br />
            <span className="gold">Ini liga lucu.</span>
          </h1>
        </div>
      </section>
      <div className="wrap">
        <div className="band">
          <div>
            <span className="lbl">Sesi</span>
            <span className="disp">{r.totalSesi}</span>
          </div>
          <div>
            <span className="lbl">Gol</span>
            <span className="disp">{r.totalGol}</span>
          </div>
          <div>
            <span className="lbl">Pemain</span>
            <span className="disp">{r.pemainAktif}</span>
          </div>
        </div>
        {terakhir ? (
          <>
            <SesiTerakhir data={data} sesi={terakhir} />
            <div className="boards">
              {BOARDS.map((b) => (
                <Leaderboard
                  key={b.key}
                  judul={b.judul}
                  statKey={b.key}
                  items={sortBy(stats, b.key).filter((s) => s[b.key] > 0).slice(0, 3)}
                  lihatSemua={`/statistik?urut=${b.key}`}
                />
              ))}
            </div>
          </>
        ) : (
          <EmptyState judul="Belum ada pertandingan" pesan="Leaderboard muncul setelah sesi pertama dicatat di Google Sheets." />
        )}
      </div>
    </>
  )
}

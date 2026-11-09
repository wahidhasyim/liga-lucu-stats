import { Link } from 'react-router-dom'
import { useLeague } from '../components/Layout'
import { Leaderboard } from '../components/Leaderboard'
import { PlayerPhoto } from '../components/PlayerPhoto'
import { StandingTable } from '../components/StandingTable'
import { EmptyState } from '../components/StatusStates'
import type { LeagueData, Sesi } from '../data/types'
import { formatDesimal, formatTanggal, isoHariIni } from '../lib/format'
import { barisSesi, computePlayerStats, jumlahLaga, kebobolanPerLaga, lagaSesi, peringkatKiper, ringkasan, sortBy, sesiLive, standingSesi, sudahMain, timSesi, type PlayerStats, type StatKey } from '../stats/compute'

// Papan rating hanya untuk pemain yang sudah cukup sering hadir, supaya satu sesi bagus tidak langsung juara.
const MIN_HADIR_RATING = 3

const BOARDS: { judul: string; key: StatKey }[] = [
  { judul: 'Topskor', key: 'gol' },
  { judul: 'Top assist', key: 'assist' },
  { judul: 'Raja MOTM', key: 'motm' },
]

function papanRating(stats: PlayerStats[]): PlayerStats[] {
  const main = sortBy(stats, 'rating').filter((s) => s.pemain.aktif && s.hadir > 0)
  const cukup = main.filter((s) => s.hadir >= MIN_HADIR_RATING)
  return cukup.length > 0 ? cukup : main
}

function SesiTerakhir({ data, sesi }: { data: LeagueData; sesi: Sesi }) {
  const baris = barisSesi(data, sesi.id)
  const motm = baris.filter((b) => b.baris.motm)
  const pencetak = baris.filter((b) => b.baris.gol > 0).sort((a, b) => b.baris.gol - a.baris.gol || b.baris.assist - a.baris.assist)
  const standing = standingSesi(lagaSesi(data, sesi.id), timSesi(data, sesi.id))
  return (
    <section className="latest">
      <div className="sec-head">
        <h2 className="disp">
          {sesiLive(data, sesi.id, isoHariIni()) ? (
            <>
              Sedang main <span className="live-tag">Live</span>
            </>
          ) : (
            'Sesi terakhir'
          )}
        </h2>
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
  // sesi yang baru disusun line-up-nya (hari ini/nanti, belum ada hasil) belum dihitung sebagai sesi terakhir
  const hariIni = isoHariIni()
  const terakhir = data.sesi.filter((s) => s.tanggal < hariIni || (s.tanggal === hariIni && sudahMain(data, s.id))).at(-1)

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
              <Leaderboard
                judul="Rating pemain"
                statKey="rating"
                items={papanRating(stats).slice(0, 3)}
                lihatSemua="/statistik?urut=rating"
                nilai={(s) => formatDesimal(s.rating)}
                catatan={`Rata-rata rating per sesi (1–10)${stats.some((s) => s.hadir >= MIN_HADIR_RATING) ? `, minimal hadir ${MIN_HADIR_RATING} sesi` : ''}.`}
              />
              {BOARDS.map((b) => (
                <Leaderboard
                  key={b.key}
                  judul={b.judul}
                  statKey={b.key}
                  items={sortBy(stats, b.key, { data }).filter((s) => s[b.key] > 0).slice(0, 3)}
                  lihatSemua={`/statistik?urut=${b.key}`}
                />
              ))}
              <Leaderboard
                judul="Kiper terbaik"
                statKey="rating"
                items={peringkatKiper(stats).slice(0, 3)}
                nilai={(s) => formatDesimal(kebobolanPerLaga(s))}
                keterangan={(s) => `${s.cleanSheet} clean sheet · ${jumlahLaga(s)} laga`}
                catatan="Angka: rata-rata kebobolan per laga, makin kecil makin bagus."
              />
            </div>
          </>
        ) : (
          <EmptyState judul="Belum ada pertandingan" pesan="Leaderboard muncul setelah sesi pertama dicatat di halaman admin." />
        )}
      </div>
    </>
  )
}

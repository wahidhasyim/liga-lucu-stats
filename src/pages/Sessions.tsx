import { Link } from "react-router-dom";
import { useLeague } from "../components/Layout";
import { EmptyState } from "../components/StatusStates";
import type { Sesi } from "../data/types";
import { formatTanggal, isoHariIni } from "../lib/format";
import { barisSesi, lineupSesi, sesiAkanDatang } from "../stats/compute";

export default function Sessions() {
  const data = useLeague();
  const akanDatang = sesiAkanDatang(data, isoHariIni());
  const idAkanDatang = new Set(akanDatang.map((s) => s.id));
  const list = data.sesi.filter((s) => !idAkanDatang.has(s.id)).reverse();

  const barisAkanDatang = (s: Sesi) => {
    const lineup = lineupSesi(data, s.id);
    const pemain = lineup.reduce((n, g) => n + g.pemain.length, 0);
    const tim = lineup.filter((g) => g.tim).length;
    return (
      <Link key={s.id} className="sesi-row" to={`/sesi/${s.id}`}>
        <div>
          <div className="lbl mute">Pekan</div>
          <div className="sesi-week">{s.pekan}</div>
        </div>
        <div className="sesi-meta">
          <div className="sesi-date">{formatTanggal(s.tanggal)}</div>
          <div className="mute">
            {[s.lokasi, `${pemain} pemain`].filter(Boolean).join(" · ")}
          </div>
          <div className="lbl gold">Lihat line-up →</div>
        </div>
        <div className="sesi-goals">
          <div className="disp">{tim}</div>
          <div className="lbl mute">Tim</div>
        </div>
      </Link>
    );
  };

  return (
    <div className="wrap">
      <div className="lbl gold">Arsip</div>
      <h1 className="disp page-title">
        Tiap pekan
        <br />
        <span className="gold">ada ceritanya.</span>
      </h1>
      {akanDatang.length > 0 && (
        <section className="block">
          <div className="sec-head">
            <h2 className="disp">Sesi yang akan datang</h2>
            <span className="lbl mute">{akanDatang.length} sesi</span>
          </div>
          <div>{akanDatang.map(barisAkanDatang)}</div>
        </section>
      )}
      {akanDatang.length > 0 && list.length > 0 && (
        <div className="sec-head">
          <h2 className="disp">Sudah dimainkan</h2>
        </div>
      )}
      {list.length === 0 ? (
        akanDatang.length > 0 ? null : (
          <EmptyState
            judul="Belum ada pertandingan"
            pesan="Sesi muncul di sini setelah admin mengisi tab Sesi dan Statistik."
          />
        )
      ) : (
        <div>
          {list.map((s) => {
            const baris = barisSesi(data, s.id);
            const gol = baris.reduce((n, b) => n + b.baris.gol, 0);
            const motm = baris
              .filter((b) => b.baris.motm)
              .map((b) => b.pemain.panggilan)
              .join(", ");
            return (
              <Link key={s.id} className="sesi-row" to={`/sesi/${s.id}`}>
                <div>
                  <div className="lbl mute">Pekan</div>
                  <div className="sesi-week">{s.pekan}</div>
                </div>
                <div className="sesi-meta">
                  <div className="sesi-date">{formatTanggal(s.tanggal)}</div>
                  <div className="mute">
                    {[s.lokasi, `${baris.length} pemain`]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                  {motm && <div className="lbl gold">MOTM · {motm}</div>}
                </div>
                <div className="sesi-goals">
                  <div className="disp">{gol}</div>
                  <div className="lbl mute">Gol</div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { Link, NavLink } from 'react-router-dom'

const LINKS = [
  { to: '/', label: 'Beranda', end: true },
  { to: '/statistik', label: 'Statistik' },
  { to: '/pemain', label: 'Pemain' },
  { to: '/sesi', label: 'Sesi' },
]

export function Nav() {
  return (
    <header className="nav">
      <div className="wrap nav-inner">
        <Link to="/" className="nav-brand" aria-label="Liga Lucu Depok, beranda">
          <img src="/logo.svg" alt="" width={36} height={36} />
          <span>Liga Lucu Depok</span>
        </Link>
        <nav className="nav-links" aria-label="Navigasi utama">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end}>
              {l.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  )
}

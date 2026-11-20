import { Link } from 'react-router-dom'
import { Logo } from '../ui/Logo'

export function Footer() {
  return (
    <footer className="mt-16 border-t border-white/[0.07] bg-ink-950/80">
      <div className="mx-auto flex max-w-[1800px] flex-col gap-6 px-4 py-10 sm:px-6 lg:flex-row lg:items-start lg:justify-between lg:px-10">
        <div className="max-w-sm space-y-3">
          <Logo />
          <p className="text-sm leading-relaxed text-white/45">
            Interface de streaming : catalogue TMDB, ma liste locale et lecteur HLS. Les flux vidéo
            proviennent exclusivement des instances CinePro / AutoFlix que vous configurez.
          </p>
        </div>

        <div className="grid gap-6 text-sm sm:grid-cols-2 lg:gap-12">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">Navigation</p>
            <ul className="mt-3 space-y-2">
              <li>
                <Link to="/" className="link-muted">
                  Accueil
                </Link>
              </li>
              <li>
                <Link to="/ma-liste" className="link-muted">
                  Ma liste
                </Link>
              </li>
              <li>
                <Link to="/search" className="link-muted">
                  Recherche
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">Résolution</p>
            <ul className="mt-3 space-y-2">
              <li>
                <a
                  href="https://github.com/cinepro-org/core"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="link-muted"
                >
                  CinePro Core
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/PaulExplorer/autoflix-cli"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="link-muted"
                >
                  AutoFlix CLI
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/4texas4/movie-scraper"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="link-muted"
                >
                  movie-scraper (référence HLS)
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-white/[0.06] px-4 py-5 sm:px-6 lg:px-10">
        <p className="mx-auto max-w-[1800px] text-xs leading-relaxed text-white/30">
          This product uses the TMDB API but is not endorsed or certified by TMDB. Projet de démonstration
          technique — vous êtes responsable de l&apos;usage des sources que vous connectez.
        </p>
      </div>
    </footer>
  )
}

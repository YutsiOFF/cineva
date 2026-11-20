import { useEffect, useState, type FormEvent } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { cn } from '../../lib/cn'
import { Logo } from '../ui/Logo'
import { BookmarkIcon, CloseIcon, MenuIcon, SearchIcon } from '../ui/icons'
import { ProfileMenu } from './ProfileMenu'

const navItems = [
  { to: '/', label: 'Accueil', end: true },
  { to: '/ma-liste', label: 'Ma liste', end: false },
]

export function Header() {
  const [elevated, setElevated] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const onScroll = () => setElevated(window.scrollY > 18)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Ferme le panneau mobile à chaque navigation.
  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname, location.search])

  useEffect(() => {
    if (!menuOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [menuOpen])

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = query.trim()
    if (!trimmed) {
      navigate('/search')
      return
    }
    navigate(`/search?q=${encodeURIComponent(trimmed)}`)
    setQuery('')
    setMenuOpen(false)
  }

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-colors duration-500',
        elevated || menuOpen
          ? 'border-b border-white/[0.07] bg-ink-950/90 backdrop-blur-xl'
          : 'bg-gradient-to-b from-black/70 via-black/25 to-transparent',
      )}
    >
      <div className="mx-auto flex h-16 max-w-[1800px] items-center gap-4 px-4 sm:px-6 lg:h-[72px] lg:gap-8 lg:px-10">
        <Logo />

        <nav aria-label="Navigation principale" className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'rounded-lg px-3 py-2 text-sm font-medium transition',
                  isActive ? 'text-white' : 'text-white/60 hover:text-white',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <form
            role="search"
            onSubmit={submitSearch}
            className="hidden items-center gap-2 rounded-full border border-white/15 bg-black/40 px-3 py-1.5 transition focus-within:border-accent/70 focus-within:bg-black/60 sm:flex"
          >
            <SearchIcon className="h-4 w-4 shrink-0 text-white/50" />
            <label htmlFor="header-search" className="sr-only">
              Rechercher un film ou une série
            </label>
            <input
              id="header-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Films, séries…"
              autoComplete="off"
              className="w-32 bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none lg:w-48"
            />
          </form>

          <NavLink
            to="/search"
            aria-label="Rechercher"
            className="btn-icon sm:hidden"
          >
            <SearchIcon className="h-4 w-4" />
          </NavLink>

          <ProfileMenu />

          <button
            type="button"
            onClick={() => setMenuOpen((value) => !value)}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            className="btn-icon md:hidden"
          >
            {menuOpen ? <CloseIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div id="mobile-nav" className="animate-fade-in border-t border-white/[0.07] px-4 pb-5 pt-3 md:hidden">
          <form role="search" onSubmit={submitSearch} className="mb-3 flex items-center gap-2 rounded-xl border border-white/15 bg-black/50 px-3 py-2">
            <SearchIcon className="h-4 w-4 text-white/50" />
            <label htmlFor="mobile-search" className="sr-only">
              Rechercher un film ou une série
            </label>
            <input
              id="mobile-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher un titre…"
              autoComplete="off"
              className="w-full bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none"
            />
          </form>
          <nav aria-label="Navigation mobile" className="grid gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
                    isActive ? 'bg-white/10 text-white' : 'text-white/65 hover:bg-white/5 hover:text-white',
                  )
                }
              >
                <BookmarkIcon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      )}
    </header>
  )
}

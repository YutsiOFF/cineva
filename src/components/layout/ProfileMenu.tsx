import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMyList } from '../../store/myList'
import { BookmarkIcon, ChevronDownIcon, SearchIcon, TrashIcon } from '../ui/icons'

/**
 * Menu profil. Le site n'a pas d'authentification : le profil est un simple
 * menu local (liste, recherche, purge des données stockées).
 */
export function ProfileMenu() {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const items = useMyList((state) => state.items)
  const clear = useMyList((state) => state.clear)

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const handleClear = () => {
    if (items.length === 0) return
    if (window.confirm('Vider entièrement votre liste ?')) {
      clear()
      setOpen(false)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Ouvrir le menu du profil"
        className="flex items-center gap-2 rounded-full p-1 pr-1.5 transition hover:bg-white/10"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-accent via-indigo-500 to-accent-cyan font-display text-xs font-bold text-white ring-2 ring-white/20">
          CV
        </span>
        <ChevronDownIcon
          className={`hidden h-4 w-4 text-white/60 transition sm:block ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Menu du profil"
          className="absolute right-0 z-50 mt-3 w-64 origin-top-right animate-fade-in overflow-hidden rounded-2xl border border-white/10 bg-ink-900/95 shadow-2xl backdrop-blur-xl"
        >
          <div className="border-b border-white/[0.07] px-4 py-4">
            <p className="font-display text-sm font-semibold">Mon profil</p>
            <p className="mt-0.5 text-xs text-white/45">Mode invité · données locales</p>
          </div>

          <div className="p-1.5">
            <Link
              role="menuitem"
              to="/ma-liste"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/75 transition hover:bg-white/[0.07] hover:text-white"
            >
              <BookmarkIcon className="h-4 w-4 text-accent-soft" />
              Ma liste
              <span className="ml-auto rounded-md bg-white/10 px-1.5 py-0.5 text-[11px] font-semibold text-white/70">
                {items.length}
              </span>
            </Link>
            <Link
              role="menuitem"
              to="/search"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/75 transition hover:bg-white/[0.07] hover:text-white"
            >
              <SearchIcon className="h-4 w-4 text-accent-soft" />
              Rechercher
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={handleClear}
              disabled={items.length === 0}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-white/75 transition hover:bg-red-500/10 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <TrashIcon className="h-4 w-4" />
              Vider ma liste
            </button>
          </div>

          <p className="border-t border-white/[0.07] px-4 py-3 text-[11px] leading-relaxed text-white/35">
            Aucun compte : votre liste est enregistrée dans le localStorage de ce navigateur.
          </p>
        </div>
      )}
    </div>
  )
}

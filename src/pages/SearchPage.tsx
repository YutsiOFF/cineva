import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MediaGrid } from '../components/media/MediaGrid'
import { ErrorState } from '../components/ui/ErrorState'
import { SearchIcon, CloseIcon } from '../components/ui/icons'
import { cn } from '../lib/cn'
import { useAsync } from '../hooks/useAsync'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { searchMulti, TmdbError } from '../services/tmdb'
import type { MediaKind } from '../types/media'

type Filter = 'all' | MediaKind

const filters: Array<{ value: Filter; label: string }> = [
  { value: 'all', label: 'Tout' },
  { value: 'movie', label: 'Films' },
  { value: 'tv', label: 'Séries' },
]

/** Recherche multi (films + séries) avec debounce et filtres client. */
export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const query = (searchParams.get('q') ?? '').trim()
  const [input, setInput] = useState(query)
  const [filter, setFilter] = useState<Filter>('all')
  const debounced = useDebouncedValue(input, 350)

  // L'URL reste la source de vérité (partage de lien, retour arrière).
  useEffect(() => {
    setInput(query)
  }, [query])

  useEffect(() => {
    const next = debounced.trim()
    if (next === query) return
    setSearchParams(next ? { q: next } : {}, { replace: true })
  }, [debounced, query, setSearchParams])

  const { data, error, loading, reload } = useAsync(
    (signal) => (query.length >= 2 ? searchMulti(query, 1, signal) : Promise.resolve(null)),
    [query],
  )

  const items = useMemo(() => {
    const all = data?.items ?? []
    return filter === 'all' ? all : all.filter((item) => item.kind === filter)
  }, [data, filter])

  return (
    <div className="animate-fade-in px-4 pb-10 pt-24 sm:px-6 lg:px-10 lg:pt-28">
      <div className="mx-auto max-w-[1500px]">
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Recherche</h1>

        <form
          role="search"
          onSubmit={(event) => event.preventDefault()}
          className="mt-5 flex items-center gap-3 rounded-2xl border border-white/15 bg-ink-850/80 px-4 py-3 transition focus-within:border-accent/60"
        >
          <SearchIcon className="h-5 w-5 shrink-0 text-white/40" />
          <label htmlFor="search-page-input" className="sr-only">
            Rechercher un film ou une série
          </label>
          <input
            id="search-page-input"
            type="search"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Titre d'un film, d'une série…"
            autoComplete="off"
            autoFocus
            className="w-full bg-transparent text-base text-white placeholder:text-white/35 focus:outline-none"
          />
          {input && (
            <button
              type="button"
              onClick={() => {
                setInput('')
                setSearchParams({}, { replace: true })
              }}
              aria-label="Effacer la recherche"
              className="rounded-full p-1 text-white/40 transition hover:bg-white/10 hover:text-white"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          )}
        </form>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          {filters.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
              aria-pressed={filter === item.value}
              className={cn(
                'rounded-full border px-3.5 py-1.5 text-xs font-medium transition',
                filter === item.value
                  ? 'border-transparent bg-accent-gradient text-white'
                  : 'border-white/15 text-white/60 hover:border-white/35 hover:text-white',
              )}
            >
              {item.label}
            </button>
          ))}
          {data && query.length >= 2 && (
            <p className="ml-auto text-xs text-white/35">
              {items.length} résultat{items.length > 1 ? 's' : ''}
              {data.totalResults > data.items.length ? '+' : ''}
            </p>
          )}
        </div>

        <div className="mt-8">
          {query.length > 0 && query.length < 2 && (
            <p className="text-sm text-white/45">Saisissez au moins 2 caractères.</p>
          )}

          {query.length < 2 && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
              <p className="font-display text-base font-medium text-white/80">
                Trouvez votre prochain film ou votre prochaine série
              </p>
              <p className="mx-auto mt-1.5 max-w-md text-sm text-white/40">
                La recherche interroge tout le catalogue TMDB, en français.
              </p>
            </div>
          )}

          {error && (
            <ErrorState
              title="Recherche impossible"
              message={error instanceof TmdbError ? error.message : 'Une erreur réseau est survenue.'}
              onRetry={reload}
            />
          )}

          {query.length >= 2 && !error && (
            <>
              {loading && <MediaGrid items={[]} loading skeletonCount={12} />}
              {!loading && items.length === 0 && data && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-10 text-center">
                  <p className="font-display text-base font-medium text-white/80">Aucun résultat</p>
                  <p className="mt-1.5 text-sm text-white/40">
                    Rien ne correspond à « {query} »{filter !== 'all' ? ' dans ce filtre' : ''}.
                  </p>
                </div>
              )}
              {!loading && items.length > 0 && <MediaGrid items={items} />}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

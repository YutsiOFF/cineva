import { useMemo } from 'react'
import { MediaRow, MediaRowsSkeleton } from '../components/media/MediaRow'
import { HeroBanner } from '../components/media/HeroBanner'
import { ApiKeyNotice, ErrorState } from '../components/ui/ErrorState'
import { HeroSkeleton } from '../components/ui/Skeleton'
import { homeRows, type MediaRowDefinition } from '../config/rows'
import { useAsync } from '../hooks/useAsync'
import { hasTmdbKey, TmdbError } from '../services/tmdb'
import type { MediaSummary } from '../types/media'

interface LoadedRow extends MediaRowDefinition {
  items: MediaSummary[]
}

/**
 * Accueil : héro + rangées chargées en parallèle. `allSettled` garantit qu'une
 * rangée en échec (genre vide, rate limit) ne casse pas toute la page.
 */
export default function HomePage() {
  const { data, error, loading, reload } = useAsync<LoadedRow[]>(async () => {
    const results = await Promise.allSettled(homeRows.map((row) => row.load()))
    const rows = homeRows.map((row, index) => {
      const result = results[index]
      return { ...row, items: result.status === 'fulfilled' ? result.value : [] }
    })

    // Si *toutes* les rangées échouent (clé refusée, réseau coupé), on remonte
    // l'erreur réelle : l'écran affiche la cause au lieu d'un catalogue vide.
    if (rows.every((row) => row.items.length === 0)) {
      const firstFailure = results.find((result) => result.status === 'rejected')
      if (firstFailure && firstFailure.status === 'rejected') throw firstFailure.reason
    }

    return rows
  }, [])

  const hero = useMemo<MediaSummary | null>(() => {
    const trending = data?.[0]?.items ?? []
    const candidates = trending.filter((item) => item.backdropPath)
    if (candidates.length === 0) return trending[0] ?? null
    // Met en avant un titre différent à chaque chargement, parmi le top 5.
    return candidates[Math.floor(Math.random() * Math.min(5, candidates.length))]
  }, [data])

  if (!hasTmdbKey) return <ApiKeyNotice />

  if (error) {
    const unauthorized = error instanceof TmdbError && error.status === 401
    if (unauthorized) return <ApiKeyNotice detail={error.message} />
    return (
      <div className="px-4 pt-32">
        <ErrorState
          title="Impossible de charger le catalogue"
          message={error.message}
          onRetry={reload}
        />
      </div>
    )
  }

  if (loading && !data) {
    return (
      <>
        <HeroSkeleton />
        <MediaRowsSkeleton count={3} />
      </>
    )
  }

  const rows = data ?? []

  return (
    <div className="animate-fade-in pb-10">
      {hero ? <HeroBanner media={hero} /> : null}

      <div className="relative z-10 -mt-6 space-y-9 lg:-mt-10">
        {rows.map((row) => (
          <MediaRow key={row.key} title={row.title} items={row.items} />
        ))}
        {rows.every((row) => row.items.length === 0) && (
          <div className="px-4">
            <ErrorState
              title="Catalogue indisponible"
              message="TMDB n'a renvoyé aucun contenu. Vérifiez votre connexion puis réessayez."
              onRetry={reload}
            />
          </div>
        )}
      </div>
    </div>
  )
}

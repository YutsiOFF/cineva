import type { MediaSummary } from '../../types/media'
import { CardSkeleton } from '../ui/Skeleton'
import { MediaCard } from './MediaCard'

interface MediaGridProps {
  items: MediaSummary[]
  loading?: boolean
  skeletonCount?: number
  columns?: 'default' | 'wide'
}

/** Grille responsive d'affiches (recherche, ma liste, similaires). */
export function MediaGrid({ items, loading = false, skeletonCount = 12, columns = 'default' }: MediaGridProps) {
  const gridClass =
    columns === 'wide'
      ? 'grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
      : 'grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7'

  if (loading) {
    return (
      <div className={gridClass} aria-busy="true" aria-label="Chargement du catalogue">
        {Array.from({ length: skeletonCount }).map((_, index) => (
          <CardSkeleton key={index} />
        ))}
      </div>
    )
  }

  return (
    <div className={gridClass}>
      {items.map((media) => (
        <MediaCard key={`${media.kind}-${media.id}`} media={media} showCaption />
      ))}
    </div>
  )
}

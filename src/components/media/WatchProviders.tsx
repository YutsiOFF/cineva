import { cn } from '../../lib/cn'
import { useAsync } from '../../hooks/useAsync'
import {
  availabilityConfigured,
  fetchWatchAvailability,
  offerTypeLabel,
  watchRegionName,
  WATCH_REGION,
  type ProviderOffer,
} from '../../services/watchProviders'
import type { MediaKind } from '../../types/media'
import { ExternalLinkIcon, RefreshIcon } from '../ui/icons'
import { Skeleton } from '../ui/Skeleton'

interface WatchProvidersProps {
  kind: MediaKind
  tmdbId: number
  className?: string
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('')
}

function OfferCard({ offer }: { offer: ProviderOffer }) {
  return (
    <li>
      <a
        href={offer.url}
        target="_blank"
        rel="noreferrer noopener"
        className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 transition hover:border-white/25 hover:bg-white/[0.07]"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/20 font-display text-[11px] font-bold text-accent-soft">
          {initials(offer.provider)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-white/90">{offer.provider}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11px] text-white/45">
            <span>{offerTypeLabel[offer.type]}</span>
            {offer.quality && <span>· {offer.quality}</span>}
            {offer.price && <span>· {offer.price}</span>}
            {offer.language && <span>· {offer.language}</span>}
          </span>
        </span>
        <ExternalLinkIcon className="h-3.5 w-3.5 shrink-0 text-white/30 transition group-hover:text-white" />
        <span className="sr-only">(ouvre le site officiel de {offer.provider})</span>
      </a>
    </li>
  )
}

/**
 * Section « Où regarder » : plateformes légales et liens officiels.
 * Alimentée par Watchmode et/ou Streaming Availability (Movie of the Night).
 */
export function WatchProviders({ kind, tmdbId, className }: WatchProvidersProps) {
  const { data, error, loading, reload } = useAsync(
    (signal) => fetchWatchAvailability({ kind, tmdbId }, signal),
    [kind, tmdbId],
  )

  if (!availabilityConfigured) {
    return (
      <section aria-label="Où regarder" className={cn('rounded-2xl border border-white/10 bg-white/[0.02] p-4', className)}>
        <h2 className="font-display text-sm font-semibold uppercase tracking-[0.16em] text-white/40">Où regarder</h2>
        <p className="mt-2 text-xs leading-relaxed text-white/40">
          Ajoutez une clé <span className="text-accent-soft">VITE_WATCHMODE_API_KEY</span> ou{' '}
          <span className="text-accent-soft">VITE_STREAMING_AVAILABILITY_API_KEY</span> pour afficher les
          plateformes légales et leurs liens officiels (FR par défaut).
        </p>
      </section>
    )
  }

  const offers = data?.offers ?? []
  const warnings = data?.warnings ?? []

  return (
    <section aria-labelledby={`watch-providers-${kind}-${tmdbId}`} className={className}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2
          id={`watch-providers-${kind}-${tmdbId}`}
          className="font-display text-lg font-semibold tracking-tight"
        >
          Où regarder
        </h2>
        <p className="text-[11px] text-white/35">Disponibilité en {watchRegionName}</p>
      </div>

      {loading && (
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-[58px] rounded-xl" />
          ))}
        </div>
      )}

      {!loading && error && (
        <div role="alert" className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-xs text-white/55">
          <span>Impossible de charger la disponibilité : {error.message}</span>
          <button type="button" onClick={reload} className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-white/70 transition hover:bg-white/10 hover:text-white">
            <RefreshIcon className="h-3.5 w-3.5" />
            Réessayer
          </button>
        </div>
      )}

      {!loading && !error && offers.length === 0 && (
        <p className="mt-3 text-sm text-white/45">
          Aucune plateforme référencée pour ce titre en {watchRegionName}.
        </p>
      )}

      {offers.length > 0 && (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {offers.map((offer) => (
            <OfferCard key={offer.id} offer={offer} />
          ))}
        </ul>
      )}

      {warnings.length > 0 && (
        <p className="mt-3 text-[11px] text-amber-200/60">{warnings.join(' · ')}</p>
      )}

      <p className="mt-3 text-[10px] leading-relaxed text-white/25">
        Liens officiels fournis par Watchmode / Movie of the Night ({WATCH_REGION}). Les plateformes
        peuvent retirer un titre ; le lien fait foi.
      </p>
    </section>
  )
}

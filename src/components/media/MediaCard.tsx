import { Link } from 'react-router-dom'
import { cn } from '../../lib/cn'
import { ratingOf, yearOf } from '../../lib/format'
import { useIsInMyList, useMyList } from '../../store/myList'
import type { MediaSummary } from '../../types/media'
import { CheckIcon, PlayIcon, PlusIcon, StarIcon } from '../ui/icons'
import { PosterImage } from '../ui/PosterImage'

interface MediaCardProps {
  media: MediaSummary
  /** Affiche le titre sous l'affiche (utile hors survol, mobile inclus). */
  showCaption?: boolean
  className?: string
}

export function detailHref(media: Pick<MediaSummary, 'kind' | 'id'>): string {
  return media.kind === 'movie' ? `/film/${media.id}` : `/serie/${media.id}`
}

export function watchHref(media: Pick<MediaSummary, 'kind' | 'id'>): string {
  return media.kind === 'movie' ? `/watch/movie/${media.id}` : `/watch/tv/${media.id}?s=1&e=1`
}

/**
 * Carte d'affiche : survol -> zoom, dégradé, note, boutons « Lecture » et
 * « Ma liste ». La carte entière est un lien vers la fiche, les actions sont
 * posées au-dessus (z-index) pour rester cliquables et accessibles au clavier.
 */
export function MediaCard({ media, showCaption = false, className }: MediaCardProps) {
  const inList = useIsInMyList(media.kind, media.id)
  const toggle = useMyList((state) => state.toggle)

  return (
    <div className={cn('group relative w-full', className)}>
      <Link
        to={detailHref(media)}
        aria-label={`${media.title} — voir la fiche`}
        className="block rounded-xl focus-visible:ring-offset-4"
      >
        <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-ink-850 ring-1 ring-white/[0.07] transition duration-300 ease-smooth group-hover:-translate-y-1 group-hover:shadow-card group-hover:ring-white/25">
          <PosterImage
            path={media.posterPath}
            title={media.title}
            className="transition duration-500 ease-smooth group-hover:scale-[1.06]"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-transparent opacity-0 transition duration-300 group-hover:opacity-100 group-focus-visible:opacity-100" />

          <span className="absolute left-2 top-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/80 backdrop-blur">
            {media.kind === 'movie' ? 'Film' : 'Série'}
          </span>

          <div className="absolute inset-x-0 bottom-0 translate-y-3 p-3 opacity-0 transition duration-300 ease-smooth group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
            <p className="line-clamp-2 font-display text-sm font-semibold leading-snug text-white">
              {media.title}
            </p>
            <div className="mt-1.5 flex items-center gap-2.5 text-[11px] text-white/60">
              <span>{yearOf(media.releaseDate)}</span>
              <span className="flex items-center gap-1 text-amber-300">
                <StarIcon className="h-3 w-3" />
                {ratingOf(media.voteAverage)}
              </span>
            </div>
          </div>
        </div>
      </Link>

      {/* Actions rapides : toujours visibles au clavier, au survol à la souris. */}
      <div className="absolute right-2 top-2 z-10 flex flex-col gap-1.5 opacity-100 transition duration-300 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
        <button
          type="button"
          onClick={() => toggle(media)}
          aria-pressed={inList}
          aria-label={inList ? `Retirer ${media.title} de ma liste` : `Ajouter ${media.title} à ma liste`}
          title={inList ? 'Retirer de ma liste' : 'Ajouter à ma liste'}
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur transition',
            inList
              ? 'border-accent/60 bg-accent text-white'
              : 'border-white/20 bg-black/60 text-white hover:bg-black/80',
          )}
        >
          {inList ? <CheckIcon className="h-4 w-4" /> : <PlusIcon className="h-4 w-4" />}
        </button>

        <Link
          to={watchHref(media)}
          aria-label={`Lire ${media.title}`}
          title="Lecture"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white text-ink-950 transition hover:scale-105 hover:bg-white/90"
        >
          <PlayIcon className="h-3.5 w-3.5 translate-x-[1px]" />
        </Link>
      </div>

      {showCaption && (
        <div className="mt-2 px-0.5">
          <p className="line-clamp-1 text-sm font-medium text-white/85">{media.title}</p>
          <p className="mt-0.5 text-[11px] text-white/40">
            {yearOf(media.releaseDate)} · {media.kind === 'movie' ? 'Film' : 'Série'}
          </p>
        </div>
      )}
    </div>
  )
}

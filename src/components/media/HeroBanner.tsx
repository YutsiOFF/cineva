import { Link } from 'react-router-dom'
import { ratingOf, yearOf } from '../../lib/format'
import { imageUrl } from '../../services/tmdb'
import { useIsInMyList, useMyList } from '../../store/myList'
import type { MediaSummary } from '../../types/media'
import { CheckIcon, InfoIcon, PlayIcon, PlusIcon, StarIcon } from '../ui/icons'
import { detailHref, watchHref } from './MediaCard'

interface HeroBannerProps {
  media: MediaSummary
}

/** Bannière principale de l'accueil : backdrop, métadonnées, actions. */
export function HeroBanner({ media }: HeroBannerProps) {
  const backdrop = imageUrl(media.backdropPath, 'w1280') ?? imageUrl(media.posterPath, 'w780')
  const inList = useIsInMyList(media.kind, media.id)
  const toggle = useMyList((state) => state.toggle)

  return (
    <section aria-label={`À la une : ${media.title}`} className="relative isolate overflow-hidden">
      <div className="absolute inset-0 -z-10">
        {backdrop ? (
          <img
            src={backdrop}
            alt=""
            aria-hidden
            className="h-full w-full scale-105 object-cover object-top"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-ink-850 via-ink-900 to-black" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-ink-950 via-ink-950/75 to-transparent" />
        <div className="absolute inset-0 bg-hero-fade" />
      </div>

      <div className="mx-auto flex min-h-[74vh] max-w-[1800px] flex-col justify-end px-4 pb-14 pt-32 sm:px-6 sm:pb-16 md:min-h-[82vh] lg:px-10 lg:pb-20">
        <div className="max-w-2xl animate-rise-in">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-accent-gradient px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white">
              À la une
            </span>
            <span className="pill">{media.kind === 'movie' ? 'Film' : 'Série'}</span>
            <span className="pill">{yearOf(media.releaseDate)}</span>
            <span className="pill">
              <StarIcon className="h-3 w-3 text-amber-300" />
              {ratingOf(media.voteAverage)}
            </span>
          </div>

          <h1 className="mt-4 text-balance font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            {media.title}
          </h1>

          {media.overview && (
            <p className="mt-4 line-clamp-3 max-w-xl text-sm leading-relaxed text-white/70 sm:text-base">
              {media.overview}
            </p>
          )}

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link to={watchHref(media)} className="btn-primary px-6">
              <PlayIcon className="h-4 w-4" />
              Lecture
            </Link>
            <Link to={detailHref(media)} className="btn-ghost">
              <InfoIcon className="h-4 w-4" />
              Plus d&apos;infos
            </Link>
            <button
              type="button"
              onClick={() => toggle(media)}
              aria-pressed={inList}
              className="btn-ghost px-4"
              title={inList ? 'Retirer de ma liste' : 'Ajouter à ma liste'}
            >
              {inList ? <CheckIcon className="h-4 w-4" /> : <PlusIcon className="h-4 w-4" />}
              <span className="hidden sm:inline">{inList ? 'Dans ma liste' : 'Ma liste'}</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

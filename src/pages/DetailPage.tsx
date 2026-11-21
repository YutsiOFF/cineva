import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { MediaRow } from '../components/media/MediaRow'
import { TrailerModal } from '../components/media/TrailerModal'
import { WatchProviders } from '../components/media/WatchProviders'
import { PosterImage } from '../components/ui/PosterImage'
import { ErrorState } from '../components/ui/ErrorState'
import { ArrowLeftIcon, CheckIcon, PlayIcon, PlusIcon, StarIcon } from '../components/ui/icons'
import { Skeleton } from '../components/ui/Skeleton'
import { formatDate, formatDuration, formatRuntime, ratingOf, yearOf } from '../lib/format'
import { useAsync } from '../hooks/useAsync'
import { fetchDetails, fetchSeason, imageUrl } from '../services/tmdb'
import { useIsInMyList, useMyList } from '../store/myList'
import type { MediaDetail, MediaKind } from '../types/media'

/** Fiche détaillée d'un film (`/film/:id`) ou d'une série (`/serie/:id`). */
export default function DetailPage({ kind }: { kind: MediaKind }) {
  const { id } = useParams<{ id: string }>()
  const numericId = Number(id)
  const valid = Number.isFinite(numericId) && numericId > 0

  const { data: detail, error, loading, reload } = useAsync<MediaDetail>(
    (signal) =>
      valid
        ? fetchDetails(kind, numericId, signal)
        : Promise.reject(new Error('Identifiant de contenu invalide.')),
    [kind, numericId, valid],
  )

  const [selectedSeason, setSelectedSeason] = useState<number | null>(null)
  const [trailerOpen, setTrailerOpen] = useState(false)
  const inList = useIsInMyList(kind, valid ? numericId : -1)
  const toggleList = useMyList((state) => state.toggle)

  if (loading && !detail) return <DetailSkeleton />

  if (error || !detail) {
    return (
      <div className="px-4 pt-32">
        <ErrorState
          title="Fiche introuvable"
          message={error?.message ?? 'Ce contenu est indisponible.'}
          onRetry={reload}
        />
        <div className="mt-6 text-center">
          <Link to="/" className="link-muted text-sm">
            Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    )
  }

  const backdrop = imageUrl(detail.backdropPath, 'w1280') ?? imageUrl(detail.posterPath, 'w780')
  const activeSeason = selectedSeason ?? detail.seasons[0]?.seasonNumber ?? 1
  const watchLink =
    kind === 'movie'
      ? `/watch/movie/${detail.id}`
      : `/watch/tv/${detail.id}?s=${activeSeason}&e=1`

  const metaLine = [
    yearOf(detail.releaseDate),
    kind === 'movie' ? formatRuntime(detail.runtime) : `${detail.numberOfSeasons ?? 0} saison(s)`,
    detail.status,
  ].filter(Boolean)

  return (
    <article className="animate-fade-in pb-4">
      {/* Backdrop */}
      <div className="relative h-[44vh] min-h-[300px] w-full overflow-hidden sm:h-[54vh]">
        {backdrop ? (
          <img src={backdrop} alt="" aria-hidden className="h-full w-full object-cover object-top" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-ink-850 to-black" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/70 to-ink-950/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink-950/85 via-ink-950/20 to-transparent" />
      </div>

      <div className="relative mx-auto -mt-36 max-w-[1500px] px-4 sm:-mt-40 sm:px-6 lg:px-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:gap-8">
          <div className="w-28 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-ink-850 shadow-card sm:w-40 lg:w-48">
            <div className="aspect-[2/3]">
              <PosterImage path={detail.posterPath} title={detail.title} eager />
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="pill">{kind === 'movie' ? 'Film' : 'Série'}</span>
              {detail.genres.slice(0, 3).map((genre) => (
                <span key={genre.id} className="pill">
                  {genre.name}
                </span>
              ))}
            </div>

            <h1 className="mt-3 text-balance font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
              {detail.title}
            </h1>

            {detail.tagline && (
              <p className="mt-2 text-sm italic text-accent-soft/90 sm:text-base">« {detail.tagline} »</p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-white/55 sm:text-sm">
              <span className="flex items-center gap-1 font-semibold text-amber-300">
                <StarIcon className="h-3.5 w-3.5" />
                {ratingOf(detail.voteAverage)}
                <span className="font-normal text-white/35">({detail.voteCount.toLocaleString('fr-FR')})</span>
              </span>
              {metaLine.map((item) => (
                <span key={item} className="flex items-center gap-2">
                  <span aria-hidden className="h-1 w-1 rounded-full bg-white/30" />
                  {item}
                </span>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              <Link to={watchLink} className="btn-primary px-5">
                <PlayIcon className="h-4 w-4" />
                {kind === 'movie' ? 'Lecture' : 'Commencer la série'}
              </Link>
              <button type="button" onClick={() => toggleList(detail)} aria-pressed={inList} className="btn-ghost">
                {inList ? <CheckIcon className="h-4 w-4" /> : <PlusIcon className="h-4 w-4" />}
                {inList ? 'Dans ma liste' : 'Ma liste'}
              </button>
              {detail.trailerKey && (
                <button type="button" onClick={() => setTrailerOpen(true)} className="btn-ghost">
                  <PlayIcon className="h-3.5 w-3.5" />
                  Bande-annonce
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Synopsis + infos */}
        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div>
            <h2 className="font-display text-lg font-semibold">Synopsis</h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/65 sm:text-base">
              {detail.overview || 'Aucun synopsis disponible pour ce contenu.'}
            </p>

            {detail.cast.length > 0 && (
              <section aria-labelledby="cast-title" className="mt-10">
                <h2 id="cast-title" className="font-display text-lg font-semibold">
                  Distribution
                </h2>
                <div className="scrollbar-none mt-4 flex gap-4 overflow-x-auto pb-2">
                  {detail.cast.map((member) => (
                    <div key={member.id} className="w-[88px] shrink-0 text-center">
                      <div className="mx-auto h-[88px] w-[88px] overflow-hidden rounded-full border border-white/10 bg-ink-800">
                        {member.profilePath ? (
                          <img
                            src={imageUrl(member.profilePath, 'w200') ?? ''}
                            alt={member.name}
                            loading="lazy"
                            decoding="async"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center font-display text-lg text-white/30">
                            {member.name.slice(0, 1)}
                          </div>
                        )}
                      </div>
                      <p className="mt-2 line-clamp-1 text-xs font-medium text-white/85">{member.name}</p>
                      <p className="line-clamp-1 text-[11px] text-white/40">{member.character}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {kind === 'tv' && detail.seasons.length > 0 && (
              <section aria-labelledby="episodes-title" className="mt-10">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 id="episodes-title" className="font-display text-lg font-semibold">
                    Épisodes
                  </h2>
                  <label className="flex items-center gap-2 text-sm text-white/55">
                    Saison
                    <select
                      value={activeSeason}
                      onChange={(event) => setSelectedSeason(Number(event.target.value))}
                      className="rounded-lg border border-white/15 bg-ink-850 px-3 py-2 text-sm font-medium text-white outline-none transition hover:border-white/30"
                    >
                      {detail.seasons.map((season) => (
                        <option key={season.id} value={season.seasonNumber}>
                          {season.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <SeasonEpisodes tvId={detail.id} seasonNumber={activeSeason} />
              </section>
            )}
          </div>

          <aside className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm">
            <h2 className="font-display text-sm font-semibold uppercase tracking-[0.16em] text-white/45">Détails</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-white/35">Statut</dt>
                <dd className="mt-0.5 text-white/75">{detail.status || '—'}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-white/35">
                  {kind === 'movie' ? 'Sortie' : 'Première diffusion'}
                </dt>
                <dd className="mt-0.5 text-white/75">{formatDate(detail.releaseDate)}</dd>
              </div>
              {kind === 'tv' ? (
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-white/35">Saisons</dt>
                  <dd className="mt-0.5 text-white/75">{detail.numberOfSeasons ?? detail.seasons.length}</dd>
                </div>
              ) : (
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-white/35">Durée</dt>
                  <dd className="mt-0.5 text-white/75">{formatRuntime(detail.runtime) || '—'}</dd>
                </div>
              )}
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-white/35">Genres</dt>
                <dd className="mt-1 flex flex-wrap gap-1.5">
                  {detail.genres.map((genre) => (
                    <span key={genre.id} className="rounded-md bg-white/10 px-2 py-0.5 text-[11px] text-white/70">
                      {genre.name}
                    </span>
                  ))}
                </dd>
              </div>
            </dl>
            <Link
              to="/"
              className="mt-2 inline-flex items-center gap-2 text-xs text-white/45 transition hover:text-white"
            >
              <ArrowLeftIcon className="h-3.5 w-3.5" />
              Retour à l&apos;accueil
            </Link>
          </aside>
        </div>

        <WatchProviders kind={kind} tmdbId={detail.id} className="mt-10" />
      </div>

      {detail.similar.length > 0 && (
        <div className="mt-14">
          <MediaRow title="Contenus similaires" items={detail.similar} />
        </div>
      )}

      {trailerOpen && detail.trailerKey && (
        <TrailerModal videoKey={detail.trailerKey} title={detail.title} onClose={() => setTrailerOpen(false)} />
      )}
    </article>
  )
}

/* ------------------------------ Épisodes -------------------------------- */

function SeasonEpisodes({ tvId, seasonNumber }: { tvId: number; seasonNumber: number }) {
  const { data, error, loading, reload } = useAsync(
    (signal) => fetchSeason(tvId, seasonNumber, signal),
    [tvId, seasonNumber],
  )

  if (loading) {
    return (
      <div className="mt-4 space-y-3" aria-busy="true">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="flex gap-4 rounded-xl border border-white/[0.06] p-3">
            <Skeleton className="aspect-video w-32 shrink-0 sm:w-44" />
            <div className="flex-1 space-y-2 py-1">
              <Skeleton className="h-4 w-2/3 rounded" />
              <Skeleton className="h-3 w-full rounded" />
              <Skeleton className="h-3 w-4/5 rounded" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return <ErrorState className="mt-5" message={error.message} onRetry={reload} />
  }

  if (!data || data.episodes.length === 0) {
    return <p className="mt-4 text-sm text-white/45">Aucun épisode disponible pour cette saison.</p>
  }

  return (
    <ul className="mt-4 divide-y divide-white/[0.06] overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
      {data.episodes.map((episode) => (
        <li key={episode.id}>
          <Link
            to={`/watch/tv/${tvId}?s=${seasonNumber}&e=${episode.episodeNumber}`}
            className="group flex gap-3 p-3 transition hover:bg-white/[0.05] sm:gap-4 sm:p-4"
          >
            <div className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-lg bg-ink-800 sm:w-40">
              {episode.stillPath ? (
                <img
                  src={imageUrl(episode.stillPath, 'w342') ?? ''}
                  alt=""
                  aria-hidden
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-white/25">
                  Ép. {episode.episodeNumber}
                </div>
              )}
              <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
                <PlayIcon className="h-6 w-6 text-white" />
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <p className="truncate text-sm font-semibold text-white/90 sm:text-base">
                  <span className="mr-2 text-white/35">{episode.episodeNumber}.</span>
                  {episode.name}
                </p>
                <span className="shrink-0 text-[11px] text-white/35">{formatDuration(episode.runtime)}</span>
              </div>
              {episode.overview && (
                <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-white/45 sm:text-sm">
                  {episode.overview}
                </p>
              )}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}

/* ------------------------------ Squelette ------------------------------- */

function DetailSkeleton() {
  return (
    <div className="animate-fade-in">
      <Skeleton className="h-[44vh] min-h-[300px] w-full rounded-none sm:h-[54vh]" />
      <div className="mx-auto -mt-36 max-w-[1500px] px-4 sm:px-6 lg:px-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end">
          <Skeleton className="aspect-[2/3] w-28 shrink-0 sm:w-40 lg:w-48" />
          <div className="flex-1 space-y-3 pb-2">
            <Skeleton className="h-4 w-32 rounded" />
            <Skeleton className="h-10 w-3/4 rounded-lg" />
            <Skeleton className="h-4 w-1/2 rounded" />
            <div className="flex gap-3 pt-2">
              <Skeleton className="h-11 w-32" />
              <Skeleton className="h-11 w-32" />
            </div>
          </div>
        </div>
        <div className="mt-10 space-y-3">
          <Skeleton className="h-4 w-40 rounded" />
          <Skeleton className="h-3 w-full rounded" />
          <Skeleton className="h-3 w-11/12 rounded" />
          <Skeleton className="h-3 w-3/4 rounded" />
        </div>
      </div>
    </div>
  )
}

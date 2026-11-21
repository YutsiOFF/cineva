import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { WatchProviders } from '../components/media/WatchProviders'
import { SourceList } from '../components/player/SourceList'
import { VideoPlayer } from '../components/player/VideoPlayer'
import { ErrorState } from '../components/ui/ErrorState'
import { AlertIcon, ArrowLeftIcon, InfoIcon, RefreshIcon } from '../components/ui/icons'
import { cn } from '../lib/cn'
import { formatRuntime, yearOf } from '../lib/format'
import { useAsync } from '../hooks/useAsync'
import { fetchDetails, imageUrl } from '../services/tmdb'
import { resolveStreams, type StreamSource } from '../services/streamResolver'
import type { MediaKind } from '../types/media'

/**
 * Page de lecture `/watch/:mediaType/:id?s=&e=`.
 *
 * Les sources lisibles viennent de `public/streams.json` (vos fichiers) ou du
 * flux de démonstration. Si aucune source n'est déclarée, la page affiche la
 * disponibilité légale du titre (Watchmode / Movie of the Night).
 */
export default function WatchPage() {
  const { mediaType, id } = useParams<{ mediaType: string; id: string }>()
  const [searchParams] = useSearchParams()

  const kind: MediaKind = mediaType === 'tv' ? 'tv' : 'movie'
  const tmdbId = Number(id)
  const valid = Number.isFinite(tmdbId) && tmdbId > 0
  const season = Math.max(1, Number(searchParams.get('s') ?? '1') || 1)
  const episode = Math.max(1, Number(searchParams.get('e') ?? '1') || 1)

  const { data: detail } = useAsync(
    (signal) => (valid ? fetchDetails(kind, tmdbId, signal) : Promise.resolve(null)),
    [kind, tmdbId, valid],
  )

  const resolution = useAsync(
    (signal) => {
      if (!valid) return Promise.reject(new Error('Identifiant de contenu invalide.'))
      return resolveStreams(
        {
          kind,
          tmdbId,
          season: kind === 'tv' ? season : undefined,
          episode: kind === 'tv' ? episode : undefined,
        },
        signal,
      )
    },
    [kind, tmdbId, season, episode, valid],
  )

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const sources = resolution.data?.sources ?? []
  const activeSource = sources.find((source) => source.id === selectedId) ?? sources[0] ?? null

  const title = detail?.title ?? 'Lecture'
  const poster = imageUrl(detail?.backdropPath, 'w780') ?? imageUrl(detail?.posterPath, 'w500') ?? undefined
  const backLink = kind === 'movie' ? `/film/${tmdbId}` : `/serie/${tmdbId}`

  return (
    <div className="min-h-screen bg-ink-950">
      <div className="mx-auto w-full max-w-6xl px-3 pb-16 pt-4 sm:px-6 sm:pt-6 lg:pt-8">
        <header className="flex items-center gap-3">
          <Link to={backLink} className="btn-icon shrink-0" aria-label="Retour à la fiche">
            <ArrowLeftIcon className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate font-display text-base font-semibold sm:text-lg">{title}</h1>
            <p className="truncate text-[11px] text-white/45 sm:text-xs">
              {kind === 'tv' ? `Saison ${season} · Épisode ${episode}` : 'Film'}
              {detail?.releaseDate ? ` · ${yearOf(detail.releaseDate)}` : ''}
              {detail?.runtime ? ` · ${formatRuntime(detail.runtime)}` : ''}
            </p>
          </div>
          <Link
            to="/"
            className="ml-auto hidden text-xs font-semibold tracking-[0.2em] text-white/40 transition hover:text-white sm:block"
          >
            CINEVA
          </Link>
        </header>

        {/* Lecteur */}
        <section className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl">
          {resolution.loading && !resolution.data && <PlayerLoading />}

          {!resolution.loading && resolution.error && (
            <div className="flex min-h-[320px] items-center justify-center p-6">
              <ErrorState
                title="Résolution impossible"
                message={resolution.error.message}
                onRetry={resolution.reload}
              />
            </div>
          )}

          {!resolution.loading && !resolution.error && activeSource && (
            <VideoPlayer
              key={`${activeSource.id}-${season}-${episode}`}
              source={activeSource}
              title={title}
              poster={poster}
              autoPlay
            />
          )}

          {!resolution.loading && !resolution.error && !activeSource && (
            <NoSourcePanel
              configured={resolution.data?.configured ?? false}
              warnings={resolution.data?.warnings ?? []}
              onRetry={resolution.reload}
            />
          )}
        </section>

        {/* Disponibilité légale — surtout utile quand aucune source n'est déclarée. */}
        {valid && !resolution.loading && (
          <WatchProviders kind={kind} tmdbId={tmdbId} className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-5" />
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            {detail?.overview && (
              <section aria-labelledby="watch-synopsis">
                <h2
                  id="watch-synopsis"
                  className="font-display text-sm font-semibold uppercase tracking-[0.16em] text-white/40"
                >
                  Synopsis
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-white/65">{detail.overview}</p>
              </section>
            )}

            {resolution.data && resolution.data.warnings.length > 0 && (
              <div className="mt-5 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] p-3.5">
                <p className="flex items-center gap-2 text-xs font-semibold text-amber-200/90">
                  <InfoIcon className="h-3.5 w-3.5" />
                  Informations
                </p>
                <ul className="mt-2 space-y-1 text-[11px] leading-relaxed text-amber-100/60">
                  {resolution.data.warnings.map((warning) => (
                    <li key={warning}>• {warning}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-2 text-[11px] text-white/35">
              <span className="rounded-md bg-white/[0.06] px-2 py-1">TMDB #{tmdbId}</span>
              <span className="rounded-md bg-white/[0.06] px-2 py-1">{kind === 'movie' ? 'Film' : 'Série'}</span>
              {activeSource && (
                <span className="rounded-md bg-white/[0.06] px-2 py-1">
                  {activeSource.protocol.toUpperCase()} · {activeSource.provider}
                  {activeSource.quality ? ` · ${activeSource.quality}` : ''}
                </span>
              )}
            </div>
          </div>

          <aside className="space-y-3 lg:pt-1">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-sm font-semibold uppercase tracking-[0.16em] text-white/40">
                Sources
              </h2>
              <button
                type="button"
                onClick={resolution.reload}
                disabled={resolution.loading}
                className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] text-white/50 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
              >
                <RefreshIcon className="h-3.5 w-3.5" />
                Actualiser
              </button>
            </div>

            {sources.length > 0 ? (
              <SourceList
                sources={sources}
                activeId={activeSource?.id ?? null}
                onSelect={(source: StreamSource) => setSelectedId(source.id)}
              />
            ) : (
              <p className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs leading-relaxed text-white/40">
                Aucune source lisible déclarée pour ce titre. Ajoutez-la dans{' '}
                <code className="text-accent-soft">public/streams.json</code>.
              </p>
            )}

            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-[11px] leading-relaxed text-white/40">
              <p className="font-semibold text-white/60">Catalogue local</p>
              <p className={cn('mt-1', resolution.data?.localCatalog ? 'text-emerald-300/80' : '')}>
                {resolution.data?.localCatalog
                  ? `${resolution.data.localCatalog} source(s) pour ce titre`
                  : 'aucune source pour ce titre'}
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

function PlayerLoading() {
  return (
    <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 bg-black text-sm text-white/55">
      <span className="h-9 w-9 animate-spin rounded-full border-2 border-white/20 border-t-accent" />
      Recherche des sources…
    </div>
  )
}

interface NoSourcePanelProps {
  configured: boolean
  warnings: string[]
  onRetry: () => void
}

function NoSourcePanel({ configured, warnings, onRetry }: NoSourcePanelProps) {
  return (
    <div className="flex min-h-[340px] flex-col items-center justify-center gap-4 px-4 py-10 text-center sm:px-8">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-400/10 text-amber-300">
        <AlertIcon className="h-6 w-6" />
      </span>

      <div>
        <h2 className="font-display text-base font-semibold sm:text-lg">Aucune source lisible</h2>
        <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-white/50 sm:text-sm">
          {configured
            ? "Le catalogue local ne contient pas ce titre. Ajoutez-le dans public/streams.json, ou consultez les plateformes légales ci-dessous."
            : "Aucune source n'est déclarée. Ajoutez le titre dans public/streams.json, ou consultez les plateformes légales ci-dessous."}
        </p>
      </div>

      <button type="button" onClick={onRetry} className="btn-ghost">
        <RefreshIcon className="h-4 w-4" />
        Relancer la recherche
      </button>

      {warnings.length > 0 && (
        <ul className="mx-auto max-w-md space-y-1 text-left text-[11px] leading-relaxed text-amber-100/55">
          {warnings.map((warning) => (
            <li key={warning}>• {warning}</li>
          ))}
        </ul>
      )}

      <details className="w-full max-w-lg rounded-xl border border-white/10 bg-white/[0.02] p-3 text-left">
        <summary className="cursor-pointer text-xs font-medium text-white/60">
          Ajouter vos propres vidéos
        </summary>
        <div className="mt-3 space-y-2 text-[11px] leading-relaxed text-white/45">
          <p>
            Hébergez un MP4 (H.264) ou un HLS <code className="text-accent-soft">.m3u8</code> en HTTPS, puis
            déclarez-le avec l&apos;id TMDB du titre dans <code className="text-accent-soft">public/streams.json</code> :
          </p>
          <pre className="overflow-x-auto rounded-lg bg-black/60 p-2.5 text-[10px] text-white/70">{`{
  "sources": {
    "movie:19": [{"url": "https://…/metropolis.mp4", "quality": "480p"}],
    "tv:1399:1:1": [{"url": "https://…/ep1.m3u8", "quality": "1080p"}]
  }
}`}</pre>
          <p>
            Formats acceptés : <code className="text-accent-soft">movie:&lt;id&gt;</code>,{' '}
            <code className="text-accent-soft">tv:&lt;id&gt;:&lt;saison&gt;:&lt;épisode&gt;</code>. Les sous-titres
            WebVTT sont pris en charge via le champ <code className="text-accent-soft">subtitles</code>.
          </p>
        </div>
      </details>
    </div>
  )
}

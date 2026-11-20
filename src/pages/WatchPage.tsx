import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { VideoPlayer } from '../components/player/VideoPlayer'
import { SourceList } from '../components/player/SourceList'
import { ErrorState } from '../components/ui/ErrorState'
import { AlertIcon, ArrowLeftIcon, InfoIcon, RefreshIcon } from '../components/ui/icons'
import { cn } from '../lib/cn'
import { formatRuntime, yearOf } from '../lib/format'
import { useAsync } from '../hooks/useAsync'
import { fetchDetails, imageUrl } from '../services/tmdb'
import { resolveStreams, streamResolverConfig, type StreamSource } from '../services/streamResolver'
import type { MediaKind } from '../types/media'

/**
 * Page de lecture `/watch/:mediaType/:id?s=&e=`.
 *
 * Le flux est résolu à l'exécution par un backend distant (CinePro/AutoFlix).
 * Aucune source n'est inventée : si rien n'est configuré ou si le résolveur
 * échoue, un panneau explique comment brancher l'API.
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
          <Link to="/" className="ml-auto hidden text-xs font-semibold tracking-[0.2em] text-white/40 transition hover:text-white sm:block">
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

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            {detail?.overview && (
              <section aria-labelledby="watch-synopsis">
                <h2 id="watch-synopsis" className="font-display text-sm font-semibold uppercase tracking-[0.16em] text-white/40">
                  Synopsis
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-white/65">{detail.overview}</p>
              </section>
            )}

            {resolution.data && resolution.data.warnings.length > 0 && (
              <div className="mt-5 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] p-3.5">
                <p className="flex items-center gap-2 text-xs font-semibold text-amber-200/90">
                  <InfoIcon className="h-3.5 w-3.5" />
                  Informations de résolution
                </p>
                <ul className="mt-2 space-y-1 text-[11px] leading-relaxed text-amber-100/60">
                  {resolution.data.warnings.map((warning) => (
                    <li key={warning}>• {warning}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-2 text-[11px] text-white/35">
              <span className="rounded-md bg-white/[0.06] px-2 py-1">
                TMDB #{tmdbId}
              </span>
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
                Aucune source pour l&apos;instant. Les résolveurs configurés sont interrogés à chaque
                ouverture de cette page.
              </p>
            )}

            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-[11px] leading-relaxed text-white/40">
              <p className="font-semibold text-white/60">Résolveurs</p>
              <ul className="mt-2 space-y-1">
                <li className={cn(streamResolverConfig.cinepro ? 'text-emerald-300/80' : '')}>
                  CinePro : {streamResolverConfig.cinepro ? 'configuré' : 'non configuré'}
                </li>
                <li className={cn(streamResolverConfig.autoflix ? 'text-emerald-300/80' : '')}>
                  AutoFlix : {streamResolverConfig.autoflix ? 'configuré' : 'non configuré'}
                </li>
              </ul>
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
        <h2 className="font-display text-base font-semibold sm:text-lg">Aucun flux disponible</h2>
        <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-white/50 sm:text-sm">
          {configured
            ? "Les résolveurs n'ont renvoyé aucune source lisible pour ce contenu. Essayez une autre source, ou relancez la recherche."
            : "Aucun résolveur n'est configuré. GitHub Pages ne peut pas héberger de backend : indiquez l'URL d'une instance CinePro ou AutoFlix déjà déployée."}
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
          Brancher CinePro Core ou AutoFlix
        </summary>
        <div className="mt-3 space-y-2 text-[11px] leading-relaxed text-white/45">
          <p>
            Renseignez l&apos;URL de votre instance dans le fichier <code className="text-accent-soft">.env</code> :
          </p>
          <pre className="overflow-x-auto rounded-lg bg-black/60 p-2.5 text-[10px] text-white/70">{`VITE_CINEPRO_API_URL=https://cinepro.mon-domaine.dev
VITE_AUTOFLIX_API_URL=https://autoflix.mon-domaine.dev`}</pre>
          <p>
            L&apos;app appelle{' '}
            <code className="text-accent-soft">{'{BASE}'}/stream?type=movie&amp;tmdb_id=603</code> (et{' '}
            <code className="text-accent-soft">season</code>/<code className="text-accent-soft">episode</code> pour une
            série), puis normalise la réponse. Adaptez le chemin ou le parseur dans{' '}
            <code className="text-accent-soft">src/services/streamResolver.ts</code> si votre backend expose un
            contrat différent.
          </p>
          <p>
            AutoFlix étant une CLI Python, exposez-le via un petit service HTTP (FastAPI/Flask) déployé hors GitHub
            Pages — voir le README pour l&apos;exemple.
          </p>
        </div>
      </details>
    </div>
  )
}

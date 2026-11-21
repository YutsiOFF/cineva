import type { MediaKind } from '../types/media'

/* ---------------------------------------------------------------------------
 * Sources vidéo lisibles
 *
 * GitHub Pages ne sert que des fichiers statiques : aucun backend ne peut y
 * tourner. Deux possibilités, sans serveur :
 *
 *   1. `public/streams.json` — vos propres vidéos (MP4/HLS hébergées en HTTPS),
 *      déclarées par id TMDB. C'est le mécanisme principal.
 *   2. `VITE_DEMO_STREAM_URL` — un flux public unique pour tester le lecteur.
 *
 * La disponibilité LÉGALE des titres (Netflix, Prime, location…) est gérée
 * séparément dans `watchProviders.ts` : ces APIs ne fournissent pas d'URL de
 * flux, seulement les plateformes et leurs liens officiels.
 * ------------------------------------------------------------------------- */

export type StreamProtocol = 'hls' | 'mp4' | 'embed'

export interface SubtitleTrack {
  label: string
  lang: string
  url: string
}

export interface StreamSource {
  id: string
  provider: string
  url: string
  protocol: StreamProtocol
  quality?: string
  language?: string
  subtitles?: SubtitleTrack[]
  note?: string
}

export interface StreamRequest {
  kind: MediaKind
  tmdbId: number
  season?: number
  episode?: number
}

export interface StreamResolution {
  sources: StreamSource[]
  /** Messages non bloquants (fichier manifeste absent, entrée invalide…). */
  warnings: string[]
  /** Vrai si le catalogue local contient au moins une entrée. */
  configured: boolean
  /** Nombre de sources locales trouvées pour ce titre. */
  localCatalog: number
}

const cleanUrl = (value: string | undefined): string => (value ?? '').trim().replace(/\/+$/, '')

const DEMO_STREAM_URL = cleanUrl(import.meta.env.VITE_DEMO_STREAM_URL)

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/* --------------------------- Détection de format -------------------------- */

function detectProtocol(url: string, declared?: unknown): StreamProtocol {
  const type = String(declared ?? '').toLowerCase()
  if (type.includes('embed') || type.includes('iframe')) return 'embed'
  if (type.includes('mp4')) return 'mp4'
  if (type.includes('hls') || type.includes('m3u8')) return 'hls'

  const lower = url.toLowerCase()
  if (lower.includes('.m3u8') || lower.includes('format=m3u8') || lower.includes('/manifest')) return 'hls'
  if (lower.includes('.mp4') || lower.includes('.webm') || lower.includes('.mkv')) return 'mp4'
  if (lower.includes('/embed') || lower.includes('iframe') || lower.includes('/e/')) return 'embed'
  // Par défaut HLS : format majoritairement utilisé pour les fichiers segmentés.
  return 'hls'
}

function normalizeSubtitles(value: unknown): SubtitleTrack[] | undefined {
  if (!Array.isArray(value)) return undefined
  const tracks = value
    .filter(isRecord)
    .map((track) => {
      const url = String(track.url ?? track.file ?? track.src ?? '').trim()
      if (!/^https?:\/\//i.test(url)) return null
      const lang = String(track.lang ?? track.language ?? track.srclang ?? 'und').toLowerCase()
      return {
        url,
        lang,
        label: String(track.label ?? track.name ?? lang.toUpperCase()),
      }
    })
    .filter((track): track is SubtitleTrack => track !== null)
  return tracks.length > 0 ? tracks : undefined
}

/* --------------------------- Catalogue local ---------------------------- */

/**
 * Sources déclarées à la main dans `public/streams.json`, servi avec le site.
 * Clés acceptées :
 *   movie:<tmdbId>
 *   tv:<tmdbId> | tv:<tmdbId>:<saison> | tv:<tmdbId>:<saison>:<épisode>
 */
interface LocalManifestEntry {
  url?: string
  quality?: string
  language?: string
  provider?: string
  protocol?: string
  subtitles?: SubtitleTrack[]
}

let localManifestPromise: Promise<Record<string, LocalManifestEntry[]>> | null = null

function loadLocalManifest(): Promise<Record<string, LocalManifestEntry[]>> {
  if (!localManifestPromise) {
    localManifestPromise = fetch(`${import.meta.env.BASE_URL}streams.json`, {
      headers: { Accept: 'application/json' },
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: unknown) => {
        const record = isRecord(payload) && isRecord(payload.sources) ? payload.sources : payload
        if (!isRecord(record)) return {}
        const manifest: Record<string, LocalManifestEntry[]> = {}
        for (const [key, value] of Object.entries(record)) {
          if (Array.isArray(value)) manifest[key] = value.filter(isRecord) as LocalManifestEntry[]
        }
        return manifest
      })
      .catch(() => ({}) as Record<string, LocalManifestEntry[]>)
  }
  return localManifestPromise
}

function localKeysFor(request: StreamRequest): string[] {
  if (request.kind === 'movie') return [`movie:${request.tmdbId}`]
  const season = request.season ?? 1
  const episode = request.episode ?? 1
  return [
    `tv:${request.tmdbId}:${season}:${episode}`,
    `tv:${request.tmdbId}:${season}`,
    `tv:${request.tmdbId}`,
  ]
}

function localSourceFromEntry(entry: LocalManifestEntry, index: number): StreamSource | null {
  const rawUrl = typeof entry.url === 'string' ? entry.url.trim() : ''
  if (!/^https?:\/\//i.test(rawUrl)) return null
  return {
    id: `local-${index}-${rawUrl}`.slice(0, 180),
    url: rawUrl,
    protocol: detectProtocol(rawUrl, entry.protocol),
    provider: typeof entry.provider === 'string' && entry.provider ? entry.provider : 'Catalogue local',
    quality: entry.quality ? String(entry.quality) : undefined,
    language: entry.language ? String(entry.language) : undefined,
    subtitles: normalizeSubtitles(entry.subtitles),
  }
}

async function resolveFromLocalCatalog(request: StreamRequest) {
  const manifest = await loadLocalManifest()
  const warnings: string[] = []

  const entries = localKeysFor(request).flatMap((key) => manifest[key] ?? [])
  const sources = entries
    .map((entry, index) => localSourceFromEntry(entry, index))
    .filter((source): source is StreamSource => source !== null)

  if (entries.length > 0 && sources.length === 0) {
    warnings.push('Une entrée de public/streams.json est ignorée : URL absente ou invalide.')
  }

  return { sources, hasCatalog: Object.keys(manifest).length > 0, warnings }
}

/* ------------------------------- Résolution ------------------------------ */

function qualityScore(quality: string | undefined): number {
  if (!quality) return 0
  const match = quality.match(/(\d{3,4})/)
  if (match) return Number(match[1])
  const lower = quality.toLowerCase()
  if (lower.includes('4k') || lower.includes('uhd')) return 2160
  if (lower.includes('auto')) return 1000
  return 0
}

/**
 * Renvoie les sources lisibles d'un titre : catalogue local d'abord, puis flux
 * de démonstration si configuré. Ne fabrique jamais d'URL et n'appelle aucun
 * service de scraping.
 */
export async function resolveStreams(
  request: StreamRequest,
  _signal?: AbortSignal,
): Promise<StreamResolution> {
  const local = await resolveFromLocalCatalog(request)
  const collected: StreamSource[] = [...local.sources]
  const warnings = [...local.warnings]

  if (collected.length === 0 && DEMO_STREAM_URL) {
    collected.push({
      id: 'demo-stream',
      provider: 'Démo',
      url: DEMO_STREAM_URL,
      protocol: DEMO_STREAM_URL.toLowerCase().includes('.m3u8') ? 'hls' : 'mp4',
      quality: 'Auto',
      note: 'Flux de démonstration (VITE_DEMO_STREAM_URL) : aucune source réelle configurée.',
    })
  }

  const seen = new Set<string>()
  const sources = collected
    .filter((source) => {
      if (seen.has(source.url)) return false
      seen.add(source.url)
      return true
    })
    .sort((a, b) => qualityScore(b.quality) - qualityScore(a.quality))

  return {
    sources,
    warnings,
    configured: local.hasCatalog,
    localCatalog: local.sources.length,
  }
}

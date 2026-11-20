import type { MediaKind } from '../types/media'

/* ---------------------------------------------------------------------------
 * Résolution des flux vidéo
 *
 * GitHub Pages ne sert que des fichiers statiques : aucun backend Node/Python ne
 * peut y tourner. Ce module interroge donc, depuis le navigateur, une API HTTP
 * déjà déployée ailleurs :
 *
 *   1. CinePro Core  -> https://github.com/cinepro-org/core
 *      Backend OMSS (multi-providers, cache Redis, clé TMDB). On attend une route
 *      de résolution qui renvoie une liste de sources pour un id TMDB.
 *
 *   2. AutoFlix      -> https://github.com/PaulExplorer/autoflix-cli
 *      CLI/librairie Python VF/VOSTFR multi-providers. N'expose pas d'API HTTP :
 *      il faut l'envelopper dans un petit service (FastAPI/Flask) puis pointer
 *      VITE_AUTOFLIX_API_URL vers ce service.
 *
 * Contrat attendu (identique pour les deux, volontairement simple) :
 *
 *   GET {BASE}/stream?type=movie&tmdb_id=603
 *   GET {BASE}/stream?type=tv&tmdb_id=1399&season=1&episode=1
 *   -> 200 { "sources": [ { "url": "https://…/master.m3u8",
 *                           "quality": "1080p",
 *                           "language": "VF",
 *                           "provider": "…",
 *                           "subtitles": [{ "label": "Français", "lang": "fr",
 *                                           "url": "https://…/fr.vtt" }] } ] }
 *
 * `normalizeSources` tolère plusieurs variantes de schéma (`streams`, `links`,
 * `data.sources`, `file`, `src`, `playlist`, …) : si votre instance CinePro
 * renvoie un format différent, adaptez UNIQUEMENT cette fonction (ou la constante
 * de chemin ci-dessous) sans toucher au reste de l'app.
 *
 * Si aucun résolveur n'est configuré, l'app affiche un écran explicite au lieu
 * d'inventer des sources. Le seul flux « de secours » possible est un flux de
 * démonstration public (VITE_DEMO_STREAM_URL), utile pour tester le lecteur.
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
  title?: string
  year?: string
}

export interface StreamResolution {
  sources: StreamSource[]
  /** Messages non bloquants (résolveur en erreur, aucun résultat, …). */
  warnings: string[]
  /** Vrai si au moins une API distante ou un catalogue local est disponible. */
  configured: boolean
  /** Nombre de sources trouvées dans `public/streams.json` pour ce titre. */
  localCatalog: number
}

/* ------------------------------- Config --------------------------------- */

const cleanUrl = (value: string | undefined): string => (value ?? '').trim().replace(/\/+$/, '')

const CINEPRO_API_URL = cleanUrl(import.meta.env.VITE_CINEPRO_API_URL)
const AUTOFLIX_API_URL = cleanUrl(import.meta.env.VITE_AUTOFLIX_API_URL)
const DEMO_STREAM_URL = cleanUrl(import.meta.env.VITE_DEMO_STREAM_URL)

/** Exposé pour l'écran de configuration du lecteur. */
export const streamResolverConfig = {
  cinepro: CINEPRO_API_URL,
  autoflix: AUTOFLIX_API_URL,
  demo: DEMO_STREAM_URL,
  configured: Boolean(CINEPRO_API_URL || AUTOFLIX_API_URL),
}

const REQUEST_TIMEOUT_MS = 15_000

/* ------------------------------ HTTP utils ------------------------------ */

async function fetchJson(url: string, signal?: AbortSignal): Promise<unknown> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(new DOMException('Timeout', 'TimeoutError')), REQUEST_TIMEOUT_MS)
  const forwardAbort = () => controller.abort(signal?.reason)

  if (signal) {
    if (signal.aborted) controller.abort(signal.reason)
    else signal.addEventListener('abort', forwardAbort, { once: true })
  }

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
    if (!response.ok) {
      throw new Error(`réponse HTTP ${response.status}`)
    }
    return (await response.json()) as unknown
  } finally {
    clearTimeout(timeout)
    signal?.removeEventListener('abort', forwardAbort)
  }
}

/* --------------------------- Normalisation ------------------------------ */

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** Cherche un tableau de sources dans les structures de réponse courantes. */
function extractEntries(payload: unknown, depth = 0): Record<string, unknown>[] {
  if (Array.isArray(payload)) {
    return payload.filter(isRecord)
  }
  if (!isRecord(payload) || depth > 2) return []

  for (const key of ['sources', 'streams', 'links', 'servers', 'results', 'data', 'items']) {
    const value = payload[key]
    if (Array.isArray(value)) return value.filter(isRecord)
  }
  for (const key of ['data', 'result', 'stream', 'sources', 'links']) {
    const nested = extractEntries(payload[key], depth + 1)
    if (nested.length > 0) return nested
  }
  return []
}

function detectProtocol(url: string, entry: Record<string, unknown>): StreamProtocol {
  const declared = String(entry.protocol ?? entry.type ?? entry.format ?? '').toLowerCase()
  if (declared.includes('embed') || declared.includes('iframe')) return 'embed'
  if (declared.includes('mp4')) return 'mp4'
  if (declared.includes('hls') || declared.includes('m3u8')) return 'hls'

  const lower = url.toLowerCase()
  if (lower.includes('.m3u8') || lower.includes('format=m3u8') || lower.includes('/manifest')) return 'hls'
  if (lower.includes('.mp4') || lower.includes('.webm') || lower.includes('.mkv')) return 'mp4'
  if (lower.includes('/embed') || lower.includes('iframe') || lower.includes('/e/')) return 'embed'
  // Flux inconnu : HLS est le format majoritairement renvoyé par les moteurs de
  // résolution ; le lecteur bascule automatiquement en balise <video> si besoin.
  return 'hls'
}

function normalizeSubtitles(value: unknown): SubtitleTrack[] | undefined {
  if (!Array.isArray(value)) return undefined
  const tracks = value
    .filter(isRecord)
    .map((track) => {
      const url = String(track.url ?? track.file ?? track.src ?? '').trim()
      if (!url) return null
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

function normalizeSources(payload: unknown, providerFallback: string): StreamSource[] {
  const sources: Array<StreamSource | null> = extractEntries(payload).map((entry) => {
    const rawUrl = entry.url ?? entry.file ?? entry.src ?? entry.link ?? entry.stream ?? entry.playlist
    if (typeof rawUrl !== 'string' || !/^https?:\/\//i.test(rawUrl)) return null

    const protocol = detectProtocol(rawUrl, entry)
    const qualityValue = entry.quality ?? entry.resolution ?? entry.label ?? entry.height
    const language = entry.language ?? entry.lang ?? entry.audio ?? entry.vo
    const provider = String(entry.provider ?? entry.server ?? entry.name ?? providerFallback)

    return {
      id: `${provider}-${rawUrl}`.replace(/\s+/g, '-').slice(0, 180),
      url: rawUrl,
      protocol,
      provider,
      quality: qualityValue === undefined || qualityValue === null ? undefined : String(qualityValue),
      language: language === undefined || language === null ? undefined : String(language),
      subtitles: normalizeSubtitles(entry.subtitles ?? entry.tracks ?? entry.captions),
    }
  })

  return sources.filter((source): source is StreamSource => source !== null)
}

/* --------------------------- Catalogue local ---------------------------- */

/**
 * Sources déclarées à la main dans `public/streams.json`, servi avec le site.
 * Permet de lire des vidéos dont vous détenez les droits (ou du domaine public)
 * sans aucun backend. Clés acceptées :
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
    protocol: detectProtocol(rawUrl, { protocol: entry.protocol }),
    provider: typeof entry.provider === 'string' && entry.provider ? entry.provider : 'Catalogue local',
    quality: entry.quality ? String(entry.quality) : undefined,
    language: entry.language ? String(entry.language) : undefined,
    subtitles: normalizeSubtitles(entry.subtitles),
  }
}

async function resolveFromLocalCatalog(request: StreamRequest) {
  const manifest = await loadLocalManifest()
  const entries = localKeysFor(request).flatMap((key) => manifest[key] ?? [])
  const sources = entries
    .map((entry, index) => localSourceFromEntry(entry, index))
    .filter((source): source is StreamSource => source !== null)
  return { sources, hasCatalog: Object.keys(manifest).length > 0 }
}

/* ------------------------------ Résolveurs ------------------------------ */

interface Resolver {
  id: string
  label: string
  isEnabled: () => boolean
  resolve: (request: StreamRequest, signal?: AbortSignal) => Promise<StreamSource[]>
}

/** Construit l'URL de résolution pour un backend compatible CinePro/AutoFlix. */
function buildStreamEndpoint(base: string, request: StreamRequest): string {
  const url = new URL(`${base}/stream`)
  url.searchParams.set('type', request.kind)
  url.searchParams.set('tmdb_id', String(request.tmdbId))
  if (request.kind === 'tv') {
    url.searchParams.set('season', String(request.season ?? 1))
    url.searchParams.set('episode', String(request.episode ?? 1))
  }
  if (request.title) url.searchParams.set('title', request.title)
  if (request.year) url.searchParams.set('year', request.year)
  return url.toString()
}

const resolvers: Resolver[] = [
  {
    id: 'cinepro',
    label: 'CinePro Core',
    isEnabled: () => Boolean(CINEPRO_API_URL),
    resolve: async (request, signal) => {
      const payload = await fetchJson(buildStreamEndpoint(CINEPRO_API_URL, request), signal)
      return normalizeSources(payload, 'CinePro')
    },
  },
  {
    id: 'autoflix',
    label: 'AutoFlix',
    isEnabled: () => Boolean(AUTOFLIX_API_URL),
    resolve: async (request, signal) => {
      const payload = await fetchJson(buildStreamEndpoint(AUTOFLIX_API_URL, request), signal)
      return normalizeSources(payload, 'AutoFlix')
    },
  },
]

/**
 * Interroge les résolveurs configurés, dans l'ordre, et agrège leurs sources.
 *
 * - Un résolveur en erreur n'empêche pas les suivants de répondre : l'erreur
 *   part dans `warnings` (affichée sous le lecteur).
 * - Si rien n'est trouvé ET qu'un flux de démonstration est configuré, on
 *   renvoie ce flux pour permettre de tester le lecteur.
 * - `AbortError` est propagé : le composant appelant est démonté.
 */
export async function resolveStreams(
  request: StreamRequest,
  signal?: AbortSignal,
): Promise<StreamResolution> {
  const warnings: string[] = []
  const collected: StreamSource[] = []
  const enabled = resolvers.filter((resolver) => resolver.isEnabled())

  // 1) Catalogue local (`public/streams.json`) : vos propres sources passent en premier.
  const local = await resolveFromLocalCatalog(request)
  collected.push(...local.sources)

  // 2) Résolveurs HTTP distants (CinePro / AutoFlix).
  for (const resolver of enabled) {
    try {
      const sources = await resolver.resolve(request, signal)
      if (sources.length === 0) warnings.push(`${resolver.label} n'a renvoyé aucune source.`)
      collected.push(...sources)
    } catch (error) {
      if ((error as Error)?.name === 'AbortError') throw error
      const message = error instanceof Error ? error.message : 'erreur inconnue'
      warnings.push(`${resolver.label} est injoignable (${message}).`)
    }
  }

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
    configured: Boolean(enabled.length) || local.hasCatalog,
    localCatalog: local.sources.length,
  }
}

function qualityScore(quality: string | undefined): number {
  if (!quality) return 0
  const match = quality.match(/(\d{3,4})/)
  if (match) return Number(match[1])
  const lower = quality.toLowerCase()
  if (lower.includes('4k') || lower.includes('uhd')) return 2160
  if (lower.includes('auto')) return 1000
  return 0
}

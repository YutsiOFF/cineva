import type { MediaKind } from '../types/media'

/* ---------------------------------------------------------------------------
 * « Où regarder » — disponibilité légale d'un titre
 *
 * Deux APIs, appelées directement depuis le navigateur (CORS ouvert, donc
 * compatibles GitHub Pages), avec des clés PUBLIQUES fournies au build :
 *
 *   - Watchmode            https://api.watchmode.com
 *     GET /v1/title/{movie|tv}-{tmdbId}/sources/?regions=FR
 *     header X-API-Key. Renvoie les plateformes (abonnement, location, achat,
 *     gratuit) et un lien web officiel (web_url) vers le titre.
 *
 *   - Streaming Availability (Movie of the Night)
 *     GET https://api.movieofthenight.com/v4/shows/{movie|tv}/{tmdbId}
 *     header X-API-Key. Renvoie `streamingOptions` par pays, avec un lien
 *     profond officiel (`link`), la qualité et l'audio.
 *
 * Ces deux services ne lisent AUCUNE vidéo : ils indiquent où le titre est
 * légalement disponible et fournissent le lien vers la plateforme. Aucune URL
 * de flux n'est renvoyée, et l'application n'en fabrique pas.
 * ------------------------------------------------------------------------- */

export type OfferType = 'subscription' | 'free' | 'ads' | 'rent' | 'buy' | 'cinema' | 'unknown'

export interface ProviderOffer {
  id: string
  provider: string
  type: OfferType
  /** Lien officiel vers le titre sur la plateforme. */
  url: string
  quality?: string
  language?: string
  /** Prix formaté (location/achat) quand l'API le fournit. */
  price?: string
}

export interface WatchAvailability {
  offers: ProviderOffer[]
  /** Vrai si au moins une clé API est configurée. */
  configured: boolean
  /** Pays interrogé (ISO 3166-1 alpha-2). */
  region: string
  warnings: string[]
}

const WATCHMODE_KEY = (import.meta.env.VITE_WATCHMODE_API_KEY ?? '').trim()
const MOTN_KEY = (import.meta.env.VITE_STREAMING_AVAILABILITY_API_KEY ?? '').trim()

/** Pays utilisé pour la disponibilité (FR par défaut). */
export const WATCH_REGION = (import.meta.env.VITE_WATCH_REGION ?? 'FR').trim().toUpperCase()
export const watchRegionName =
  new Intl.DisplayNames(['fr'], { type: 'region' }).of(WATCH_REGION) ?? WATCH_REGION

export const availabilityConfigured = Boolean(WATCHMODE_KEY || MOTN_KEY)

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const OFFER_ORDER: Record<OfferType, number> = {
  subscription: 0,
  free: 1,
  ads: 2,
  rent: 3,
  buy: 4,
  cinema: 5,
  unknown: 6,
}

export const offerTypeLabel: Record<OfferType, string> = {
  subscription: 'Abonnement',
  free: 'Gratuit',
  ads: 'Avec publicité',
  rent: 'Location',
  buy: 'Achat',
  cinema: 'Au cinéma',
  unknown: 'Disponible',
}

function normalizeType(value: unknown): OfferType {
  const type = String(value ?? '').toLowerCase()
  if (type === 'sub' || type === 'subscription' || type === 'addon') return 'subscription'
  if (type === 'free') return 'free'
  if (type === 'ads' || type === 'tve') return 'ads'
  if (type === 'rent') return 'rent'
  if (type === 'buy' || type === 'purchase') return 'buy'
  if (type === 'cinema') return 'cinema'
  return 'unknown'
}

function formatPrice(value: unknown): string | undefined {
  if (!isRecord(value)) return undefined
  const amount = Number(value.amount)
  const currency = typeof value.currency === 'string' ? value.currency.toUpperCase() : ''
  if (!Number.isFinite(amount) || !currency) return undefined
  try {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(amount)
  } catch {
    return `${amount} ${currency}`
  }
}

function toOffer(
  provider: string,
  type: OfferType,
  url: unknown,
  extra: { quality?: unknown; language?: unknown; price?: unknown } = {},
): ProviderOffer | null {
  if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) return null
  const quality = typeof extra.quality === 'string' ? extra.quality : undefined
  const language = typeof extra.language === 'string' ? extra.language : undefined
  const price = formatPrice(extra.price)
  return {
    id: `${provider}-${type}-${url}`.replace(/\s+/g, '-').slice(0, 180),
    provider,
    type,
    url,
    quality,
    language,
    price,
  }
}

/* ------------------------------- Watchmode ------------------------------- */

async function fetchFromWatchmode(
  kind: MediaKind,
  tmdbId: number,
  signal?: AbortSignal,
): Promise<ProviderOffer[]> {
  const url = new URL(`https://api.watchmode.com/v1/title/${kind}-${tmdbId}/sources/`)
  url.searchParams.set('regions', WATCH_REGION)

  const response = await fetch(url, {
    signal,
    headers: { Accept: 'application/json', 'X-API-Key': WATCHMODE_KEY },
  })
  if (!response.ok) throw new Error(`Watchmode a répondu ${response.status}`)

  const payload: unknown = await response.json()
  if (!Array.isArray(payload)) return []

  return payload
    .filter(isRecord)
    .map((entry) => {
      const provider = String(entry.name ?? 'Plateforme')
      const offer = toOffer(provider, normalizeType(entry.type), entry.web_url, {
        quality: entry.format,
        price: typeof entry.price === 'number' ? { amount: entry.price, currency: 'EUR' } : undefined,
      })
      return offer
    })
    .filter((offer): offer is ProviderOffer => offer !== null)
}

/* ---------------------- Streaming Availability (MotN) --------------------- */

async function fetchFromStreamingAvailability(
  kind: MediaKind,
  tmdbId: number,
  signal?: AbortSignal,
): Promise<ProviderOffer[]> {
  const response = await fetch(`https://api.movieofthenight.com/v4/shows/${kind}/${tmdbId}`, {
    signal,
    headers: { Accept: 'application/json', 'X-API-Key': MOTN_KEY },
  })
  if (!response.ok) throw new Error(`Streaming Availability a répondu ${response.status}`)

  const payload: unknown = await response.json()
  if (!isRecord(payload) || !isRecord(payload.streamingOptions)) return []

  const options = payload.streamingOptions
  // Les clés pays sont en minuscules (ex. « fr ») ; on tolère la casse.
  const countryKey = Object.keys(options).find((key) => key.toLowerCase() === WATCH_REGION.toLowerCase())
  const entries = countryKey ? options[countryKey] : undefined
  if (!Array.isArray(entries)) return []

  return entries
    .filter(isRecord)
    .map((entry) => {
      const service = isRecord(entry.service) ? entry.service : {}
      const provider = String(service.name ?? service.id ?? 'Plateforme')
      const audios = Array.isArray(entry.audios) ? entry.audios.filter((a) => typeof a === 'string') : []
      return toOffer(provider, normalizeType(entry.type), entry.link, {
        quality: entry.quality,
        language: audios.length > 0 ? String(audios[0]).toUpperCase() : undefined,
        price: entry.price,
      })
    })
    .filter((offer): offer is ProviderOffer => offer !== null)
}

/* ------------------------------- Agrégation ------------------------------ */

/**
 * Interroge les fournisseurs configurés en parallèle. Un fournisseur en erreur
 * n'empêche pas l'autre de répondre : l'erreur part dans `warnings`.
 */
export async function fetchWatchAvailability(
  { kind, tmdbId }: { kind: MediaKind; tmdbId: number },
  signal?: AbortSignal,
): Promise<WatchAvailability> {
  if (!availabilityConfigured) {
    return { offers: [], configured: false, region: WATCH_REGION, warnings: [] }
  }

  const warnings: string[] = []
  const collected: ProviderOffer[] = []

  const tasks: Array<Promise<ProviderOffer[]>> = []
  if (WATCHMODE_KEY) tasks.push(fetchFromWatchmode(kind, tmdbId, signal))
  if (MOTN_KEY) tasks.push(fetchFromStreamingAvailability(kind, tmdbId, signal))

  const results = await Promise.allSettled(tasks)
  for (const result of results) {
    if (result.status === 'fulfilled') collected.push(...result.value)
    else if ((result.reason as Error)?.name === 'AbortError') throw result.reason
    else warnings.push(result.reason instanceof Error ? result.reason.message : 'Fournisseur indisponible')
  }

  const seen = new Set<string>()
  const offers = collected
    .filter((offer) => {
      const key = `${offer.provider}|${offer.type}|${offer.url}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort((a, b) => OFFER_ORDER[a.type] - OFFER_ORDER[b.type] || a.provider.localeCompare(b.provider))

  return { offers, configured: true, region: WATCH_REGION, warnings }
}

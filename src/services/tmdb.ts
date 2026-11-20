import type {
  CastMember,
  Episode,
  MediaDetail,
  MediaKind,
  MediaSummary,
  PagedResult,
  SeasonDetail,
  SeasonSummary,
} from '../types/media'

/* ---------------------------------------------------------------------------
 * Client TMDB (API v3)
 *
 * La clé est publique par nature : elle est appelée directement depuis le
 * navigateur. TMDB permet de restreindre une clé v3 par referrer/domaine, ce qui
 * est la protection recommandée pour un site statique.
 * ------------------------------------------------------------------------- */

const API_BASE = 'https://api.themoviedb.org/3'
const API_KEY = (import.meta.env.VITE_TMDB_API_KEY ?? '').trim()
const LANGUAGE = (import.meta.env.VITE_TMDB_LANGUAGE ?? 'fr-FR').trim()

/** Permet d'afficher un écran de configuration plutôt qu'une erreur brute. */
export const hasTmdbKey = API_KEY.length > 0

const CACHE_TTL = 5 * 60 * 1000
const cache = new Map<string, { expires: number; value: unknown }>()

export class TmdbError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message)
    this.name = 'TmdbError'
  }
}

type QueryValue = string | number | boolean | undefined | null
type Query = Record<string, QueryValue>

function messageForStatus(status: number): string {
  if (status === 401) {
    return "Clé API TMDB refusée. Vérifiez VITE_TMDB_API_KEY : une clé v3 valide comporte 32 caractères."
  }
  if (status === 404) return "Ce contenu n'existe pas (ou plus) sur TMDB."
  if (status === 429) return 'Trop de requêtes vers TMDB. Réessayez dans quelques secondes.'
  if (status >= 500) return 'TMDB est momentanément indisponible. Réessayez plus tard.'
  return `TMDB a répondu avec le code ${status}.`
}

async function request<T>(path: string, query: Query = {}, signal?: AbortSignal): Promise<T> {
  if (!hasTmdbKey) {
    throw new TmdbError("Aucune clé API TMDB n'est configurée (VITE_TMDB_API_KEY).", 401)
  }

  const url = new URL(`${API_BASE}${path}`)
  url.searchParams.set('api_key', API_KEY)
  url.searchParams.set('language', LANGUAGE)
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue
    url.searchParams.set(key, String(value))
  }

  const cacheKey = url.toString()
  const cached = cache.get(cacheKey)
  if (cached && cached.expires > Date.now()) return cached.value as T

  let response: Response
  try {
    response = await fetch(url, { signal, headers: { Accept: 'application/json' } })
  } catch (error) {
    if ((error as Error)?.name === 'AbortError') throw error
    throw new TmdbError('Impossible de joindre TMDB. Vérifiez votre connexion réseau.', 0)
  }

  if (!response.ok) throw new TmdbError(messageForStatus(response.status), response.status)
  const data = (await response.json()) as T
  cache.set(cacheKey, { value: data, expires: Date.now() + CACHE_TTL })
  return data
}

/* ------------------------------- Images --------------------------------- */

export const IMAGE_BASE = 'https://image.tmdb.org/t/p'
export type ImageSize = 'w200' | 'w342' | 'w500' | 'w780' | 'w1280' | 'original'

/** Construit une URL d'image TMDB (null si le chemin est absent). */
export function imageUrl(path: string | null | undefined, size: ImageSize = 'w500'): string | null {
  if (!path) return null
  return `${IMAGE_BASE}/${size}${path}`
}

/* ------------------------------ Payloads -------------------------------- */

interface RawMedia {
  id: number
  media_type?: string
  title?: string
  name?: string
  overview?: string
  poster_path?: string | null
  backdrop_path?: string | null
  vote_average?: number
  vote_count?: number
  release_date?: string
  first_air_date?: string
  genre_ids?: number[]
}

interface RawSeason {
  id: number
  season_number: number
  name?: string
  overview?: string
  poster_path?: string | null
  episode_count?: number
  air_date?: string | null
}

interface RawEpisode {
  id: number
  episode_number: number
  name?: string
  overview?: string
  still_path?: string | null
  runtime?: number | null
  air_date?: string | null
  vote_average?: number
}

interface RawDetail extends RawMedia {
  tagline?: string
  status?: string
  runtime?: number | null
  episode_run_time?: number[]
  number_of_seasons?: number
  genres?: Array<{ id: number; name: string }>
  seasons?: RawSeason[]
  credits?: { cast?: Array<{ id: number; name: string; character?: string; profile_path?: string | null }> }
  videos?: { results?: Array<{ key: string; site: string; type: string; official?: boolean }> }
  similar?: { results?: RawMedia[] }
}

interface RawListResponse {
  results?: RawMedia[]
  page?: number
  total_pages?: number
  total_results?: number
}

/* ----------------------------- Normalisation ---------------------------- */

function kindOf(raw: RawMedia, fallback: MediaKind): MediaKind {
  if (raw.media_type === 'tv') return 'tv'
  if (raw.media_type === 'movie') return 'movie'
  return fallback
}

function toSummary(raw: RawMedia, kind: MediaKind): MediaSummary {
  return {
    id: raw.id,
    kind,
    title: raw.title ?? raw.name ?? 'Sans titre',
    overview: raw.overview ?? '',
    posterPath: raw.poster_path ?? null,
    backdropPath: raw.backdrop_path ?? null,
    voteAverage: typeof raw.vote_average === 'number' ? raw.vote_average : 0,
    voteCount: raw.vote_count ?? 0,
    releaseDate: raw.release_date ?? raw.first_air_date ?? null,
    genreIds: raw.genre_ids ?? [],
  }
}

function toSeasons(seasons: RawSeason[] | undefined): SeasonSummary[] {
  return (seasons ?? [])
    // La saison 0 correspond aux épisodes spéciaux : on l'ignore dans l'UI classique.
    .filter((season) => season.season_number > 0)
    .map((season) => ({
      id: season.id,
      seasonNumber: season.season_number,
      name: season.name ?? `Saison ${season.season_number}`,
      overview: season.overview ?? '',
      posterPath: season.poster_path ?? null,
      episodeCount: season.episode_count ?? 0,
      airDate: season.air_date ?? null,
    }))
}

function toCast(cast: RawDetail['credits']): CastMember[] {
  return (cast?.cast ?? []).slice(0, 12).map((member) => ({
    id: member.id,
    name: member.name,
    character: member.character ?? '',
    profilePath: member.profile_path ?? null,
  }))
}

function pickTrailerKey(videos: RawDetail['videos']): string | null {
  const youtube = (videos?.results ?? []).filter((video) => video.site === 'YouTube')
  const officialTrailer = youtube.find((video) => video.type === 'Trailer' && video.official)
  const anyTrailer = youtube.find((video) => video.type === 'Trailer')
  const teaser = youtube.find((video) => video.type === 'Teaser')
  return (officialTrailer ?? anyTrailer ?? teaser ?? youtube[0])?.key ?? null
}

function toDetail(raw: RawDetail, kind: MediaKind): MediaDetail {
  const summary = toSummary(raw, kind)
  return {
    ...summary,
    tagline: raw.tagline ?? '',
    status: raw.status ?? '',
    runtime: typeof raw.runtime === 'number' ? raw.runtime : (raw.episode_run_time?.[0] ?? null),
    genres: (raw.genres ?? []).map((genre) => ({ id: genre.id, name: genre.name })),
    numberOfSeasons: raw.number_of_seasons ?? null,
    seasons: kind === 'tv' ? toSeasons(raw.seasons) : [],
    cast: toCast(raw.credits),
    similar: (raw.similar?.results ?? [])
      .map((item) => toSummary(item, kindOf(item, kind)))
      .filter((item) => item.id !== summary.id)
      .slice(0, 18),
    trailerKey: pickTrailerKey(raw.videos),
    homepage: null,
  }
}

/* ------------------------------- Endpoints ------------------------------ */

/** `/trending/{movie|tv|all}/{day|week}` */
export async function fetchTrending(
  kind: MediaKind | 'all',
  window: 'day' | 'week' = 'week',
  signal?: AbortSignal,
): Promise<MediaSummary[]> {
  const data = await request<RawListResponse>(`/trending/${kind}/${window}`, {}, signal)
  const fallback: MediaKind = kind === 'tv' ? 'tv' : 'movie'
  return (data.results ?? [])
    .filter((item) => item.media_type !== 'person')
    .map((item) => toSummary(item, kindOf(item, fallback)))
    .filter((item) => Boolean(item.posterPath ?? item.backdropPath))
}

/** `/movie/popular` ou `/tv/popular` */
export async function fetchPopular(kind: MediaKind, signal?: AbortSignal): Promise<MediaSummary[]> {
  const data = await request<RawListResponse>(`/${kind}/popular`, { page: 1 }, signal)
  return (data.results ?? []).map((item) => toSummary(item, kind))
}

/** `/movie/top_rated` ou `/tv/top_rated` */
export async function fetchTopRated(kind: MediaKind, signal?: AbortSignal): Promise<MediaSummary[]> {
  const data = await request<RawListResponse>(`/${kind}/top_rated`, { page: 1 }, signal)
  return (data.results ?? []).map((item) => toSummary(item, kind))
}

/** `/discover/{kind}?with_genres=...` — rangées par genre. */
export async function fetchByGenre(
  kind: MediaKind,
  genreId: number,
  signal?: AbortSignal,
): Promise<MediaSummary[]> {
  const data = await request<RawListResponse>(
    `/discover/${kind}`,
    { with_genres: genreId, sort_by: 'popularity.desc', page: 1, 'vote_count.gte': 40, include_adult: false },
    signal,
  )
  return (data.results ?? []).map((item) => toSummary(item, kind))
}

/**
 * `/movie/{id}` ou `/tv/{id}` avec `append_to_response` pour récupérer en une
 * seule requête : vidéos (bande-annonce), casting et contenus similaires.
 */
export async function fetchDetails(
  kind: MediaKind,
  id: number,
  signal?: AbortSignal,
): Promise<MediaDetail> {
  const raw = await request<RawDetail>(
    `/${kind}/${id}`,
    { append_to_response: 'videos,credits,similar' },
    signal,
  )
  return toDetail(raw, kind)
}

/** `/tv/{id}/season/{season_number}` */
export async function fetchSeason(
  tvId: number,
  seasonNumber: number,
  signal?: AbortSignal,
): Promise<SeasonDetail> {
  const raw = await request<{
    id: number
    season_number: number
    name?: string
    overview?: string
    episodes?: RawEpisode[]
  }>(`/tv/${tvId}/season/${seasonNumber}`, {}, signal)

  const episodes: Episode[] = (raw.episodes ?? []).map((episode) => ({
    id: episode.id,
    episodeNumber: episode.episode_number,
    name: episode.name ?? `Épisode ${episode.episode_number}`,
    overview: episode.overview ?? '',
    stillPath: episode.still_path ?? null,
    runtime: episode.runtime ?? null,
    airDate: episode.air_date ?? null,
    voteAverage: episode.vote_average ?? 0,
  }))

  return {
    id: raw.id,
    seasonNumber: raw.season_number,
    name: raw.name ?? `Saison ${raw.season_number}`,
    overview: raw.overview ?? '',
    episodes,
  }
}

/** `/search/multi` — films, séries et personnes (les personnes sont filtrées). */
export async function searchMulti(
  query: string,
  page = 1,
  signal?: AbortSignal,
): Promise<PagedResult<MediaSummary>> {
  const data = await request<RawListResponse>(
    '/search/multi',
    { query, page, include_adult: false },
    signal,
  )
  return {
    items: (data.results ?? [])
      .filter((item) => item.media_type === 'movie' || item.media_type === 'tv')
      .map((item) => toSummary(item, item.media_type === 'tv' ? 'tv' : 'movie')),
    page: data.page ?? page,
    totalPages: data.total_pages ?? 1,
    totalResults: data.total_results ?? 0,
  }
}

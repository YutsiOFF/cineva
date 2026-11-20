/** Type d'un contenu TMDB pris en charge par l'application. */
export type MediaKind = 'movie' | 'tv'

/** Contenu tel qu'affiché dans une carte, une rangée ou la liste personnelle. */
export interface MediaSummary {
  id: number
  kind: MediaKind
  title: string
  overview: string
  posterPath: string | null
  backdropPath: string | null
  voteAverage: number
  voteCount: number
  /** Date de sortie (film) ou de première diffusion (série), format `YYYY-MM-DD`. */
  releaseDate: string | null
  genreIds: number[]
}

export interface Genre {
  id: number
  name: string
}

export interface CastMember {
  id: number
  name: string
  character: string
  profilePath: string | null
}

export interface SeasonSummary {
  id: number
  seasonNumber: number
  name: string
  overview: string
  posterPath: string | null
  episodeCount: number
  airDate: string | null
}

/** Fiche complète d'un film ou d'une série. */
export interface MediaDetail extends MediaSummary {
  tagline: string
  status: string
  /** Durée en minutes (films uniquement). */
  runtime: number | null
  genres: Genre[]
  numberOfSeasons: number | null
  seasons: SeasonSummary[]
  cast: CastMember[]
  similar: MediaSummary[]
  trailerKey: string | null
  homepage: string | null
}

export interface Episode {
  id: number
  episodeNumber: number
  name: string
  overview: string
  stillPath: string | null
  runtime: number | null
  airDate: string | null
  voteAverage: number
}

export interface SeasonDetail {
  id: number
  seasonNumber: number
  name: string
  overview: string
  episodes: Episode[]
}

/** Réponse paginée générique (recherche). */
export interface PagedResult<T> {
  items: T[]
  page: number
  totalPages: number
  totalResults: number
}

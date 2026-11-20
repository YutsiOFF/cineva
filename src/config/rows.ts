import { fetchByGenre, fetchPopular, fetchTopRated, fetchTrending } from '../services/tmdb'
import type { MediaSummary } from '../types/media'

export interface MediaRowDefinition {
  key: string
  title: string
  /** Chargée à la demande : chaque rangée est indépendante (échec isolé). */
  load: () => Promise<MediaSummary[]>
}

/**
 * Rangées de la page d'accueil. Ajouter/retirer une rangée = éditer ce tableau,
 * la page s'adapte automatiquement (squelettes, erreurs par rangée inclus).
 */
export const homeRows: MediaRowDefinition[] = [
  { key: 'trending', title: 'Tendances de la semaine', load: () => fetchTrending('all', 'week') },
  { key: 'popular-movies', title: 'Films populaires', load: () => fetchPopular('movie') },
  { key: 'popular-tv', title: 'Séries populaires', load: () => fetchPopular('tv') },
  { key: 'top-rated', title: 'Les mieux notés', load: () => fetchTopRated('movie') },
  { key: 'action', title: 'Action & aventure', load: () => fetchByGenre('movie', 28) },
  { key: 'scifi', title: 'Science-fiction', load: () => fetchByGenre('movie', 878) },
  { key: 'comedy', title: 'Comédies', load: () => fetchByGenre('movie', 35) },
  { key: 'animation', title: 'Animation', load: () => fetchByGenre('movie', 16) },
  { key: 'drama-tv', title: 'Séries dramatiques', load: () => fetchByGenre('tv', 18) },
]

/// <reference types="vite/client" />

/**
 * Variables d'environnement publiques (build-time).
 * Tout ce qui commence par VITE_ est inclus en clair dans le bundle : aucune
 * valeur secrète ne doit figurer ici (voir .env.example).
 */
interface ImportMetaEnv {
  readonly VITE_TMDB_API_KEY?: string
  readonly VITE_TMDB_LANGUAGE?: string
  readonly VITE_WATCH_REGION?: string
  readonly VITE_WATCHMODE_API_KEY?: string
  readonly VITE_STREAMING_AVAILABILITY_API_KEY?: string
  readonly VITE_DEMO_STREAM_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

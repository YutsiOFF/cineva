import { Link } from 'react-router-dom'
import { cn } from '../../lib/cn'
import { AlertIcon, FilmIcon, RefreshIcon } from './icons'

interface ErrorStateProps {
  title?: string
  message: string
  onRetry?: () => void
  className?: string
}

/** Message d'erreur générique (API indisponible, réseau, contenu introuvable). */
export function ErrorState({ title = 'Une erreur est survenue', message, onRetry, className }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'mx-auto flex max-w-xl flex-col items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-10 text-center',
        className,
      )}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/15 text-red-300">
        <AlertIcon className="h-6 w-6" />
      </span>
      <div>
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-white/60">{message}</p>
      </div>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-ghost">
          <RefreshIcon className="h-4 w-4" />
          Réessayer
        </button>
      )}
    </div>
  )
}

/** Écran affiché quand la clé TMDB est absente ou refusée. */
export function ApiKeyNotice({ detail }: { detail?: string }) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-4 py-24 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-gradient shadow-glow">
        <FilmIcon className="h-7 w-7 text-white" />
      </span>
      <div>
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">Configurez votre clé TMDB</h1>
        <p className="mt-3 text-sm leading-relaxed text-white/65">
          Le catalogue ne peut pas être chargé : {detail ?? 'la clé API TMDB est manquante ou invalide.'}
        </p>
      </div>

      <div className="w-full rounded-2xl border border-white/10 bg-ink-900/80 p-5 text-left">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/40">Mise en place</p>
        <ol className="mt-3 space-y-2 text-sm text-white/70">
          <li>
            1. Créez une clé API v3 sur{' '}
            <a
              className="font-medium text-accent-soft underline decoration-accent/40 underline-offset-4 hover:text-white"
              href="https://www.themoviedb.org/settings/api"
              target="_blank"
              rel="noreferrer noopener"
            >
              themoviedb.org
            </a>{' '}
            (32 caractères).
          </li>
          <li>
            2. Ajoutez-la dans <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">.env</code> :
            <code className="mt-2 block overflow-x-auto rounded-lg bg-black/60 px-3 py-2 text-xs text-accent-soft">
              VITE_TMDB_API_KEY=votre_cle
            </code>
          </li>
          <li>
            3. Redémarrez <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">npm run dev</code> (les
            variables VITE_ sont lues au build).
          </li>
        </ol>
      </div>

      <Link to="/" className="btn-ghost">
        Revenir à l&apos;accueil
      </Link>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { cn } from '../../lib/cn'
import { imageUrl, type ImageSize } from '../../services/tmdb'

interface PosterImageProps {
  path: string | null
  title: string
  size?: ImageSize
  className?: string
  /** `true` pour les images visibles immédiatement (hero), sinon lazy. */
  eager?: boolean
}

/**
 * Affiche une affiche TMDB avec repli typographique si l'image manque ou casse.
 * `loading="lazy"` + `decoding="async"` évitent de bloquer le rendu des rangées.
 */
export function PosterImage({ path, title, size = 'w500', className, eager = false }: PosterImageProps) {
  const [failed, setFailed] = useState(false)
  const url = imageUrl(path, size)

  useEffect(() => {
    setFailed(false)
  }, [path])

  if (!url || failed) {
    return (
      <div
        className={cn(
          'flex h-full w-full items-center justify-center bg-gradient-to-br from-ink-750 via-ink-850 to-ink-900 p-3 text-center',
          className,
        )}
      >
        <span className="line-clamp-3 font-display text-xs uppercase tracking-[0.2em] text-white/35">{title}</span>
      </div>
    )
  }

  return (
    <img
      src={url}
      alt={`Affiche de ${title}`}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      draggable={false}
      onError={() => setFailed(true)}
      className={cn('h-full w-full bg-ink-850 object-cover', className)}
    />
  )
}

import { useEffect, useRef } from 'react'
import { CloseIcon } from '../ui/icons'

interface TrailerModalProps {
  videoKey: string
  title: string
  onClose: () => void
}

/** Modale bande-annonce YouTube (chargée uniquement à l'ouverture). */
export function TrailerModal({ videoKey, title, onClose }: TrailerModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Bande-annonce de ${title}`}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="w-full max-w-4xl" onClick={(event) => event.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between gap-4">
          <p className="font-display text-sm font-semibold text-white/80">{title} — bande-annonce</p>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Fermer la bande-annonce"
            className="btn-icon"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="aspect-video overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl">
          <iframe
            title={`Bande-annonce de ${title}`}
            src={`https://www.youtube-nocookie.com/embed/${videoKey}?autoplay=1&rel=0`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
      </div>
    </div>
  )
}

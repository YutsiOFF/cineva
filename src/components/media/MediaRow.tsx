import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '../../lib/cn'
import type { MediaSummary } from '../../types/media'
import { ChevronLeftIcon, ChevronRightIcon } from '../ui/icons'
import { RowSkeleton } from '../ui/Skeleton'
import { MediaCard } from './MediaCard'

interface MediaRowProps {
  title: string
  items: MediaSummary[]
  loading?: boolean
}

/** Carrousel horizontal : flèches, molette/shift, snap, clavier. */
export function MediaRow({ title, items, loading = false }: MediaRowProps) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const updateArrows = useCallback(() => {
    const node = scrollerRef.current
    if (!node) return
    const maxScrollLeft = node.scrollWidth - node.clientWidth
    setCanScrollLeft(node.scrollLeft > 8)
    setCanScrollRight(maxScrollLeft > 8 && node.scrollLeft < maxScrollLeft - 8)
  }, [])

  useEffect(() => {
    updateArrows()
    const node = scrollerRef.current
    if (!node) return
    const observer = new ResizeObserver(updateArrows)
    observer.observe(node)
    return () => observer.disconnect()
  }, [updateArrows, items.length])

  const scrollBy = (direction: 1 | -1) => {
    const node = scrollerRef.current
    if (!node) return
    node.scrollBy({ left: direction * node.clientWidth * 0.82, behavior: 'smooth' })
  }

  const headingId = `row-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`

  if (!loading && items.length === 0) return null

  return (
    <section aria-labelledby={headingId} className="relative">
      <div className="flex items-end justify-between gap-4 px-4 sm:px-6 lg:px-10">
        <h2 id={headingId} className="font-display text-base font-semibold tracking-tight sm:text-lg lg:text-xl">
          {title}
        </h2>
      </div>

      <div className="group/row relative mt-3">
        <button
          type="button"
          onClick={() => scrollBy(-1)}
          aria-label={`Faire défiler « ${title} » vers la gauche`}
          tabIndex={canScrollLeft ? 0 : -1}
          className={cn(
            'absolute left-0 top-0 z-20 hidden h-full w-10 items-center justify-center bg-gradient-to-r from-ink-950 via-ink-950/70 to-transparent text-white opacity-0 transition duration-300 hover:from-ink-950 lg:flex',
            canScrollLeft ? 'group-hover/row:opacity-100 focus-visible:opacity-100' : 'pointer-events-none',
          )}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/70 backdrop-blur">
            <ChevronLeftIcon className="h-5 w-5" />
          </span>
        </button>

        <div
          ref={scrollerRef}
          onScroll={updateArrows}
          className="scrollbar-none flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:gap-4 sm:px-6 lg:px-10"
        >
          {loading
            ? Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="w-[136px] shrink-0 sm:w-[160px] lg:w-[184px]">
                  <div className="aspect-[2/3] animate-pulse rounded-xl bg-white/[0.06]" />
                </div>
              ))
            : items.map((media) => (
                <div
                  key={`${media.kind}-${media.id}`}
                  className="w-[136px] shrink-0 snap-start sm:w-[160px] lg:w-[184px]"
                >
                  <MediaCard media={media} />
                </div>
              ))}
        </div>

        <button
          type="button"
          onClick={() => scrollBy(1)}
          aria-label={`Faire défiler « ${title} » vers la droite`}
          tabIndex={canScrollRight ? 0 : -1}
          className={cn(
            'absolute right-0 top-0 z-20 hidden h-full w-10 items-center justify-center bg-gradient-to-l from-ink-950 via-ink-950/70 to-transparent text-white opacity-0 transition duration-300 hover:from-ink-950 lg:flex',
            canScrollRight ? 'group-hover/row:opacity-100 focus-visible:opacity-100' : 'pointer-events-none',
          )}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/70 backdrop-blur">
            <ChevronRightIcon className="h-5 w-5" />
          </span>
        </button>
      </div>
    </section>
  )
}

/** Rangées squelettes affichées pendant le premier chargement de l'accueil. */
export function MediaRowsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-10">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="space-y-3">
          <div className="px-4 sm:px-6 lg:px-10">
            <div className="h-5 w-44 animate-pulse rounded bg-white/[0.07]" />
          </div>
          <RowSkeleton count={6} />
        </div>
      ))}
    </div>
  )
}

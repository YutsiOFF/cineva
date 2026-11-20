import { cn } from '../../lib/cn'

/** Bloc gris animé utilisé pendant les chargements. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn('relative overflow-hidden rounded-xl bg-white/[0.06]', className)}
    >
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
    </div>
  )
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('w-full', className)}>
      <Skeleton className="aspect-[2/3] w-full" />
      <Skeleton className="mt-2 h-3 w-3/4 rounded-md" />
    </div>
  )
}

export function RowSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="flex gap-3 overflow-hidden px-4 sm:gap-4 sm:px-6 lg:px-10">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="w-[140px] shrink-0 sm:w-[164px] lg:w-[188px]">
          <Skeleton className="aspect-[2/3] w-full" />
        </div>
      ))}
    </div>
  )
}

export function HeroSkeleton() {
  return (
    <div className="relative flex min-h-[78vh] items-end overflow-hidden pb-14 pt-32 md:min-h-[86vh]">
      <Skeleton className="absolute inset-0 rounded-none" />
      <div className="relative w-full px-4 sm:px-6 lg:px-10">
        <Skeleton className="h-4 w-24 rounded-md" />
        <Skeleton className="mt-4 h-12 w-[min(560px,80%)] rounded-lg" />
        <Skeleton className="mt-4 h-4 w-[min(420px,70%)] rounded-md" />
        <Skeleton className="mt-2 h-4 w-[min(360px,60%)] rounded-md" />
        <div className="mt-7 flex gap-3">
          <Skeleton className="h-12 w-36" />
          <Skeleton className="h-12 w-40" />
        </div>
      </div>
    </div>
  )
}

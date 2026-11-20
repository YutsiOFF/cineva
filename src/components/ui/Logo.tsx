import { Link } from 'react-router-dom'
import { cn } from '../../lib/cn'
import { PlayIcon } from './icons'

/** Logo CINEVA (texte gradient + pastille lecture). */
export function Logo({ className, onClick }: { className?: string; onClick?: () => void }) {
  return (
    <Link
      to="/"
      onClick={onClick}
      aria-label="CINEVA — accueil"
      className={cn('group inline-flex items-center gap-2.5', className)}
    >
      <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-accent-gradient shadow-glow transition duration-300 ease-smooth group-hover:scale-105">
        <PlayIcon className="h-3.5 w-3.5 translate-x-[1px] text-white" />
      </span>
      <span className="font-display text-xl font-extrabold tracking-[0.18em] text-white">
        CINE<span className="bg-accent-gradient bg-clip-text text-transparent">VA</span>
      </span>
    </Link>
  )
}

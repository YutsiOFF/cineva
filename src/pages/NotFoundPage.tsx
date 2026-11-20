import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-5 px-4 pt-24 text-center">
      <p className="font-display text-6xl font-extrabold tracking-tight">
        <span className="bg-accent-gradient bg-clip-text text-transparent">404</span>
      </p>
      <div>
        <h1 className="font-display text-xl font-semibold sm:text-2xl">Cette page n&apos;existe pas</h1>
        <p className="mt-2 max-w-sm text-sm text-white/45">
          Le contenu recherché a peut-être été déplacé, ou l&apos;adresse est incorrecte.
        </p>
      </div>
      <Link to="/" className="btn-accent">
        Retour à l&apos;accueil
      </Link>
    </div>
  )
}

import { Link } from 'react-router-dom'
import { MediaGrid } from '../components/media/MediaGrid'
import { BookmarkIcon, TrashIcon } from '../components/ui/icons'
import { useMyList } from '../store/myList'

/** Ma liste : lecture/écriture dans le localStorage via zustand/persist. */
export default function MyListPage() {
  const items = useMyList((state) => state.items)
  const clear = useMyList((state) => state.clear)

  return (
    <div className="animate-fade-in px-4 pb-10 pt-24 sm:px-6 lg:px-10 lg:pt-28">
      <div className="mx-auto max-w-[1500px]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Ma liste</h1>
            <p className="mt-1.5 text-sm text-white/45">
              {items.length === 0
                ? 'Votre sélection personnelle, enregistrée dans ce navigateur.'
                : `${items.length} contenu${items.length > 1 ? 's' : ''} enregistré${items.length > 1 ? 's' : ''} localement.`}
            </p>
          </div>
          {items.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Vider entièrement votre liste ?')) clear()
              }}
              className="btn-ghost px-4 py-2 text-xs"
            >
              <TrashIcon className="h-4 w-4" />
              Vider la liste
            </button>
          )}
        </div>

        <div className="mt-8">
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-5 rounded-2xl border border-white/10 bg-white/[0.02] px-6 py-16 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.06] text-accent-soft">
                <BookmarkIcon className="h-6 w-6" />
              </span>
              <div>
                <p className="font-display text-lg font-semibold">Votre liste est vide</p>
                <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-white/45">
                  Utilisez le bouton « + » sur une affiche pour ajouter un film ou une série ici.
                </p>
              </div>
              <Link to="/" className="btn-accent">
                Parcourir le catalogue
              </Link>
            </div>
          ) : (
            <MediaGrid items={items} />
          )}
        </div>
      </div>
    </div>
  )
}

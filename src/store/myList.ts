import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { MediaKind, MediaSummary } from '../types/media'

/**
 * « Ma liste » : stockage 100 % local (localStorage via zustand/persist).
 * Aucun compte, aucun serveur : le site reste entièrement statique.
 */
interface MyListState {
  items: MediaSummary[]
  toggle: (media: MediaSummary) => void
  remove: (kind: MediaKind, id: number) => void
  clear: () => void
}

const STORAGE_KEY = 'cineva.mylist.v1'
const MAX_ITEMS = 120

export const useMyList = create<MyListState>()(
  persist(
    (set, get) => ({
      items: [],
      toggle: (media) => {
        const exists = get().items.some((item) => item.kind === media.kind && item.id === media.id)
        set({
          items: exists
            ? get().items.filter((item) => !(item.kind === media.kind && item.id === media.id))
            : [media, ...get().items].slice(0, MAX_ITEMS),
        })
      },
      remove: (kind, id) =>
        set({ items: get().items.filter((item) => !(item.kind === kind && item.id === id)) }),
      clear: () => set({ items: [] }),
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      partialize: (state) => ({ items: state.items }),
    },
  ),
)

/** Vrai si le contenu est déjà dans la liste (sélecteur réactif). */
export function useIsInMyList(kind: MediaKind, id: number): boolean {
  return useMyList((state) => state.items.some((item) => item.kind === kind && item.id === id))
}

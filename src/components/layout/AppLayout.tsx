import type { ReactNode } from 'react'
import { Footer } from './Footer'
import { Header } from './Header'

/** Gabarit commun : header fixe, contenu, footer. */
export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-ink-950"
      >
        Aller au contenu
      </a>
      <Header />
      <main id="contenu" className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  )
}

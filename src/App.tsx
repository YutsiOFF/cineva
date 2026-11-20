import { lazy, Suspense, useEffect } from 'react'
import { Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'

// Code splitting : chaque route charge son propre chunk (hls.js reste dans celui
// de la page de lecture).
const HomePage = lazy(() => import('./pages/HomePage'))
const DetailPage = lazy(() => import('./pages/DetailPage'))
const SearchPage = lazy(() => import('./pages/SearchPage'))
const MyListPage = lazy(() => import('./pages/MyListPage'))
const WatchPage = lazy(() => import('./pages/WatchPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

function SiteLayout() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  )
}

function ScrollToTop() {
  const { pathname, search } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [pathname, search])
  return null
}

function RouteFallback() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center pt-20">
      <span className="h-9 w-9 animate-spin rounded-full border-2 border-white/20 border-t-accent" role="status">
        <span className="sr-only">Chargement…</span>
      </span>
    </div>
  )
}

/**
 * Routage via HashRouter (défini dans main.tsx) : les URLs `#/film/603`
 * fonctionnent sur GitHub Pages sans configuration de rewrite côté serveur.
 */
export default function App() {
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* Le lecteur occupe tout l'écran : pas de header/footer. */}
          <Route path="/watch/:mediaType/:id" element={<WatchPage />} />

          <Route element={<SiteLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/film/:id" element={<DetailPage kind="movie" />} />
            <Route path="/serie/:id" element={<DetailPage kind="tv" />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/ma-liste" element={<MyListPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  )
}

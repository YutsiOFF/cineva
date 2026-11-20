import { useCallback, useEffect, useRef, useState } from 'react'

export interface AsyncState<T> {
  data: T | null
  error: Error | null
  loading: boolean
}

/**
 * Exécute une promesse annulable et expose `{ data, error, loading, reload }`.
 *
 * `factory` reçoit un AbortSignal : transmettez-le au fetch pour annuler la
 * requête quand les dépendances changent ou que le composant est démonté.
 */
export function useAsync<T>(factory: (signal: AbortSignal) => Promise<T>, deps: unknown[]) {
  const factoryRef = useRef(factory)
  factoryRef.current = factory

  const [state, setState] = useState<AsyncState<T>>({ data: null, error: null, loading: true })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    let active = true

    setState((previous) => ({ data: previous.data, error: null, loading: true }))

    factoryRef
      .current(controller.signal)
      .then((data) => {
        if (!active || controller.signal.aborted) return
        setState({ data, error: null, loading: false })
      })
      .catch((error: unknown) => {
        if (!active || controller.signal.aborted) return
        const normalized = error instanceof Error ? error : new Error(String(error))
        if (normalized.name === 'AbortError') return
        setState({ data: null, error: normalized, loading: false })
      })

    return () => {
      active = false
      controller.abort()
    }
    // deps est fourni par l'appelant (liste fixe par hook) + attempt pour reload.
  }, [...deps, attempt])

  const reload = useCallback(() => setAttempt((value) => value + 1), [])

  return { ...state, reload }
}

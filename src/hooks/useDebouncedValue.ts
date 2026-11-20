import { useEffect, useState } from 'react'

/** Retarde la mise à jour d'une valeur (recherche instantanée sans requête par frappe). */
export function useDebouncedValue<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timeout)
  }, [value, delay])

  return debounced
}

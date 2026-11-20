/** Année d'un contenu, ou un tiret si la date est inconnue. */
export function yearOf(date: string | null | undefined): string {
  return date ? date.slice(0, 4) : '—'
}

/** Note TMDB arrondie à une décimale (0 -> « — »). */
export function ratingOf(value: number): string {
  if (!value || Number.isNaN(value)) return '—'
  return value.toFixed(1)
}

/** 128 -> « 2 h 08 ». */
export function formatRuntime(minutes: number | null | undefined): string {
  if (!minutes || minutes <= 0) return ''
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${rest} min`
  return rest === 0 ? `${hours} h` : `${hours} h ${String(rest).padStart(2, '0')}`
}

/** « 12 mars 2021 » */
export function formatDate(date: string | null | undefined): string {
  if (!date) return '—'
  const parsed = new Date(`${date}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return date
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(parsed)
}

/** 86000 -> « 1 h 26 » (durée d'un épisode TMDB renvoyée en minutes). */
export function formatDuration(minutes: number | null | undefined): string {
  return formatRuntime(minutes)
}

export function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count > 1 ? plural : singular}`
}

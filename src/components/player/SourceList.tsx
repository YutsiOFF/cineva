import { cn } from '../../lib/cn'
import type { StreamSource } from '../../services/streamResolver'
import { PlayIcon } from '../ui/icons'

interface SourceListProps {
  sources: StreamSource[]
  activeId: string | null
  onSelect: (source: StreamSource) => void
}

const protocolLabel: Record<StreamSource['protocol'], string> = {
  hls: 'HLS',
  mp4: 'MP4',
  embed: 'Embed',
}

/** Liste des sources renvoyées par les résolveurs, sélectionnables. */
export function SourceList({ sources, activeId, onSelect }: SourceListProps) {
  if (sources.length === 0) return null

  return (
    <ul className="space-y-2">
      {sources.map((source) => {
        const active = source.id === activeId
        return (
          <li key={source.id}>
            <button
              type="button"
              onClick={() => onSelect(source)}
              aria-pressed={active}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition',
                active
                  ? 'border-accent/60 bg-accent/15'
                  : 'border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.07]',
              )}
            >
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                  active ? 'bg-accent text-white' : 'bg-white/10 text-white/70',
                )}
              >
                <PlayIcon className="h-3 w-3 translate-x-[1px]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-white">{source.provider}</span>
                <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-white/45">
                  {source.quality && <span className="rounded bg-white/10 px-1.5 py-0.5">{source.quality}</span>}
                  {source.language && <span className="rounded bg-white/10 px-1.5 py-0.5">{source.language}</span>}
                  <span className="rounded bg-white/10 px-1.5 py-0.5">{protocolLabel[source.protocol]}</span>
                  {source.subtitles && source.subtitles.length > 0 && (
                    <span className="rounded bg-white/10 px-1.5 py-0.5">{source.subtitles.length} ST</span>
                  )}
                </span>
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

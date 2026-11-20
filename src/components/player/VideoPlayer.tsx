import Hls from 'hls.js'
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { cn } from '../../lib/cn'
import type { StreamSource } from '../../services/streamResolver'
import {
  ForwardIcon,
  FullscreenExitIcon,
  FullscreenIcon,
  PauseIcon,
  PictureInPictureIcon,
  PlayIcon,
  ReplayIcon,
  SubtitlesIcon,
  VolumeIcon,
  VolumeMuteIcon,
} from '../ui/icons'

interface VideoPlayerProps {
  source: StreamSource
  title: string
  poster?: string
  autoPlay?: boolean
  onEnded?: () => void
}

/**
 * Lecteur vidéo.
 *
 * - flux HLS (`m3u8`) : hls.js quand le navigateur ne gère pas nativement,
 *   avec récupération automatique des erreurs réseau/média ;
 * - flux progressif (`mp4`) : balise <video> native ;
 * - `embed` : iframe fournie par le backend (contrôles propres au provider).
 *
 * Les contrôles sont custom (accessibles : aria-label, focus clavier, plage
 * native) et les sous-titres proviennent soit des pistes HLS intégrées, soit des
 * pistes `subtitles` renvoyées par le résolveur.
 */
export function VideoPlayer({ source, title, poster, autoPlay = false, onEnded }: VideoPlayerProps) {
  if (source.protocol === 'embed') {
    return <EmbedPlayer source={source} title={title} />
  }
  return <Html5Player source={source} title={title} poster={poster} autoPlay={autoPlay} onEnded={onEnded} />
}

/* ------------------------------- Embed ---------------------------------- */

function EmbedPlayer({ source, title }: { source: StreamSource; title: string }) {
  return (
    <div className="relative w-full bg-black">
      <div className="aspect-video w-full">
        <iframe
          src={source.url}
          title={`Lecteur — ${title}`}
          allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
          allowFullScreen
          referrerPolicy="origin"
          className="h-full w-full border-0"
        />
      </div>
      <p className="bg-black/80 px-4 py-2 text-[11px] text-white/40">
        Source externe « {source.provider} » affichée en iframe : les contrôles sont ceux du
        fournisseur.
      </p>
    </div>
  )
}

/* ------------------------------- HLS / MP4 ------------------------------- */

interface Html5PlayerProps {
  source: StreamSource
  title: string
  poster?: string
  autoPlay: boolean
  onEnded?: () => void
}

const HIDE_CONTROLS_DELAY = 2800

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const total = Math.floor(seconds)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = total % 60
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  return `${minutes}:${String(secs).padStart(2, '0')}`
}

function Html5Player({ source, title, poster, autoPlay, onEnded }: Html5PlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const hideTimerRef = useRef<number | null>(null)
  const recoveryRef = useRef(0)

  const [playing, setPlaying] = useState(false)
  const [buffering, setBuffering] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [bufferedTo, setBufferedTo] = useState(0)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [levels, setLevels] = useState<Array<{ value: number; label: string }>>([])
  const [quality, setQuality] = useState(-1)
  const [embeddedTracks, setEmbeddedTracks] = useState<Array<{ label: string }>>([])
  const [subtitle, setSubtitle] = useState('off')
  const [error, setError] = useState<string | null>(null)
  const [controlsVisible, setControlsVisible] = useState(true)
  const [fullscreen, setFullscreen] = useState(false)

  const externalTracks = useMemo(() => source.subtitles ?? [], [source.subtitles])

  const revealControls = useCallback(() => {
    setControlsVisible(true)
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current)
    hideTimerRef.current = window.setTimeout(() => {
      const video = videoRef.current
      if (video && !video.paused) setControlsVisible(false)
    }, HIDE_CONTROLS_DELAY)
  }, [])

  /* --- Source : hls.js, HLS natif (Safari/iOS) ou fichier progressif ------- */
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    setError(null)
    setLevels([])
    setQuality(-1)
    setEmbeddedTracks([])
    recoveryRef.current = 0

    const playSafely = () => {
      if (!autoPlay) return
      void video.play().catch(() => {
        /* autoplay bloqué par le navigateur : l'utilisateur clique sur Lecture. */
      })
    }

    if (source.protocol === 'hls' && Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true, backBufferLength: 90 })
      hlsRef.current = hls

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        const qualityLevels = hls.levels.map((level, index) => ({
          value: index,
          label: level.height ? `${level.height}p` : `${Math.round((level.bitrate || 0) / 1000)} kbps`,
        }))
        setLevels(qualityLevels)
        setEmbeddedTracks(hls.subtitleTracks.map((track) => ({ label: track.name || track.lang || 'Piste' })))
        playSafely()
      })

      hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
        setQuality(hls.autoLevelEnabled ? -1 : data.level)
      })

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal) return
        // Deux tentatives de récupération, puis message explicite.
        if (data.type === Hls.ErrorTypes.MEDIA_ERROR && recoveryRef.current < 2) {
          recoveryRef.current += 1
          hls.recoverMediaError()
          return
        }
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR && recoveryRef.current < 2) {
          recoveryRef.current += 1
          hls.startLoad()
          return
        }
        setError('Ce flux HLS ne peut pas être lu (source expirée ou indisponible).')
        hls.destroy()
      })

      hls.loadSource(source.url)
      hls.attachMedia(video)
    } else {
      // HLS natif (Safari) ou MP4/WebM : la balise <video> suffit.
      video.src = source.url
      playSafely()
    }

    return () => {
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current)
      hlsRef.current?.destroy()
      hlsRef.current = null
      video.removeAttribute('src')
      video.load()
    }
  }, [source.url, source.protocol, autoPlay])

  /* --- Événements média --------------------------------------------------- */
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onTimeUpdate = () => setCurrentTime(video.currentTime)
    const onDuration = () => setDuration(Number.isFinite(video.duration) ? video.duration : 0)
    const onProgress = () => {
      const ranges = video.buffered
      setBufferedTo(ranges.length > 0 ? ranges.end(ranges.length - 1) : 0)
    }
    const onVolume = () => {
      setVolume(video.volume)
      setMuted(video.muted)
    }
    const onWaiting = () => setBuffering(true)
    const onPlaying = () => setBuffering(false)
    const onEndedEvent = () => {
      setPlaying(false)
      onEnded?.()
    }
    const onError = () => {
      if (!error) setError("La source vidéo n'a pas pu être chargée.")
    }

    video.addEventListener('play', onPlay)
    video.addEventListener('pause', onPause)
    video.addEventListener('timeupdate', onTimeUpdate)
    video.addEventListener('durationchange', onDuration)
    video.addEventListener('loadedmetadata', onDuration)
    video.addEventListener('progress', onProgress)
    video.addEventListener('volumechange', onVolume)
    video.addEventListener('waiting', onWaiting)
    video.addEventListener('playing', onPlaying)
    video.addEventListener('canplay', onPlaying)
    video.addEventListener('ended', onEndedEvent)
    video.addEventListener('error', onError)

    return () => {
      video.removeEventListener('play', onPlay)
      video.removeEventListener('pause', onPause)
      video.removeEventListener('timeupdate', onTimeUpdate)
      video.removeEventListener('durationchange', onDuration)
      video.removeEventListener('loadedmetadata', onDuration)
      video.removeEventListener('progress', onProgress)
      video.removeEventListener('volumechange', onVolume)
      video.removeEventListener('waiting', onWaiting)
      video.removeEventListener('playing', onPlaying)
      video.removeEventListener('canplay', onPlaying)
      video.removeEventListener('ended', onEndedEvent)
      video.removeEventListener('error', onError)
    }
  }, [onEnded, error])

  /* --- Plein écran -------------------------------------------------------- */
  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  /* --- Application des sous-titres ---------------------------------------- */
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const hls = hlsRef.current

    for (let index = 0; index < video.textTracks.length; index += 1) {
      video.textTracks[index].mode = 'disabled'
    }

    if (hls) {
      hls.subtitleDisplay = false
      hls.subtitleTrack = -1
    }

    if (subtitle.startsWith('embedded:')) {
      const trackIndex = Number(subtitle.split(':')[1])
      if (hls) {
        hls.subtitleTrack = trackIndex
        hls.subtitleDisplay = true
      }
      return
    }

    if (subtitle.startsWith('external:')) {
      const trackIndex = Number(subtitle.split(':')[1])
      const wanted = externalTracks[trackIndex]
      if (!wanted) return
      for (let index = 0; index < video.textTracks.length; index += 1) {
        const track = video.textTracks[index]
        if (track.label === wanted.label || track.language === wanted.lang) track.mode = 'showing'
      }
    }
  }, [subtitle, externalTracks, embeddedTracks])

  /* --- Actions ------------------------------------------------------------ */
  const togglePlay = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      void video.play().catch(() => setError("Lecture bloquée : cliquez à nouveau sur Lecture."))
    } else {
      video.pause()
    }
  }, [])

  const seekBy = useCallback((delta: number) => {
    const video = videoRef.current
    if (!video) return
    const max = Number.isFinite(video.duration) ? video.duration : video.currentTime + delta
    video.currentTime = Math.max(0, Math.min(max, video.currentTime + delta))
    setCurrentTime(video.currentTime)
  }, [])

  const changeVolume = useCallback((next: number) => {
    const video = videoRef.current
    if (!video) return
    const clamped = Math.max(0, Math.min(1, next))
    video.volume = clamped
    video.muted = clamped === 0
  }, [])

  const toggleMute = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    video.muted = !video.muted
  }, [])

  const toggleFullscreen = useCallback(async () => {
    const container = containerRef.current
    const video = videoRef.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null
    if (!document.fullscreenElement) {
      if (container?.requestFullscreen) {
        await container.requestFullscreen().catch(() => undefined)
      } else if (video?.webkitEnterFullscreen) {
        video.webkitEnterFullscreen()
      }
    } else {
      await document.exitFullscreen().catch(() => undefined)
    }
  }, [])

  const togglePictureInPicture = useCallback(async () => {
    const video = videoRef.current
    if (!video || !document.pictureInPictureEnabled) return
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture()
      else await video.requestPictureInPicture()
    } catch {
      /* PiP refusé par le navigateur : on ignore silencieusement. */
    }
  }, [])

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const tag = (event.target as HTMLElement).tagName
    if (tag === 'SELECT' || tag === 'INPUT' || tag === 'TEXTAREA') return

    switch (event.key) {
      case ' ':
      case 'k':
        event.preventDefault()
        togglePlay()
        break
      case 'ArrowLeft':
        event.preventDefault()
        seekBy(-5)
        break
      case 'ArrowRight':
        event.preventDefault()
        seekBy(5)
        break
      case 'ArrowUp':
        event.preventDefault()
        changeVolume(volume + 0.1)
        break
      case 'ArrowDown':
        event.preventDefault()
        changeVolume(volume - 0.1)
        break
      case 'm':
        toggleMute()
        break
      case 'f':
        void toggleFullscreen()
        break
      default:
        return
    }
    revealControls()
  }

  const subtitleOptions = useMemo(() => {
    const options = [{ value: 'off', label: 'Sous-titres : off' }]
    externalTracks.forEach((track, index) => options.push({ value: `external:${index}`, label: track.label }))
    embeddedTracks.forEach((track, index) =>
      options.push({ value: `embedded:${index}`, label: `Piste ${index + 1} · ${track.label}` }),
    )
    return options
  }, [externalTracks, embeddedTracks])

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0
  const bufferedPercent = duration > 0 ? Math.min(100, (bufferedTo / duration) * 100) : 0

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onPointerMove={revealControls}
      onPointerLeave={() => playing && setControlsVisible(false)}
      aria-label={`Lecteur vidéo — ${title}`}
      className={cn(
        'group/player relative w-full overflow-hidden bg-black outline-none',
        fullscreen ? 'h-screen' : 'aspect-video',
      )}
    >
      <video
        ref={videoRef}
        className="h-full w-full bg-black object-contain"
        playsInline
        preload="metadata"
        poster={poster}
        onClick={togglePlay}
        onDoubleClick={() => void toggleFullscreen()}
      >
        {externalTracks.map((track, index) => (
          <track
            key={track.url}
            kind="subtitles"
            src={track.url}
            srcLang={track.lang}
            label={track.label}
            default={subtitle === `external:${index}`}
          />
        ))}
      </video>

      {/* Zone de clic centrale (lecture/pause) */}
      <button
        type="button"
        onClick={togglePlay}
        aria-label={playing ? 'Mettre en pause' : 'Lancer la lecture'}
        className="absolute inset-0 h-full w-full cursor-pointer bg-transparent"
        tabIndex={-1}
      />

      {buffering && !error && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="h-10 w-10 animate-spin rounded-full border-2 border-white/25 border-t-white" />
        </div>
      )}

      {!playing && !buffering && !error && (
        <button
          type="button"
          onClick={togglePlay}
          aria-label="Lancer la lecture"
          className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition hover:scale-105 hover:bg-white/20"
        >
          <PlayIcon className="h-6 w-6 translate-x-[2px]" />
        </button>
      )}

      {error && (
        <div role="alert" className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/85 px-6 text-center">
          <p className="font-display text-base font-semibold text-white">Lecture impossible</p>
          <p className="max-w-sm text-sm text-white/60">{error}</p>
          <button
            type="button"
            onClick={() => {
              setError(null)
              const video = videoRef.current
              if (video) {
                video.load()
                void video.play().catch(() => undefined)
              }
            }}
            className="btn-ghost"
          >
            <ReplayIcon className="h-4 w-4" />
            Réessayer
          </button>
        </div>
      )}

      {/* Barre de contrôles */}
      <div
        className={cn(
          'absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent px-3 pb-3 pt-10 transition duration-300 sm:px-4',
          controlsVisible || !playing ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0',
        )}
      >
        {/* Progression */}
        <div className="relative">
          <div className="pointer-events-none absolute left-0 top-1/2 h-1 w-full -translate-y-1/2 overflow-hidden rounded-full bg-white/20">
            <div className="h-full rounded-full bg-white/30" style={{ width: `${bufferedPercent}%` }} />
            <div className="absolute inset-y-0 left-0 rounded-full bg-accent" style={{ width: `${progressPercent}%` }} />
          </div>
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={Math.min(currentTime, duration || 0)}
            onChange={(event) => {
              const video = videoRef.current
              const next = Number(event.target.value)
              if (video) video.currentTime = next
              setCurrentTime(next)
            }}
            aria-label="Position de lecture"
            aria-valuetext={`${formatTime(currentTime)} sur ${formatTime(duration)}`}
            className="player-range relative z-10"
          />
        </div>

        <div className="mt-1 flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={togglePlay}
            aria-label={playing ? 'Mettre en pause' : 'Lancer la lecture'}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-white transition hover:bg-white/15"
          >
            {playing ? <PauseIcon className="h-5 w-5" /> : <PlayIcon className="h-5 w-5" />}
          </button>

          <button
            type="button"
            onClick={() => seekBy(-10)}
            aria-label="Reculer de 10 secondes"
            className="hidden h-9 w-9 items-center justify-center rounded-lg text-white/85 transition hover:bg-white/15 sm:flex"
          >
            <ReplayIcon className="h-4.5 w-4.5" />
          </button>
          <button
            type="button"
            onClick={() => seekBy(10)}
            aria-label="Avancer de 10 secondes"
            className="hidden h-9 w-9 items-center justify-center rounded-lg text-white/85 transition hover:bg-white/15 sm:flex"
          >
            <ForwardIcon className="h-4.5 w-4.5" />
          </button>

          <div className="group/volume flex items-center gap-2">
            <button
              type="button"
              onClick={toggleMute}
              aria-label={muted ? 'Activer le son' : 'Couper le son'}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-white/85 transition hover:bg-white/15"
            >
              {muted || volume === 0 ? <VolumeMuteIcon className="h-5 w-5" /> : <VolumeIcon className="h-5 w-5" />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={(event) => changeVolume(Number(event.target.value))}
              aria-label="Volume"
              className="player-volume hidden w-20 sm:block"
            />
          </div>

          <p className="ml-1 select-none font-mono text-[11px] tabular-nums text-white/70 sm:text-xs">
            {formatTime(currentTime)} <span className="text-white/35">/ {formatTime(duration)}</span>
          </p>

          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            {levels.length > 0 && (
              <label className="flex items-center gap-1.5 text-white/80">
                <span className="sr-only">Qualité</span>
                <select
                  value={quality}
                  onChange={(event) => {
                    const hls = hlsRef.current
                    const value = Number(event.target.value)
                    if (hls) hls.currentLevel = value
                    setQuality(value)
                  }}
                  className="cursor-pointer rounded-md border border-white/15 bg-black/70 px-2 py-1 text-[11px] font-medium text-white outline-none transition hover:border-white/35"
                >
                  <option value={-1}>Auto</option>
                  {levels.map((level) => (
                    <option key={level.value} value={level.value}>
                      {level.label}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {subtitleOptions.length > 1 && (
              <label className="flex items-center gap-1.5 text-white/80">
                <SubtitlesIcon className="h-4 w-4" />
                <span className="sr-only">Sous-titres</span>
                <select
                  value={subtitle}
                  onChange={(event) => setSubtitle(event.target.value)}
                  className="max-w-[110px] cursor-pointer rounded-md border border-white/15 bg-black/70 px-2 py-1 text-[11px] font-medium text-white outline-none transition hover:border-white/35"
                >
                  {subtitleOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {document.pictureInPictureEnabled && (
              <button
                type="button"
                onClick={() => void togglePictureInPicture()}
                aria-label="Image dans l'image"
                className="hidden h-9 w-9 items-center justify-center rounded-lg text-white/85 transition hover:bg-white/15 sm:flex"
              >
                <PictureInPictureIcon className="h-5 w-5" />
              </button>
            )}

            <button
              type="button"
              onClick={() => void toggleFullscreen()}
              aria-label={fullscreen ? 'Quitter le plein écran' : 'Plein écran'}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-white/85 transition hover:bg-white/15"
            >
              {fullscreen ? <FullscreenExitIcon className="h-5 w-5" /> : <FullscreenIcon className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

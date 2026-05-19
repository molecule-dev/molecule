import type { ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * A track currently loaded in the now-playing bar. Only `id`, `title`, and
 * `artist` are required; `artwork` is an optional image URL displayed on the
 * left edge of the bar.
 */
export interface NowPlayingTrack {
  /** Stable identifier for the track (used as a React key by parent lists). */
  id: string
  /** Track title shown as the primary label in the bar. */
  title: string
  /** Artist / podcast / source label shown below the title. */
  artist: string
  /** Optional artwork image URL (square). */
  artwork?: string
}

/** Now-playing bar component props. */
export interface NowPlayingBarProps {
  /** The currently loaded track. Pass `null` to render the bar in an empty / collapsed state (caller usually hides the bar instead). */
  track: NowPlayingTrack
  /** True when the track is actively playing. Drives the play/pause toggle. */
  isPlaying: boolean
  /** Called when the user presses play. */
  onPlay: () => void
  /** Called when the user presses pause. */
  onPause: () => void
  /** Optional next-track handler. When omitted the next button is hidden. */
  onNext?: () => void
  /** Optional previous-track handler. When omitted the previous button is hidden. */
  onPrev?: () => void
  /** Current playback position in seconds. */
  currentTime: number
  /** Total track duration in seconds. */
  duration: number
  /** Called when the user scrubs to a new position (in seconds). */
  onSeek: (seconds: number) => void
  /** Volume level in `[0, 1]`. Optional — when omitted the volume control is hidden. */
  volume?: number
  /** Called when the volume slider changes (in `[0, 1]`). Required to render the volume control. */
  onVolumeChange?: (volume: number) => void
  /** Optional slot rendered at the right edge (e.g. queue button, share button). */
  trailing?: ReactNode
  /** Extra classes merged onto the root element. */
  className?: string
}

/**
 * Format a number of seconds as `m:ss` (or `0:00` for non-finite input).
 *
 * @param seconds - Seconds to format.
 * @returns The formatted `m:ss` string.
 */
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

/**
 * Persistent now-playing bar: track artwork, title/artist, transport controls
 * (prev/play-pause/next), scrubber, and volume slider. Used by
 * music-streaming, podcast, audiobook, and "what's playing" UIs.
 *
 * Sticky positioning is intentionally NOT enforced inside the component — the
 * caller decides where it lives. Common pattern: wrap the bar in a parent
 * container styled with `cm.position('sticky')` (or `cm.position('fixed')`)
 * plus `bottom: 0` and a `z-index`, so the same bar can serve as a
 * page-level dock or a panel-level chrome without changing this component.
 *
 * All styling routes through `getClassMap()` (no Tailwind / raw class
 * names). All user-visible text routes through `t()` so the bar
 * translates via the companion `@molecule/app-locales-now-playing-bar`
 * locale bond.
 *
 * @param props - Component props.
 * @returns The now-playing bar element.
 */
export function NowPlayingBar(props: NowPlayingBarProps) {
  const {
    track,
    isPlaying,
    onPlay,
    onPause,
    onNext,
    onPrev,
    currentTime,
    duration,
    onSeek,
    volume,
    onVolumeChange,
    trailing,
    className,
  } = props
  const cm = getClassMap()
  const { t } = useTranslation()

  const playLabel = isPlaying
    ? t('nowPlaying.aria.pause', {}, { defaultValue: 'Pause' })
    : t('nowPlaying.aria.play', {}, { defaultValue: 'Play' })
  const prevLabel = t('nowPlaying.aria.prev', {}, { defaultValue: 'Previous track' })
  const nextLabel = t('nowPlaying.aria.next', {}, { defaultValue: 'Next track' })
  const seekLabel = t('nowPlaying.aria.seek', {}, { defaultValue: 'Seek' })
  const volumeLabel = t('nowPlaying.aria.volume', {}, { defaultValue: 'Volume' })
  const artworkAlt = t(
    'nowPlaying.aria.artwork',
    { title: track.title },
    { defaultValue: 'Artwork for {{title}}' },
  )
  const regionLabel = t(
    'nowPlaying.aria.region',
    { title: track.title },
    { defaultValue: 'Now playing: {{title}}' },
  )

  /**
   * Handle the play/pause toggle press.
   */
  function handleToggle() {
    if (isPlaying) onPause()
    else onPlay()
  }

  return (
    <div
      role="region"
      aria-label={regionLabel}
      data-mol-id="now-playing-bar"
      className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), cm.sp('p', 3), className)}
    >
      {/* Left: artwork */}
      <div
        className={cm.cn(cm.shrink0)}
        data-mol-id="now-playing-bar-artwork"
        style={{ width: 56, height: 56 }}
      >
        {track.artwork ? (
          <img
            src={track.artwork}
            alt={artworkAlt}
            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 6 }}
          />
        ) : (
          <div
            aria-hidden="true"
            className={cm.cn(cm.flex({ align: 'center', justify: 'center' }))}
            style={{ width: '100%', height: '100%', borderRadius: 6 }}
          />
        )}
      </div>

      {/* Center-left: title / artist (truncate-overflow) */}
      <div
        className={cm.cn(cm.stack(0))}
        data-mol-id="now-playing-bar-meta"
        style={{ minWidth: 0, flex: '1 1 0%' }}
      >
        <span
          className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}
          data-mol-id="now-playing-bar-title"
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            display: 'block',
          }}
        >
          {track.title}
        </span>
        <span
          className={cm.textSize('xs')}
          data-mol-id="now-playing-bar-artist"
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            display: 'block',
          }}
        >
          {track.artist}
        </span>
      </div>

      {/* Center: transport controls */}
      <div
        className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.shrink0)}
        data-mol-id="now-playing-bar-transport"
      >
        {onPrev && (
          <button
            type="button"
            onClick={onPrev}
            aria-label={prevLabel}
            data-mol-id="now-playing-bar-prev"
            className={cm.cn(cm.cursorPointer)}
          >
            {'⏮'}
          </button>
        )}
        <button
          type="button"
          onClick={handleToggle}
          aria-label={playLabel}
          aria-pressed={isPlaying}
          data-mol-id="now-playing-bar-play"
          className={cm.cn(cm.cursorPointer)}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
        {onNext && (
          <button
            type="button"
            onClick={onNext}
            aria-label={nextLabel}
            data-mol-id="now-playing-bar-next"
            className={cm.cn(cm.cursorPointer)}
          >
            {'⏭'}
          </button>
        )}
      </div>

      {/* Scrubber + time */}
      <div
        className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}
        data-mol-id="now-playing-bar-scrubber"
        style={{ flex: '2 1 0%', minWidth: 0 }}
      >
        <span className={cm.textSize('xs')} data-mol-id="now-playing-bar-current-time">
          {formatTime(currentTime)}
        </span>
        <input
          type="range"
          min={0}
          max={duration > 0 ? duration : 0}
          step={0.1}
          value={Math.min(currentTime, duration > 0 ? duration : 0)}
          onChange={(e) => onSeek(Number(e.target.value))}
          aria-label={seekLabel}
          data-mol-id="now-playing-bar-seek"
          style={{ flex: '1 1 0%', minWidth: 0 }}
        />
        <span className={cm.textSize('xs')} data-mol-id="now-playing-bar-duration">
          {formatTime(duration)}
        </span>
      </div>

      {/* Volume */}
      {onVolumeChange && typeof volume === 'number' && (
        <div
          className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.shrink0)}
          data-mol-id="now-playing-bar-volume"
          style={{ width: 120 }}
        >
          <span aria-hidden="true">{volume === 0 ? '🔇' : '🔊'}</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => onVolumeChange(Number(e.target.value))}
            aria-label={volumeLabel}
            data-mol-id="now-playing-bar-volume-slider"
            style={{ flex: '1 1 0%', minWidth: 0 }}
          />
        </div>
      )}

      {trailing && (
        <div className={cm.cn(cm.shrink0)} data-mol-id="now-playing-bar-trailing">
          {trailing}
        </div>
      )}
    </div>
  )
}

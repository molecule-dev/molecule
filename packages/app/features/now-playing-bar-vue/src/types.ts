/**
 * Vue types for the now-playing bar.
 *
 * @module
 */

import type { VNodeChild } from 'vue'

/**
 * A track currently loaded in the now-playing bar. Only `id`, `title`, and
 * `artist` are required; `artwork` is an optional image URL displayed on the
 * left edge of the bar.
 */
export interface NowPlayingTrack {
  /** Stable identifier for the track (used as a key by parent lists). */
  id: string
  /** Track title shown as the primary label in the bar. */
  title: string
  /** Artist / podcast / source label shown below the title. */
  artist: string
  /** Optional artwork image URL (square). */
  artwork?: string
}

/** Now-playing bar component props (React names). */
export interface NowPlayingBarProps {
  /**
   * The currently loaded track, or `null`/`undefined` when nothing is playing.
   * When absent the bar renders a compact empty state ("Nothing playing")
   * instead of throwing — you can leave it mounted rather than conditionally
   * unmounting it.
   */
  track?: NowPlayingTrack | null
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
  /**
   * Optional slot rendered at the right edge (e.g. queue button, share
   * button). Passed as a prop or as the same-named slot — both work.
   */
  trailing?: VNodeChild
  /** Extra classes merged onto the root element. */
  className?: string
}

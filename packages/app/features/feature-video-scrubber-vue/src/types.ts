/**
 * Types for the Vue frame-accurate video scrubber.
 *
 * @module
 */

/**
 * One pre-computed thumbnail at a given time. The scrubber renders a
 * filmstrip row of thumbnails by picking, for each visible tick, the
 * provided thumbnail whose `time` is closest. Hosts can supply as few
 * or as many thumbnails as they like; gaps are filled by repeating the
 * nearest neighbour.
 */
export interface Thumbnail {
  /** Time of this thumbnail in seconds. */
  time: number
  /** Image source URL (data: URL or fetched blob URL). */
  src: string
}

/**
 * Props for `<VideoScrubber>` (React's prop names). Frame-accurate scrubber
 * widget pairing a thumbnail filmstrip with a click-to-seek playhead,
 * frame-step keyboard controls, and an optional frame-number readout.
 */
export interface VideoScrubberProps {
  /** Total media duration in seconds. */
  duration: number
  /** Current playhead time in seconds. */
  currentTime: number
  /** Frames-per-second used for snapping + frame-step keyboard. Defaults to 24. */
  fps?: number
  /** Pre-computed thumbnails. The scrubber picks the closest one per filmstrip tick. */
  thumbnails?: Thumbnail[]
  /** Called with the seek time (snapped to the nearest frame). */
  onSeek?: (time: number) => void
  /** Whether to show the frame-number readout. Defaults to `true`. */
  showFrameNumber?: boolean
  /** Number of filmstrip cells to render. Defaults to 12. */
  thumbnailCount?: number
  /** Filmstrip cell height in px. Defaults to 48. */
  thumbnailHeight?: number
  /** Optional id for the root element (useful for label associations). */
  id?: string
  /** Extra classes merged onto the root element. */
  className?: string
}

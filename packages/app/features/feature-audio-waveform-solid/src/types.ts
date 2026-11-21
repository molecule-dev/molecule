/**
 * Types for the Solid audio-waveform renderer.
 *
 * @module
 */

/**
 * A timed colored band overlaid on top of the waveform — used to mark
 * loop ranges, comments, edit selections, chapter spans, etc.
 */
export interface WaveformRegion {
  /** Stable identifier for the region (used as a render key). */
  id: string
  /** Start of the region, in seconds. */
  startTime: number
  /** Duration of the region, in seconds. Negative / zero hides the region. */
  duration: number
  /**
   * Optional CSS color applied to the region rectangle. Defaults to a
   * semi-transparent accent ink. Use semi-transparent fills so the
   * underlying waveform stays visible.
   */
  color?: string
}

/** AudioWaveform component props (React's prop names). */
export interface AudioWaveformProps {
  /**
   * Pre-computed peak amplitudes in playback order. Each value should
   * be normalized into the closed interval `[0, 1]` (the renderer clamps
   * out-of-range values). One bar is drawn per peak.
   */
  peaks: number[]
  /**
   * Total duration of the underlying audio in seconds. Used to translate
   * click positions into seek timestamps and to size region overlays.
   * Must be `> 0` for `onSeek` and `regions` to render correctly.
   */
  duration: number
  /**
   * Current playback time in seconds. Drives the progress overlay that
   * fills the waveform from the left up to this point. Defaults to `0`.
   */
  currentTime?: number
  /**
   * Optional click handler called with the seek target time (in
   * seconds) when the user clicks anywhere on the waveform. When
   * omitted, the waveform renders as a non-interactive display.
   */
  onSeek?: (seekTime: number) => void
  /** Optional region markers overlaid on top of the waveform. */
  regions?: WaveformRegion[]
  /** Pixel height of the waveform. Defaults to `64`. */
  height?: number
  /**
   * CSS color used for the progress overlay (the played portion of the
   * waveform). Defaults to `currentColor`.
   */
  progressColor?: string
  /**
   * CSS color used for the unplayed portion of the waveform. Defaults
   * to `currentColor`.
   */
  waveColor?: string
  /** Extra classes merged onto the root element. */
  className?: string
}

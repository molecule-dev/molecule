import type { CSSProperties, MouseEvent } from 'react'
import { useCallback, useId, useRef } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * A timed colored band overlaid on top of the waveform — used to mark
 * loop ranges, comments, edit selections, chapter spans, etc.
 */
export interface WaveformRegion {
  /** Stable identifier for the region (used as a React key). */
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

/** AudioWaveform component props. */
export interface AudioWaveformProps {
  /**
   * Pre-computed peak amplitudes in playback order. Each value should
   * be normalized into the closed interval `[0, 1]` (the renderer clamps
   * out-of-range values). One bar is drawn per peak. Callers typically
   * compute these offline with `wavesurfer.js`, `peaks.js`, or an
   * AudioContext analysis pass — this component is just the renderer.
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
   * waveform). Defaults to a primary accent ink resolved from
   * `currentColor` so callers can theme it via the parent's text color.
   */
  progressColor?: string
  /**
   * CSS color used for the unplayed portion of the waveform. Defaults
   * to a muted ink derived from `currentColor`.
   */
  waveColor?: string
  /** Extra classes merged onto the root element. */
  className?: string
}

/**
 * Clamp a value into the closed interval `[min, max]`. Returns `min`
 * for `NaN` / non-finite inputs.
 *
 * @param value - Value to clamp.
 * @param min - Minimum (inclusive).
 * @param max - Maximum (inclusive).
 * @returns The clamped value.
 */
export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  if (value < min) return min
  if (value > max) return max
  return value
}

/**
 * Compute the seek time (in seconds) for a click at horizontal pixel
 * `x` inside a waveform bounding box of `width` pixels covering an
 * audio of `duration` seconds. Clamps the result into `[0, duration]`.
 *
 * @param x - Horizontal pixel offset of the click inside the bounding box.
 * @param width - Width of the bounding box in pixels.
 * @param duration - Total audio duration in seconds.
 * @returns The seek target time, in seconds.
 */
export function seekTimeFromClick(x: number, width: number, duration: number): number {
  if (!Number.isFinite(width) || width <= 0) return 0
  if (!Number.isFinite(duration) || duration <= 0) return 0
  const ratio = clamp(x / width, 0, 1)
  return ratio * duration
}

/**
 * Stylized SVG audio waveform with click-to-seek + region overlays.
 * Renders pre-computed peak amplitudes as vertical bars centered on a
 * baseline. A progress overlay fills the played portion from the left;
 * region markers render as colored rectangles spanning their time range.
 *
 * All styling routes through `getClassMap()` (no Tailwind / raw class
 * names). All user-visible text routes through `t()` so the waveform
 * translates via the companion
 * `@molecule/app-locales-feature-audio-waveform-react` locale bond.
 *
 * @param props - Component props.
 * @returns The audio-waveform element.
 */
export function AudioWaveform(props: AudioWaveformProps) {
  const {
    peaks,
    duration,
    currentTime = 0,
    onSeek,
    regions,
    height = 64,
    progressColor,
    waveColor,
    className,
  } = props

  const cm = getClassMap()
  const { t } = useTranslation()
  const svgRef = useRef<SVGSVGElement | null>(null)
  const clipId = useId()
  const interactive = typeof onSeek === 'function' && duration > 0

  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0
  const safeCurrent = clamp(currentTime, 0, safeDuration)
  const playedRatio = safeDuration > 0 ? safeCurrent / safeDuration : 0

  // Use a 1000-unit virtual viewBox width so the SVG scales with its
  // CSS width. Heights map directly to pixels (the SVG sets `height`).
  const viewWidth = 1000
  const barCount = peaks.length
  const totalGap = barCount > 1 ? Math.min(barCount - 1, Math.floor(viewWidth / 8)) : 0
  const barWidth = barCount > 0 ? Math.max((viewWidth - totalGap) / barCount, 0.5) : 0
  const stride = barCount > 0 ? viewWidth / barCount : 0
  const centerY = height / 2
  const minBarHeight = 1

  const handleClick = useCallback(
    (event: MouseEvent<SVGSVGElement>) => {
      if (!interactive) return
      const node = svgRef.current
      if (!node) return
      const rect = node.getBoundingClientRect()
      const x = event.clientX - rect.left
      onSeek?.(seekTimeFromClick(x, rect.width, safeDuration))
    },
    [interactive, onSeek, safeDuration],
  )

  const ariaLabel = t('audioWaveform.aria.region', {}, { defaultValue: 'Audio waveform' })
  const seekLabel = t(
    'audioWaveform.aria.seek',
    {},
    { defaultValue: 'Seek the audio by clicking the waveform' },
  )
  const emptyLabel = t('audioWaveform.empty', {}, { defaultValue: 'No waveform data available.' })

  if (barCount === 0) {
    return (
      <div
        role="region"
        aria-label={ariaLabel}
        data-mol-id="audio-waveform"
        data-state="empty"
        className={cm.cn(cm.sp('p', 2), className)}
      >
        <p className={cm.textSize('xs')} data-mol-id="audio-waveform-empty">
          {emptyLabel}
        </p>
      </div>
    )
  }

  // Resolve fill colors. We prefer `currentColor` so consumers can theme
  // via the parent's text color; explicit overrides win.
  const resolvedWaveColor = waveColor ?? 'currentColor'
  const resolvedProgressColor = progressColor ?? 'currentColor'

  const containerStyle: CSSProperties = {
    width: '100%',
    color: 'currentColor',
  }

  const svgStyle: CSSProperties = {
    display: 'block',
    width: '100%',
    height,
    cursor: interactive ? 'pointer' : 'default',
    // The base waveform is dim; the progress overlay restores full opacity.
    opacity: 1,
  }

  // Pre-compute bar geometry once; re-used for both the base wave and
  // the progress-clipped overlay.
  const bars = peaks.map((rawPeak, i) => {
    const peak = clamp(rawPeak, 0, 1)
    const barHeight = Math.max(peak * height, minBarHeight)
    const x = i * stride + (stride - barWidth) / 2
    const y = centerY - barHeight / 2
    return { x, y, w: barWidth, h: barHeight, key: i }
  })

  const progressX = playedRatio * viewWidth

  return (
    <div
      role="region"
      aria-label={ariaLabel}
      data-mol-id="audio-waveform"
      className={cm.cn(className)}
      style={containerStyle}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${viewWidth} ${height}`}
        preserveAspectRatio="none"
        width="100%"
        height={height}
        onClick={interactive ? handleClick : undefined}
        role={interactive ? 'button' : 'img'}
        aria-label={interactive ? seekLabel : ariaLabel}
        data-mol-id="audio-waveform-svg"
        data-interactive={interactive ? 'true' : 'false'}
        style={svgStyle}
      >
        <defs>
          <clipPath id={`${clipId}-progress`}>
            <rect x={0} y={0} width={progressX} height={height} />
          </clipPath>
        </defs>

        {/* Base (unplayed) waveform — dim. */}
        <g data-mol-id="audio-waveform-bars-base" fill={resolvedWaveColor} opacity={0.4}>
          {bars.map((bar) => (
            <rect
              key={bar.key}
              x={bar.x}
              y={bar.y}
              width={bar.w}
              height={bar.h}
              data-mol-id="audio-waveform-bar"
            />
          ))}
        </g>

        {/* Progress (played) waveform — full opacity, clipped to playhead. */}
        <g
          data-mol-id="audio-waveform-bars-progress"
          fill={resolvedProgressColor}
          clipPath={`url(#${clipId}-progress)`}
        >
          {bars.map((bar) => (
            <rect
              key={bar.key}
              x={bar.x}
              y={bar.y}
              width={bar.w}
              height={bar.h}
              data-mol-id="audio-waveform-bar-progress"
            />
          ))}
        </g>

        {/* Region overlays — drawn on top of the waveform. */}
        {regions && safeDuration > 0 ? (
          <g data-mol-id="audio-waveform-regions">
            {regions.map((region) => {
              if (!Number.isFinite(region.duration) || region.duration <= 0) return null
              const startRatio = clamp(region.startTime / safeDuration, 0, 1)
              const endRatio = clamp((region.startTime + region.duration) / safeDuration, 0, 1)
              if (endRatio <= startRatio) return null
              const x = startRatio * viewWidth
              const w = (endRatio - startRatio) * viewWidth
              return (
                <rect
                  key={region.id}
                  x={x}
                  y={0}
                  width={w}
                  height={height}
                  fill={region.color ?? 'currentColor'}
                  fillOpacity={region.color ? 1 : 0.15}
                  data-mol-id="audio-waveform-region"
                  data-region-id={region.id}
                />
              )
            })}
          </g>
        ) : null}
      </svg>
    </div>
  )
}

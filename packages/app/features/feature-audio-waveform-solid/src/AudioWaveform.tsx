/**
 * Solid stylized SVG audio waveform with click-to-seek + region overlays.
 *
 * Solid counterpart of `@molecule/app-feature-audio-waveform-react`'s
 * `AudioWaveform` — the same props (React names), the same ClassMap classes,
 * inline styles, SVG geometry and callbacks, and therefore the same DOM for
 * the same input.
 *
 * @module
 */

import { type Component, For, type JSX } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import type { AudioWaveformProps, WaveformRegion } from './types.js'

/**
 * Next value of the module-wide clip-path id counter.
 *
 * React derives the clipPath id from `useId()`, which numbers ids from one
 * process-wide counter (`_r_<base32>_`). The id appears in the `clip-path`
 * attribute, which the conformance normalizer keeps verbatim, so the port
 * generates ids from the same kind of counter — unique per instance, exactly
 * React's format.
 */
let nextClipId = 0

/**
 * A fresh clip-path id, in React `useId()`'s `_r_<base32>_` shape.
 *
 * @returns The id prefix for this instance's clipPath.
 */
const clipId = (): string => `_r_${(nextClipId++).toString(32)}_`

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

/** One bar's geometry, shared by the base and progress layers. */
interface Bar {
  x: number
  y: number
  w: number
  h: number
  key: number
}

/**
 * Stylized SVG audio waveform with click-to-seek + region overlays.
 * Renders pre-computed peak amplitudes as vertical bars centered on a
 * baseline. A progress overlay fills the played portion from the left;
 * region markers render as colored rectangles spanning their time range.
 *
 * All styling routes through `getClassMap()` and all user-visible text
 * routes through `t()` so the waveform translates via the companion
 * `@molecule/app-locales-feature-audio-waveform` locale bond.
 *
 * @param props - Component props (see {@link AudioWaveformProps}).
 * @returns The audio-waveform element.
 */
export const AudioWaveform: Component<AudioWaveformProps> = (
  props: AudioWaveformProps,
): JSX.Element => {
  const cm = getClassMap()
  const { t } = useTranslation()
  // React calls `useId()` before its empty-state return, so every rendered
  // case consumes one id; take ours unconditionally to stay in step.
  const id = clipId()

  let svgNode: SVGSVGElement | undefined

  // Use a 1000-unit virtual viewBox width so the SVG scales with its CSS width.
  const viewWidth = 1000
  const minBarHeight = 1

  const height = (): number => props.height ?? 64
  const duration = (): number => props.duration
  const safeDuration = (): number =>
    Number.isFinite(duration()) && duration() > 0 ? duration() : 0
  const safeCurrent = (): number => clamp(props.currentTime ?? 0, 0, safeDuration())
  const playedRatio = (): number => (safeDuration() > 0 ? safeCurrent() / safeDuration() : 0)
  const interactive = (): boolean => typeof props.onSeek === 'function' && duration() > 0
  const barCount = (): number => props.peaks.length
  const totalGap = (): number =>
    barCount() > 1 ? Math.min(barCount() - 1, Math.floor(viewWidth / 8)) : 0
  const barWidth = (): number =>
    barCount() > 0 ? Math.max((viewWidth - totalGap()) / barCount(), 0.5) : 0
  const stride = (): number => (barCount() > 0 ? viewWidth / barCount() : 0)
  const centerY = (): number => height() / 2
  const progressX = (): number => playedRatio() * viewWidth

  const bars = (): Bar[] =>
    props.peaks.map((rawPeak, i) => {
      const peak = clamp(rawPeak, 0, 1)
      const barHeight = Math.max(peak * height(), minBarHeight)
      const x = i * stride() + (stride() - barWidth()) / 2
      const y = centerY() - barHeight / 2
      return { x, y, w: barWidth(), h: barHeight, key: i }
    })

  const regions = (): WaveformRegion[] => props.regions ?? []

  /**
   * Maps a click inside the SVG onto a seek time and fires `onSeek`.
   *
   * @param event - The native click event.
   */
  const handleClick = (event: MouseEvent): void => {
    if (!interactive()) return
    const node = svgNode
    if (!node) return
    const rect = node.getBoundingClientRect()
    props.onSeek?.(seekTimeFromClick(event.clientX - rect.left, rect.width, safeDuration()))
  }

  const ariaLabel = (): string =>
    t('audioWaveform.aria.region', {}, { defaultValue: 'Audio waveform' })
  const seekLabel = (): string =>
    t('audioWaveform.aria.seek', {}, { defaultValue: 'Seek the audio by clicking the waveform' })
  const emptyLabel = (): string =>
    t('audioWaveform.empty', {}, { defaultValue: 'No waveform data available.' })

  const empty = (): boolean => barCount() === 0
  const rootClass = (): string =>
    empty() ? cm.cn(cm.sp('p', 2), props.className) : cm.cn(props.className)
  const containerStyle = (): string => 'width: 100%; color: currentColor'
  const svgStyle = (): string =>
    `display: block; width: 100%; height: ${height()}px; cursor: ${
      interactive() ? 'pointer' : 'default'
    }; opacity: 1`
  const resolvedWaveColor = (): string => props.waveColor ?? 'currentColor'
  const resolvedProgressColor = (): string => props.progressColor ?? 'currentColor'

  return (
    <div
      role="region"
      aria-label={ariaLabel()}
      data-mol-id="audio-waveform"
      data-state={empty() ? 'empty' : undefined}
      class={rootClass()}
      style={empty() ? undefined : containerStyle()}
    >
      {empty() ? (
        <p class={cm.textSize('xs')} data-mol-id="audio-waveform-empty">
          {emptyLabel()}
        </p>
      ) : (
        <svg
          ref={(el: SVGSVGElement) => {
            svgNode = el
          }}
          viewBox={`0 0 ${viewWidth} ${height()}`}
          preserveAspectRatio="none"
          width="100%"
          height={height()}
          onClick={handleClick}
          role={interactive() ? 'button' : 'img'}
          aria-label={interactive() ? seekLabel() : ariaLabel()}
          data-mol-id="audio-waveform-svg"
          data-interactive={interactive() ? 'true' : 'false'}
          style={svgStyle()}
        >
          <defs>
            <clipPath id={`${id}-progress`}>
              <rect x={0} y={0} width={progressX()} height={height()} />
            </clipPath>
          </defs>

          <g data-mol-id="audio-waveform-bars-base" fill={resolvedWaveColor()} opacity={0.4}>
            <For each={bars()}>
              {(bar) => (
                <rect
                  x={bar.x}
                  y={bar.y}
                  width={bar.w}
                  height={bar.h}
                  data-mol-id="audio-waveform-bar"
                />
              )}
            </For>
          </g>

          <g
            data-mol-id="audio-waveform-bars-progress"
            fill={resolvedProgressColor()}
            clip-path={`url(#${id}-progress)`}
          >
            <For each={bars()}>
              {(bar) => (
                <rect
                  x={bar.x}
                  y={bar.y}
                  width={bar.w}
                  height={bar.h}
                  data-mol-id="audio-waveform-bar-progress"
                />
              )}
            </For>
          </g>

          {props.regions !== undefined && safeDuration() > 0 ? (
            <g data-mol-id="audio-waveform-regions">
              <For each={regions()}>
                {(region) => {
                  if (!Number.isFinite(region.duration) || region.duration <= 0) return null
                  const startRatio = clamp(region.startTime / safeDuration(), 0, 1)
                  const endRatio = clamp(
                    (region.startTime + region.duration) / safeDuration(),
                    0,
                    1,
                  )
                  if (endRatio <= startRatio) return null
                  const x = startRatio * viewWidth
                  const w = (endRatio - startRatio) * viewWidth
                  return (
                    <rect
                      x={x}
                      y={0}
                      width={w}
                      height={height()}
                      fill={region.color ?? 'currentColor'}
                      fill-opacity={region.color ? 1 : 0.15}
                      data-mol-id="audio-waveform-region"
                      data-region-id={region.id}
                    />
                  )
                }}
              </For>
            </g>
          ) : null}
        </svg>
      )}
    </div>
  )
}

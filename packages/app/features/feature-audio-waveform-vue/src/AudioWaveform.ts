/**
 * Vue stylized SVG audio waveform with click-to-seek + region overlays.
 *
 * Vue counterpart of `@molecule/app-feature-audio-waveform-react`'s
 * `AudioWaveform` — the same props (React names), the same ClassMap classes,
 * inline styles, SVG geometry and callbacks, and therefore the same DOM for
 * the same input.
 *
 * @module
 */

import {
  type ComponentPublicInstance,
  defineComponent,
  h,
  type PropType,
  type VNode,
  type VNodeChild,
} from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

import type { WaveformRegion } from './types.js'

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
export const AudioWaveform = defineComponent({
  name: 'AudioWaveform',
  props: {
    peaks: {
      type: Array as PropType<number[]>,
      required: true,
    },
    duration: {
      type: Number,
      required: true,
    },
    currentTime: {
      type: Number,
      default: 0,
    },
    onSeek: {
      type: Function as PropType<(seekTime: number) => void>,
      default: undefined,
    },
    regions: {
      type: Array as PropType<WaveformRegion[]>,
      default: undefined,
    },
    height: {
      type: Number,
      default: 64,
    },
    progressColor: {
      type: String,
      default: undefined,
    },
    waveColor: {
      type: String,
      default: undefined,
    },
    className: {
      type: String,
      default: undefined,
    },
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()
    // React calls `useId()` before its empty-state return, so every rendered
    // case consumes one id; take ours unconditionally to stay in step.
    const id = clipId()

    /** The mounted `<svg>`, whose bounding box maps a click to a seek time. */
    let svgNode: SVGSVGElement | null = null

    /**
     * Records the mounted `<svg>` element.
     *
     * @param el - The element Vue passes to the ref callback.
     */
    const captureSvg = (el: Element | ComponentPublicInstance | null): void => {
      svgNode = el instanceof SVGSVGElement ? el : null
    }

    /**
     * Whether a click should seek (React's `typeof onSeek === 'function' && duration > 0`).
     *
     * @returns Whether the waveform is interactive.
     */
    const interactive = (): boolean => typeof props.onSeek === 'function' && props.duration > 0

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
      const x = event.clientX - rect.left
      props.onSeek?.(seekTimeFromClick(x, rect.width, props.duration))
    }

    return (): VNode => {
      const duration = props.duration
      const height = props.height
      const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0
      const safeCurrent = clamp(props.currentTime, 0, safeDuration)
      const playedRatio = safeDuration > 0 ? safeCurrent / safeDuration : 0

      // A 1000-unit virtual viewBox width so the SVG scales with its CSS width.
      const viewWidth = 1000
      const barCount = props.peaks.length
      const totalGap = barCount > 1 ? Math.min(barCount - 1, Math.floor(viewWidth / 8)) : 0
      const barWidth = barCount > 0 ? Math.max((viewWidth - totalGap) / barCount, 0.5) : 0
      const stride = barCount > 0 ? viewWidth / barCount : 0
      const centerY = height / 2
      const minBarHeight = 1

      const ariaLabel = t('audioWaveform.aria.region', {}, { defaultValue: 'Audio waveform' })
      const seekLabel = t(
        'audioWaveform.aria.seek',
        {},
        { defaultValue: 'Seek the audio by clicking the waveform' },
      )
      const emptyLabel = t(
        'audioWaveform.empty',
        {},
        { defaultValue: 'No waveform data available.' },
      )

      if (barCount === 0) {
        return h(
          'div',
          {
            role: 'region',
            'aria-label': ariaLabel,
            'data-mol-id': 'audio-waveform',
            'data-state': 'empty',
            class: cm.cn(cm.sp('p', 2), props.className),
          },
          [
            h('p', { class: cm.textSize('xs'), 'data-mol-id': 'audio-waveform-empty' }, [
              emptyLabel,
            ] as VNodeChild[]),
          ],
        )
      }

      const resolvedWaveColor = props.waveColor ?? 'currentColor'
      const resolvedProgressColor = props.progressColor ?? 'currentColor'
      const isInteractive = interactive()

      const containerStyle = 'width: 100%; color: currentColor'
      const svgStyle = `display: block; width: 100%; height: ${height}px; cursor: ${
        isInteractive ? 'pointer' : 'default'
      }; opacity: 1`

      const bars = props.peaks.map((rawPeak, i) => {
        const peak = clamp(rawPeak, 0, 1)
        const barHeight = Math.max(peak * height, minBarHeight)
        const x = i * stride + (stride - barWidth) / 2
        const y = centerY - barHeight / 2
        return { x, y, w: barWidth, h: barHeight, key: i }
      })

      const progressX = playedRatio * viewWidth

      const regionRects = (props.regions ?? []).flatMap((region) => {
        if (!Number.isFinite(region.duration) || region.duration <= 0) return []
        const startRatio = clamp(region.startTime / safeDuration, 0, 1)
        const endRatio = clamp((region.startTime + region.duration) / safeDuration, 0, 1)
        if (endRatio <= startRatio) return []
        const x = startRatio * viewWidth
        const w = (endRatio - startRatio) * viewWidth
        return [
          h('rect', {
            key: region.id,
            x,
            y: 0,
            width: w,
            height,
            fill: region.color ?? 'currentColor',
            'fill-opacity': region.color ? 1 : 0.15,
            'data-mol-id': 'audio-waveform-region',
            'data-region-id': region.id,
          }),
        ]
      })

      return h(
        'div',
        {
          role: 'region',
          'aria-label': ariaLabel,
          'data-mol-id': 'audio-waveform',
          class: cm.cn(props.className),
          style: containerStyle,
        },
        [
          h(
            'svg',
            {
              ref: captureSvg,
              viewBox: `0 0 ${viewWidth} ${height}`,
              preserveAspectRatio: 'none',
              width: '100%',
              height,
              onClick: handleClick,
              role: isInteractive ? 'button' : 'img',
              'aria-label': isInteractive ? seekLabel : ariaLabel,
              'data-mol-id': 'audio-waveform-svg',
              'data-interactive': isInteractive ? 'true' : 'false',
              style: svgStyle,
            },
            [
              h('defs', [
                h('clipPath', { id: `${id}-progress` }, [
                  h('rect', { x: 0, y: 0, width: progressX, height }),
                ]),
              ]),
              h(
                'g',
                {
                  'data-mol-id': 'audio-waveform-bars-base',
                  fill: resolvedWaveColor,
                  opacity: 0.4,
                },
                bars.map((bar) =>
                  h('rect', {
                    key: bar.key,
                    x: bar.x,
                    y: bar.y,
                    width: bar.w,
                    height: bar.h,
                    'data-mol-id': 'audio-waveform-bar',
                  }),
                ),
              ),
              h(
                'g',
                {
                  'data-mol-id': 'audio-waveform-bars-progress',
                  fill: resolvedProgressColor,
                  'clip-path': `url(#${id}-progress)`,
                },
                bars.map((bar) =>
                  h('rect', {
                    key: bar.key,
                    x: bar.x,
                    y: bar.y,
                    width: bar.w,
                    height: bar.h,
                    'data-mol-id': 'audio-waveform-bar-progress',
                  }),
                ),
              ),
              props.regions && safeDuration > 0
                ? h('g', { 'data-mol-id': 'audio-waveform-regions' }, regionRects)
                : null,
            ],
          ),
        ],
      )
    }
  },
})

/**
 * AudioWaveform component (React parity).
 *
 * @module
 */

import { Component, type ElementRef, ViewChild } from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import type { WaveformRegion } from './types.js'
import { clamp, seekTimeFromClick } from './utilities.js'

/** A 1000-unit virtual viewBox width so the SVG scales with its CSS width. */
const VIEW_WIDTH = 1000

/** The thinnest bar drawn for a zero-peak, in pixels. */
const MIN_BAR_HEIGHT = 1

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

/** One bar's geometry, shared by the base and progress layers. */
interface Bar {
  x: number
  y: number
  w: number
  h: number
  key: number
}

/** One region rectangle's geometry. */
interface RegionRect {
  id: string
  x: number
  w: number
  color?: string
}

/**
 * AudioWaveform component.
 *
 * Stylized SVG audio waveform with click-to-seek + region overlays. Renders
 * pre-computed peak amplitudes as vertical bars centered on a baseline; a
 * progress overlay fills the played portion from the left and region markers
 * render as colored rectangles spanning their time range.
 *
 * The host IS the root `<div>` (`div[mol-audio-waveform]`), matching React's
 * root exactly: `role`, `aria-label`, `data-mol-id`, the empty state's
 * `data-state`, the class list and the inline style live on it. All styling
 * routes through `getClassMap()` and all user-visible text through the
 * binding's `useTranslation()`, so a locale switch re-renders it.
 */
@Component({
  selector: 'div[mol-audio-waveform]',
  standalone: true,
  inputs: [
    'peaks',
    'duration',
    'currentTime',
    'onSeek',
    'regions',
    'height',
    'progressColor',
    'waveColor',
    'className',
  ],
  host: {
    role: 'region',
    '[attr.aria-label]': 'ariaLabel()',
    'data-mol-id': 'audio-waveform',
    '[attr.data-state]': "empty() ? 'empty' : null",
    '[class]': 'rootClasses()',
    '[style]': 'hostStyle()',
  },
  template: `@if (empty()) {
      <p [class]="emptyTextClasses()" data-mol-id="audio-waveform-empty">{{ emptyLabel() }}</p>
    } @else {
      <svg
        #svg
        [attr.viewBox]="viewBox()"
        preserveAspectRatio="none"
        width="100%"
        [attr.height]="heightValue()"
        (click)="handleClick($event)"
        [attr.role]="interactive() ? 'button' : 'img'"
        [attr.aria-label]="interactive() ? seekLabel() : ariaLabel()"
        data-mol-id="audio-waveform-svg"
        [attr.data-interactive]="interactive() ? 'true' : 'false'"
        [style]="svgStyle()"
      >
        <defs>
          <clipPath [attr.id]="clipPathId()">
            <rect x="0" y="0" [attr.width]="progressX()" [attr.height]="heightValue()" />
          </clipPath>
        </defs>

        <g data-mol-id="audio-waveform-bars-base" [attr.fill]="resolvedWaveColor()" opacity="0.4">
          @for (bar of bars(); track bar.key) {
            <rect
              [attr.x]="bar.x"
              [attr.y]="bar.y"
              [attr.width]="bar.w"
              [attr.height]="bar.h"
              data-mol-id="audio-waveform-bar"
            />
          }
        </g>

        <g
          data-mol-id="audio-waveform-bars-progress"
          [attr.fill]="resolvedProgressColor()"
          [attr.clip-path]="clipPathRef()"
        >
          @for (bar of bars(); track bar.key) {
            <rect
              [attr.x]="bar.x"
              [attr.y]="bar.y"
              [attr.width]="bar.w"
              [attr.height]="bar.h"
              data-mol-id="audio-waveform-bar-progress"
            />
          }
        </g>

        @if (regions !== undefined && safeDuration() > 0) {
          <g data-mol-id="audio-waveform-regions">
            @for (region of regionRects(); track region.id) {
              <rect
                [attr.x]="region.x"
                y="0"
                [attr.width]="region.w"
                [attr.height]="heightValue()"
                [attr.fill]="region.color ?? 'currentColor'"
                [attr.fill-opacity]="region.color ? 1 : 0.15"
                data-mol-id="audio-waveform-region"
                [attr.data-region-id]="region.id"
              />
            }
          </g>
        }
      </svg>
    }`,
})
export class AudioWaveform {
  /** Pre-computed peak amplitudes in playback order (clamped into `[0, 1]`). */
  peaks: number[] = []
  /** Total duration of the underlying audio, in seconds. */
  duration = 0
  /** Current playback time in seconds (defaults to `0` at read time). */
  currentTime?: number
  /** Click handler called with the seek target time in seconds. */
  onSeek?: (seekTime: number) => void
  /** Region markers overlaid on the waveform. */
  regions?: WaveformRegion[]
  /** Pixel height of the waveform (defaults to `64` at read time). */
  height?: number
  /** CSS color of the played portion (defaults to `currentColor`). */
  progressColor?: string
  /** CSS color of the unplayed portion (defaults to `currentColor`). */
  waveColor?: string
  /** Extra classes merged onto the root element. */
  className?: string

  /** The mounted `<svg>`, whose bounding box maps a click to a seek time. */
  @ViewChild('svg') private svgRef?: ElementRef<SVGSVGElement>

  /** The i18n service, so the labels follow a locale switch. */
  private readonly i18n = useTranslation()

  /** This instance's clip-path id prefix. */
  private readonly id = clipId()

  /**
   * The current class map.
   *
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The waveform's pixel height (React's `height = 64` default).
   *
   * @returns The height in pixels.
   */
  heightValue(): number {
    return this.height ?? 64
  }

  /**
   * The current playback time (React's `currentTime = 0` default).
   *
   * @returns The current time in seconds.
   */
  currentTimeValue(): number {
    return this.currentTime ?? 0
  }

  /**
   * The duration when it is positive and finite, `0` otherwise (React's `safeDuration`).
   *
   * @returns The usable duration in seconds.
   */
  safeDuration(): number {
    return Number.isFinite(this.duration) && this.duration > 0 ? this.duration : 0
  }

  /**
   * The playhead clamped into `[0, safeDuration]`.
   *
   * @returns The clamped current time.
   */
  safeCurrent(): number {
    return clamp(this.currentTimeValue(), 0, this.safeDuration())
  }

  /**
   * The played fraction of the audio, in `[0, 1]`.
   *
   * @returns The played ratio.
   */
  playedRatio(): number {
    return this.safeDuration() > 0 ? this.safeCurrent() / this.safeDuration() : 0
  }

  /**
   * The clip rectangle's width in the 1000-unit viewBox.
   *
   * @returns The progress width.
   */
  progressX(): number {
    return this.playedRatio() * VIEW_WIDTH
  }

  /**
   * Whether a click seeks (React's `typeof onSeek === 'function' && duration > 0`).
   *
   * @returns Whether the waveform is interactive.
   */
  interactive(): boolean {
    return typeof this.onSeek === 'function' && this.duration > 0
  }

  /**
   * The peak bars, shared by the base and progress layers.
   *
   * @returns One geometry entry per peak.
   */
  bars(): Bar[] {
    const count = this.peaks.length
    const height = this.heightValue()
    const totalGap = count > 1 ? Math.min(count - 1, Math.floor(VIEW_WIDTH / 8)) : 0
    const barWidth = count > 0 ? Math.max((VIEW_WIDTH - totalGap) / count, 0.5) : 0
    const stride = count > 0 ? VIEW_WIDTH / count : 0
    const centerY = height / 2
    return this.peaks.map((rawPeak, i) => {
      const peak = clamp(rawPeak, 0, 1)
      const barHeight = Math.max(peak * height, MIN_BAR_HEIGHT)
      const x = i * stride + (stride - barWidth) / 2
      const y = centerY - barHeight / 2
      return { x, y, w: barWidth, h: barHeight, key: i }
    })
  }

  /**
   * The rendered region rectangles (invalid and out-of-range spans dropped).
   *
   * @returns One geometry entry per visible region.
   */
  regionRects(): RegionRect[] {
    const safeDuration = this.safeDuration()
    return (this.regions ?? []).flatMap((region) => {
      if (!Number.isFinite(region.duration) || region.duration <= 0) return []
      const startRatio = clamp(region.startTime / safeDuration, 0, 1)
      const endRatio = clamp((region.startTime + region.duration) / safeDuration, 0, 1)
      if (endRatio <= startRatio) return []
      const x = startRatio * VIEW_WIDTH
      const w = (endRatio - startRatio) * VIEW_WIDTH
      return [{ id: region.id, x, w, color: region.color }]
    })
  }

  /**
   * The root's accessible name (`role="region"`).
   *
   * @returns The translated label.
   */
  ariaLabel(): string {
    return this.i18n.t('audioWaveform.aria.region', {}, { defaultValue: 'Audio waveform' })
  }

  /**
   * The interactive SVG's accessible name.
   *
   * @returns The translated seek label.
   */
  seekLabel(): string {
    return this.i18n.t(
      'audioWaveform.aria.seek',
      {},
      {
        defaultValue: 'Seek the audio by clicking the waveform',
      },
    )
  }

  /**
   * The empty state's message.
   *
   * @returns The translated empty label.
   */
  emptyLabel(): string {
    return this.i18n.t(
      'audioWaveform.empty',
      {},
      {
        defaultValue: 'No waveform data available.',
      },
    )
  }

  /**
   * Whether there are no peaks to draw (React's empty-state branch).
   *
   * @returns Whether the waveform renders its empty state.
   */
  empty(): boolean {
    return this.peaks.length === 0
  }

  /**
   * The root's class list (empty state adds the padding token).
   *
   * @returns The class string.
   */
  rootClasses(): string {
    const cm = this.cm()
    return this.empty() ? cm.cn(cm.sp('p', 2), this.className) : cm.cn(this.className)
  }

  /**
   * The empty state's text class.
   *
   * @returns The class string.
   */
  emptyTextClasses(): string {
    return this.cm().textSize('xs')
  }

  /**
   * The root's inline style (absent in the empty state, as React renders it).
   *
   * @returns The style text, or null.
   */
  hostStyle(): string | null {
    return this.empty() ? null : 'width: 100%; color: currentColor'
  }

  /**
   * The SVG's inline style, including the React-computed pixel height.
   *
   * @returns The style text.
   */
  svgStyle(): string {
    const cursor = this.interactive() ? 'pointer' : 'default'
    return `display: block; width: 100%; height: ${this.heightValue()}px; cursor: ${cursor}; opacity: 1`
  }

  /**
   * The base layer's fill.
   *
   * @returns The wave color.
   */
  resolvedWaveColor(): string {
    return this.waveColor ?? 'currentColor'
  }

  /**
   * The progress layer's fill.
   *
   * @returns The progress color.
   */
  resolvedProgressColor(): string {
    return this.progressColor ?? 'currentColor'
  }

  /**
   * The SVG's viewBox.
   *
   * @returns The viewBox value.
   */
  viewBox(): string {
    return `0 0 ${VIEW_WIDTH} ${this.heightValue()}`
  }

  /**
   * The clipPath element's id.
   *
   * @returns The id.
   */
  clipPathId(): string {
    return `${this.id}-progress`
  }

  /**
   * The progress layer's `clip-path` reference.
   *
   * @returns The `url(#…)` value.
   */
  clipPathRef(): string {
    return `url(#${this.id}-progress)`
  }

  /**
   * Maps a click inside the SVG onto a seek time and fires `onSeek`.
   *
   * @param event - The native click event.
   */
  handleClick(event: MouseEvent): void {
    if (!this.interactive()) return
    const node = this.svgRef?.nativeElement
    if (!node) return
    const rect = node.getBoundingClientRect()
    const x = event.clientX - rect.left
    this.onSeek?.(seekTimeFromClick(x, rect.width, this.safeDuration()))
  }
}

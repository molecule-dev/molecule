/**
 * AnimationCanvas component (React parity).
 *
 * @module
 */

import { Component } from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import { getClassMap, type UIClassMap } from '@molecule/app-ui'

import { interpolateState } from './interpolation.js'
import type { AnimationKeyframe, ShapeState } from './types.js'

/** Side of the fixed square every shape is drawn as, in canvas units. */
const DEFAULT_SHAPE_SIZE = 24

/**
 * SVG animation canvas. Renders the interpolated shape state at
 * `currentTime` between the two bracketing keyframes, applying any
 * per-property bezier easing curves declared on the target keyframe.
 *
 * The host IS the root `<svg>` (`svg[mol-animation-canvas]`), matching React's
 * root exactly: `role`, `aria-label`, `data-mol-id`, `class`, `width`,
 * `height`, `viewBox` and the frame style live on it. The canvas itself is
 * rendering-only — mutations to keyframes are delegated to the consumer via
 * `onChange`. Scrub via `onSeek` (clicking the canvas seeks to the
 * corresponding time linearly mapped across width). Style is driven entirely
 * by `getClassMap()`; inline styles are reserved for SVG attributes that
 * classes can't express.
 *
 * Counterpart of `@molecule/app-feature-animation-canvas-react`'s
 * `AnimationCanvas`: the same props (React names), the same ClassMap tokens,
 * and the same DOM for the same input. Its aria label is translated through
 * `useTranslation()`, read reactively so a locale switch refreshes it.
 */
@Component({
  selector: 'svg[mol-animation-canvas]',
  standalone: true,
  inputs: ['keyframes', 'onChange', 'currentTime', 'onSeek', 'width', 'height', 'className'],
  host: {
    role: 'img',
    '[attr.aria-label]': 'ariaLabel()',
    'data-mol-id': 'animation-canvas',
    '[class]': 'classes()',
    '[attr.width]': 'width',
    '[attr.height]': 'height',
    '[attr.viewBox]': 'viewBox()',
    '(pointerdown)': 'pointerDown($event)',
    '[style.overflow]': '"hidden"',
    '[style.touch-action]': '"none"',
    '[style.width.px]': 'width',
    '[style.height.px]': 'height',
  },
  template: `@for (shape of shapes(); track shape.id) {
    <svg:g
      [attr.data-mol-id]="'animation-canvas-shape-' + shape.id"
      [attr.data-shape-id]="shape.id"
      [attr.transform]="transformFor(shape)"
      [attr.opacity]="shape.opacity"
    >
      <svg:rect
        [attr.x]="shapeOffset"
        [attr.y]="shapeOffset"
        [attr.width]="shapeSize"
        [attr.height]="shapeSize"
        fill="currentColor"
        [attr.data-mol-id]="'animation-canvas-shape-fill-' + shape.id"
      />
    </svg:g>
  }`,
})
export class AnimationCanvas {
  /**
   * Keyframes (sorted ascending by `time`). Each entry is a snapshot of
   * every shape's state at a moment in time.
   */
  keyframes: AnimationKeyframe[] = []
  /**
   * Optional callback fired when the consumer mutates keyframes via a
   * built-in interaction. (Currently the canvas itself never mutates; the
   * prop exists so consumers can adopt the controlled / uncontrolled pattern
   * as the feature grows.)
   */
  onChange?: (next: AnimationKeyframe[]) => void
  /** Current playhead time. Clamped to the keyframe range internally. */
  currentTime = 0
  /** Optional callback fired when the user scrubs the timeline. */
  onSeek?: (next: number) => void
  /** Canvas width in CSS pixels. */
  width?: number
  /** Canvas height in CSS pixels. */
  height?: number
  /** Extra classes merged onto the outer wrapper. */
  className?: string

  /** The half-size offset of every shape square (`-DEFAULT_SHAPE_SIZE / 2`). */
  readonly shapeOffset = -DEFAULT_SHAPE_SIZE / 2
  /** The side of every shape square, in canvas units. */
  readonly shapeSize = DEFAULT_SHAPE_SIZE

  /** Reactive translation, read in the injection context. */
  private readonly i18n = useTranslation()
  /** The bonded ClassMap (styling tokens resolve at render time). */
  private readonly classMap: UIClassMap = getClassMap()

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return this.classMap
  }

  /**
   * Computes the wrapper class list.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().position('relative'), this.cm().surfaceSecondary, this.className)
  }

  /**
   * The SVG `viewBox` for the current size.
   * @returns The viewBox string.
   */
  viewBox(): string {
    return `0 0 ${this.width ?? 0} ${this.height ?? 0}`
  }

  /**
   * The shape states at the current playhead time, ready to render.
   * @returns The interpolated shape states.
   */
  shapes(): ShapeState[] {
    return interpolateState(this.keyframes, this.currentTime)
  }

  /**
   * The `transform` attribute of one shape.
   * @param shape - The shape's interpolated state.
   * @returns The SVG transform string.
   */
  transformFor(shape: ShapeState): string {
    return `translate(${shape.x} ${shape.y}) rotate(${shape.rotation}) scale(${shape.scale})`
  }

  /**
   * The root aria label, translated through the app's i18n provider.
   * @returns The aria label.
   */
  ariaLabel(): string {
    return this.i18n.t('animationCanvas.aria.canvas', {}, { defaultValue: 'Animation canvas' })
  }

  /**
   * Map a click on the canvas surface to a playhead time and surface it via
   * `onSeek`. The mapping is linear across width.
   * @param event - Pointer-down event on the canvas root.
   */
  pointerDown(event: PointerEvent): void {
    if (!this.onSeek) return
    const root = event.currentTarget as SVGSVGElement | null
    const rect = root?.getBoundingClientRect()
    if (!rect || rect.width === 0) return
    const firstTime = this.keyframes[0]?.time ?? 0
    const lastTime = this.keyframes[this.keyframes.length - 1]?.time ?? 0
    const span = lastTime - firstTime
    const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
    this.onSeek(span === 0 ? firstTime : firstTime + ratio * span)
  }
}

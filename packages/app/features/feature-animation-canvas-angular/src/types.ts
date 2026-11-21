/**
 * Animation-canvas types: keyframes, per-shape state, and easing
 * specifications used by `<AnimationCanvas>` and the pure interpolation
 * helpers.
 *
 * @module
 */

/**
 * Named easing presets. Each preset corresponds to a fixed cubic-Bezier
 * control-point quadruple `[c1x, c1y, c2x, c2y]`.
 */
export type EasingPreset = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut'

/**
 * Cubic-Bezier control points `[c1x, c1y, c2x, c2y]` — the same shape
 * the CSS `cubic-bezier()` timing function uses.
 *
 * Endpoints are implicitly `(0,0)` and `(1,1)`. `c1x` and `c2x` are
 * normally clamped to `[0, 1]` so the easing is monotonic in time.
 */
export type CubicBezierPoints = readonly [number, number, number, number]

/**
 * Easing for the segment leading INTO a keyframe. May be a named preset
 * or an explicit Bezier control-point tuple.
 */
export type Easing = EasingPreset | CubicBezierPoints

/**
 * Per-property easing override. Each property animates independently;
 * if a property is omitted the canvas uses linear easing for that
 * property (or `easing` if the whole keyframe sets one — see below).
 */
export interface ShapeEasing {
  /** Easing applied to `x`. */
  x?: Easing
  /** Easing applied to `y`. */
  y?: Easing
  /** Easing applied to `rotation`. */
  rotation?: Easing
  /** Easing applied to `scale`. */
  scale?: Easing
  /** Easing applied to `opacity`. */
  opacity?: Easing
}

/**
 * State of a single shape at a single keyframe.
 *
 * The canvas treats every property as independent — if a shape appears
 * in keyframe A but not B, it is interpreted as "vanishes at B".
 */
export interface ShapeState {
  /** Shape identifier; preserved across keyframes. */
  id: string
  /** World-space x in canvas units. */
  x: number
  /** World-space y in canvas units. */
  y: number
  /** Rotation in degrees. */
  rotation: number
  /** Uniform scale factor (1 = identity). */
  scale: number
  /** Opacity, `0` (transparent) → `1` (opaque). */
  opacity: number
  /**
   * Per-property easing applied to the segment LEADING INTO this
   * keyframe. When a preset / tuple is set on the whole shape via
   * `easing`, individual entries here override per-property.
   */
  easings?: ShapeEasing
  /**
   * Whole-shape easing applied to every property unless a
   * `easings.<prop>` overrides it.
   */
  easing?: Easing
}

/**
 * Single keyframe — a snapshot of every shape's state at a point in
 * time.
 */
export interface AnimationKeyframe {
  /**
   * Keyframe time in seconds (or any consistent unit). Keyframes must
   * be sorted ascending by time before being passed to the canvas.
   */
  time: number
  /** Per-shape state at this keyframe. */
  state: ShapeState[]
}

/**
 * Props accepted by {@link AnimationCanvas} — the same props
 * `@molecule/app-feature-animation-canvas-react` takes (React names), so an
 * app switches framework by changing only the package name in its imports.
 */
export interface AnimationCanvasProps {
  /**
   * Keyframes (sorted ascending by `time`). Each entry is a snapshot of
   * every shape's state at a moment in time.
   */
  keyframes: AnimationKeyframe[]
  /**
   * Optional callback fired when the consumer mutates keyframes via a
   * built-in interaction. (Currently the canvas itself never mutates;
   * the prop exists so consumers can adopt the controlled / uncontrolled
   * pattern as the feature grows.)
   */
  onChange?: (next: AnimationKeyframe[]) => void
  /** Current playhead time. Clamped to the keyframe range internally. */
  currentTime: number
  /** Optional callback fired when the user scrubs the timeline. */
  onSeek?: (next: number) => void
  /** Canvas width in CSS pixels. */
  width: number
  /** Canvas height in CSS pixels. */
  height: number
  /** Extra classes merged onto the outer wrapper. */
  className?: string
}

import { sampleEasing } from './easing.js'
import type { AnimationKeyframe, Easing, ShapeState } from './types.js'

/**
 * Pure interpolation helpers. No React / no DOM — these are the
 * "math core" of the animation canvas, fully unit-testable.
 *
 * @module
 */

const ANIMATABLE_PROPS = ['x', 'y', 'rotation', 'scale', 'opacity'] as const

type AnimatableProp = (typeof ANIMATABLE_PROPS)[number]

/**
 * Linear interpolation between two scalars.
 *
 * @param a - Value at `t = 0`.
 * @param b - Value at `t = 1`.
 * @param t - Normalized time in `[0, 1]`.
 * @returns Interpolated value.
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/**
 * Pick the per-property easing for a given prop on a target keyframe.
 *
 * Resolution order (first match wins):
 *
 * 1. `state.easings[prop]` on the TARGET shape (the shape we're
 *    animating INTO).
 * 2. `state.easing` on the TARGET shape (whole-shape default).
 * 3. Linear (returned as `undefined`).
 *
 * @param target - The target shape state (the keyframe being eased
 *   INTO).
 * @param prop - The animatable property name.
 * @returns The easing to apply to that property's segment, or
 *   `undefined` for linear.
 */
export function pickEasing(target: ShapeState, prop: AnimatableProp): Easing | undefined {
  const perProp = target.easings?.[prop]
  if (perProp) return perProp
  return target.easing
}

/**
 * Find the bracketing keyframe pair `[a, b]` for a given time.
 *
 * - If `time <= keyframes[0].time`, returns `[keyframes[0], keyframes[0], 0]`.
 * - If `time >= last.time`, returns `[last, last, 1]`.
 * - Otherwise returns `[a, b, alpha]` where `alpha = (time - a.time) /
 *   (b.time - a.time)` so the caller can apply easing to `alpha` itself.
 *
 * @param keyframes - Keyframes sorted ascending by `time`.
 * @param time - Current playhead time.
 * @returns Bracketing keyframe pair and the linear blend ratio `alpha`.
 */
export function bracketKeyframes(
  keyframes: AnimationKeyframe[],
  time: number,
): { a: AnimationKeyframe; b: AnimationKeyframe; alpha: number } {
  if (keyframes.length === 0) {
    throw new Error('bracketKeyframes: keyframes must not be empty')
  }
  const first = keyframes[0]!
  const last = keyframes[keyframes.length - 1]!
  if (time <= first.time) return { a: first, b: first, alpha: 0 }
  if (time >= last.time) return { a: last, b: last, alpha: 1 }
  for (let i = 0; i < keyframes.length - 1; i++) {
    const a = keyframes[i]!
    const b = keyframes[i + 1]!
    if (time >= a.time && time <= b.time) {
      const span = b.time - a.time
      const alpha = span === 0 ? 0 : (time - a.time) / span
      return { a, b, alpha }
    }
  }
  // Unreachable — clamping above covers it. Keep TS happy.
  return { a: last, b: last, alpha: 1 }
}

/**
 * Interpolate the full shape-state set at the given time.
 *
 * - Shapes present in BOTH bracketing keyframes are eased per-property.
 * - Shapes present in only ONE side are returned verbatim from the side
 *   they're present on, with `opacity` faded toward 0 if they vanish.
 *
 * @param keyframes - Keyframes sorted ascending by `time`.
 * @param time - Playhead time. Clamped to `[firstKeyframe.time,
 *   lastKeyframe.time]` so callers can pass any value safely.
 * @returns Interpolated shape states ready to be rendered.
 */
export function interpolateState(keyframes: AnimationKeyframe[], time: number): ShapeState[] {
  if (keyframes.length === 0) return []
  const { a, b, alpha } = bracketKeyframes(keyframes, time)

  // Index target shapes for O(1) lookup.
  const bById = new Map<string, ShapeState>()
  for (const s of b.state) bById.set(s.id, s)

  const aIds = new Set<string>()

  const result: ShapeState[] = []
  for (const aShape of a.state) {
    aIds.add(aShape.id)
    const bShape = bById.get(aShape.id)
    if (!bShape) {
      // Shape vanishes between A and B → fade out.
      const t = alpha
      result.push({
        ...aShape,
        opacity: lerp(aShape.opacity, 0, t),
      })
      continue
    }
    if (a === b) {
      // No span — return target verbatim.
      result.push({ ...bShape })
      continue
    }
    result.push({
      id: aShape.id,
      x: lerp(aShape.x, bShape.x, sampleEasing(pickEasing(bShape, 'x'), alpha)),
      y: lerp(aShape.y, bShape.y, sampleEasing(pickEasing(bShape, 'y'), alpha)),
      rotation: lerp(
        aShape.rotation,
        bShape.rotation,
        sampleEasing(pickEasing(bShape, 'rotation'), alpha),
      ),
      scale: lerp(aShape.scale, bShape.scale, sampleEasing(pickEasing(bShape, 'scale'), alpha)),
      opacity: lerp(
        aShape.opacity,
        bShape.opacity,
        sampleEasing(pickEasing(bShape, 'opacity'), alpha),
      ),
    })
  }

  // Shapes present only at B → fade in.
  for (const bShape of b.state) {
    if (aIds.has(bShape.id)) continue
    if (a === b) {
      result.push({ ...bShape })
      continue
    }
    result.push({
      ...bShape,
      opacity: lerp(0, bShape.opacity, alpha),
    })
  }

  return result
}

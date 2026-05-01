import type { CubicBezierPoints, Easing, EasingPreset } from './types.js'

/**
 * Pure easing helpers. No React, no DOM — fully unit-testable.
 *
 * The cubic-Bezier convention matches CSS: endpoints are `(0,0)` and
 * `(1,1)` and only the two intermediate control points are supplied.
 *
 * @module
 */

/**
 * Built-in named easing presets. Tuples are interpreted as
 * `[c1x, c1y, c2x, c2y]`. Values match the CSS spec:
 * `ease-in`, `ease-out`, and `ease-in-out`.
 */
export const easingFunctions: Readonly<Record<EasingPreset, CubicBezierPoints>> = Object.freeze({
  linear: [0, 0, 1, 1] as const,
  easeIn: [0.42, 0, 1, 1] as const,
  easeOut: [0, 0, 0.58, 1] as const,
  easeInOut: [0.42, 0, 0.58, 1] as const,
})

/**
 * Resolve a named preset or explicit tuple into a `CubicBezierPoints`
 * tuple. Defaults to linear when `easing` is undefined.
 *
 * @param easing - Easing preset name or explicit Bezier tuple.
 * @returns Resolved control-point tuple.
 */
export function resolveEasing(easing: Easing | undefined): CubicBezierPoints {
  if (!easing) return easingFunctions.linear
  if (typeof easing === 'string') return easingFunctions[easing]
  return easing
}

/**
 * Sample a cubic Bezier at time `t`. Endpoints are fixed at `(0,0)` and
 * `(1,1)`; only the two intermediate control points are supplied.
 *
 * Returned value is the y-coordinate of the curve at the moment its
 * x-coordinate equals `t` — i.e. the timing-function output, NOT the y
 * of the curve at parameter `t`. The x-by-time inversion is performed
 * via Newton-Raphson with a bisection fallback (the same algorithm
 * Chrome / Firefox use for `cubic-bezier()`).
 *
 * @param t - Normalized time, `0` → `1`.
 * @param p1x - First control-point x.
 * @param p1y - First control-point y.
 * @param p2x - Second control-point x.
 * @param p2y - Second control-point y.
 * @returns Eased y in `[0, 1]` (or slightly outside for over-shoot
 *   curves whose control points exceed the unit square).
 */
export function cubicBezier(t: number, p1x: number, p1y: number, p2x: number, p2y: number): number {
  if (t <= 0) return 0
  if (t >= 1) return 1

  // Polynomial coefficients for the parametric Bezier.
  const cx = 3 * p1x
  const bx = 3 * (p2x - p1x) - cx
  const ax = 1 - cx - bx

  const cy = 3 * p1y
  const by = 3 * (p2y - p1y) - cy
  const ay = 1 - cy - by

  /**
   * Evaluate `x(s)` at parameter `s`.
   *
   * @param s - Bezier parameter in `[0, 1]`.
   * @returns x-coordinate of the curve at `s`.
   */
  function bezierX(s: number): number {
    return ((ax * s + bx) * s + cx) * s
  }

  /**
   * Evaluate `dx/ds` at parameter `s`. Used by Newton-Raphson.
   *
   * @param s - Bezier parameter in `[0, 1]`.
   * @returns Slope of x with respect to s.
   */
  function bezierDx(s: number): number {
    return (3 * ax * s + 2 * bx) * s + cx
  }

  /**
   * Evaluate `y(s)` at parameter `s`.
   *
   * @param s - Bezier parameter in `[0, 1]`.
   * @returns y-coordinate of the curve at `s`.
   */
  function bezierY(s: number): number {
    return ((ay * s + by) * s + cy) * s
  }

  // Newton-Raphson — converges in a few iterations for well-formed
  // curves whose x-coordinate is monotonic in s.
  let s = t
  for (let i = 0; i < 8; i++) {
    const xs = bezierX(s) - t
    if (Math.abs(xs) < 1e-6) return bezierY(s)
    const dx = bezierDx(s)
    if (Math.abs(dx) < 1e-6) break
    s = s - xs / dx
  }

  // Bisection fallback for pathological curves.
  let lo = 0
  let hi = 1
  s = t
  while (lo < hi) {
    const xs = bezierX(s)
    if (Math.abs(xs - t) < 1e-6) return bezierY(s)
    if (t > xs) lo = s
    else hi = s
    s = (lo + hi) / 2
    if (hi - lo < 1e-6) break
  }
  return bezierY(s)
}

/**
 * Sample an easing (preset or tuple) at normalized time `t`.
 *
 * @param easing - Easing preset name or explicit Bezier tuple.
 * @param t - Normalized time, `0` → `1`.
 * @returns Eased value in `[0, 1]`.
 */
export function sampleEasing(easing: Easing | undefined, t: number): number {
  const [p1x, p1y, p2x, p2y] = resolveEasing(easing)
  return cubicBezier(t, p1x, p1y, p2x, p2y)
}

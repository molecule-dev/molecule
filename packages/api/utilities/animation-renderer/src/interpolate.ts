/**
 * Pure interpolation helpers — given an ordered keyframe track and a time,
 * return the interpolated value at that time. Both the lottie and the
 * frame-rasterization paths consume these so behaviour stays consistent.
 *
 * @module
 */

import type { Easing, Keyframe } from './types.js'

/**
 * Apply an {@link Easing} curve to a normalized parameter `u ∈ [0, 1]`.
 *
 * @param u - Normalized progress along the keyframe segment.
 * @param easing - Easing function name. Defaults to `linear`.
 * @returns Eased progress in `[0, 1]`.
 */
export function applyEasing(u: number, easing: Easing | undefined): number {
  if (u <= 0) return 0
  if (u >= 1) return 1
  switch (easing) {
    case undefined:
    case 'linear':
      return u
    case 'step':
      // Hold start value; jump to end exactly when we leave the segment.
      return 0
    case 'ease-in':
      // Cubic-bezier(0.42, 0, 1, 1) — compatible approximation `u^2`.
      return u * u
    case 'ease-out':
      // Cubic-bezier(0, 0, 0.58, 1) — `1 - (1-u)^2`.
      return 1 - (1 - u) * (1 - u)
    case 'ease-in-out':
      // Cubic-bezier(0.42, 0, 0.58, 1) — symmetric S curve.
      return u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2
    default: {
      const _exhaustive: never = easing
      throw new Error(`Unknown easing: ${String(_exhaustive)}`)
    }
  }
}

/**
 * Linear interpolate between two numbers.
 *
 * @param a - Start value.
 * @param b - End value.
 * @param u - Eased progress in `[0, 1]`.
 * @returns Interpolated value.
 */
export function lerp(a: number, b: number, u: number): number {
  return a + (b - a) * u
}

/**
 * Interpolate a CSS-style hex color string between two endpoints. Both
 * inputs must be `#rgb`, `#rrggbb`, or `#rrggbbaa`. Non-hex strings (CSS
 * names, `rgb()`, etc.) snap on segment boundaries — the renderer is
 * expected to feed the keyframe machinery normalized hex values.
 *
 * @param a - Start color (hex string).
 * @param b - End color (hex string).
 * @param u - Eased progress in `[0, 1]`.
 * @returns Interpolated `#rrggbb` (or `#rrggbbaa` if either input had alpha).
 */
export function lerpColor(a: string, b: string, u: number): string {
  const ca = parseHex(a)
  const cb = parseHex(b)
  if (!ca || !cb) {
    return u < 0.5 ? a : b
  }
  const r = Math.round(lerp(ca.r, cb.r, u))
  const g = Math.round(lerp(ca.g, cb.g, u))
  const bl = Math.round(lerp(ca.b, cb.b, u))
  const aa = Math.round(lerp(ca.a, cb.a, u))
  const withAlpha = ca.hasAlpha || cb.hasAlpha
  if (withAlpha) {
    return `#${hex(r)}${hex(g)}${hex(bl)}${hex(aa)}`
  }
  return `#${hex(r)}${hex(g)}${hex(bl)}`
}

/**
 * Compute the value of a keyframe track at time `t` (seconds).
 *
 * Implements the rules described in {@link Keyframe}: hold-before-first,
 * hold-after-last, segment-wise easing + linear interpolation.
 *
 * @param track - Ordered keyframes (must be sorted ascending by `time`).
 * @param t - Time in seconds.
 * @returns Interpolated value or `undefined` if the track is empty.
 */
export function valueAtTime<T extends number | string>(
  track: Keyframe<T>[],
  t: number,
): T | undefined {
  if (track.length === 0) return undefined
  if (track.length === 1) return track[0]!.value
  if (t <= track[0]!.time) return track[0]!.value
  const last = track[track.length - 1]!
  if (t >= last.time) return last.value
  for (let i = 0; i < track.length - 1; i++) {
    const a = track[i]!
    const b = track[i + 1]!
    if (t >= a.time && t <= b.time) {
      const span = b.time - a.time
      const u = span <= 0 ? 1 : applyEasing((t - a.time) / span, a.easing)
      if (typeof a.value === 'number' && typeof b.value === 'number') {
        return lerp(a.value, b.value, u) as T
      }
      if (typeof a.value === 'string' && typeof b.value === 'string') {
        return lerpColor(a.value, b.value, u) as T
      }
      return (u < 1 ? a.value : b.value) as T
    }
  }
  return last.value
}

interface ParsedColor {
  r: number
  g: number
  b: number
  a: number
  hasAlpha: boolean
}

/**
 * Parse a `#rgb`, `#rrggbb`, or `#rrggbbaa` hex color string.
 *
 * @param s - Color string.
 * @returns Parsed channels (0..255) plus an `hasAlpha` flag, or `undefined` on parse failure.
 */
function parseHex(s: string): ParsedColor | undefined {
  if (typeof s !== 'string' || s[0] !== '#') return undefined
  const body = s.slice(1)
  if (body.length === 3) {
    const r = parseInt(body[0]! + body[0]!, 16)
    const g = parseInt(body[1]! + body[1]!, 16)
    const b = parseInt(body[2]! + body[2]!, 16)
    return Number.isNaN(r) ? undefined : { r, g, b, a: 255, hasAlpha: false }
  }
  if (body.length === 6) {
    const r = parseInt(body.slice(0, 2), 16)
    const g = parseInt(body.slice(2, 4), 16)
    const b = parseInt(body.slice(4, 6), 16)
    return Number.isNaN(r) ? undefined : { r, g, b, a: 255, hasAlpha: false }
  }
  if (body.length === 8) {
    const r = parseInt(body.slice(0, 2), 16)
    const g = parseInt(body.slice(2, 4), 16)
    const b = parseInt(body.slice(4, 6), 16)
    const a = parseInt(body.slice(6, 8), 16)
    return Number.isNaN(r) ? undefined : { r, g, b, a, hasAlpha: true }
  }
  return undefined
}

/**
 * Format a number 0..255 as a 2-digit lowercase hex string.
 *
 * @param n - Channel value.
 * @returns Two-character hex string.
 */
function hex(n: number): string {
  const clamped = Math.max(0, Math.min(255, n))
  return clamped.toString(16).padStart(2, '0')
}

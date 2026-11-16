/**
 * Pure color-space conversion helpers — HEX ⇄ RGB ⇄ HSV. Exported so
 * downstream code can drive the picker programmatically.
 *
 * @module
 */

import type { HsvColor, RgbColor } from './types.js'

/**
 * Clamp a number to the inclusive range `[lo, hi]`.
 *
 * @param n - Input value.
 * @param lo - Lower bound.
 * @param hi - Upper bound.
 * @returns The clamped value.
 */
export function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

/**
 * Parse a `#rgb`/`#rrggbb` hex string into an RGB color. Falls back to black
 * for unparseable input rather than throwing — pickers shouldn't crash on
 * a stray empty string.
 *
 * @param hex - Color string (with or without the leading `#`).
 * @returns The parsed RGB color.
 */
export function hexToRgb(hex: string): RgbColor {
  const m = String(hex).trim().replace(/^#/, '')
  if (m.length === 3) {
    const r = parseInt(m[0]! + m[0]!, 16)
    const g = parseInt(m[1]! + m[1]!, 16)
    const b = parseInt(m[2]! + m[2]!, 16)
    if ([r, g, b].every((v) => Number.isFinite(v))) return { r, g, b }
  }
  if (m.length === 6) {
    const r = parseInt(m.slice(0, 2), 16)
    const g = parseInt(m.slice(2, 4), 16)
    const b = parseInt(m.slice(4, 6), 16)
    if ([r, g, b].every((v) => Number.isFinite(v))) return { r, g, b }
  }
  return { r: 0, g: 0, b: 0 }
}

/**
 * Format an RGB color as a `#rrggbb` hex string (lowercase).
 *
 * @param rgb - Color to format.
 * @returns The hex string.
 */
export function rgbToHex({ r, g, b }: RgbColor): string {
  const to = (n: number): string => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0')
  return `#${to(r)}${to(g)}${to(b)}`
}

/**
 * Convert RGB (0–255) to HSV (h: 0–360, s/v: 0–1).
 *
 * @param rgb - Color to convert.
 * @returns The equivalent HSV color.
 */
export function rgbToHsv({ r, g, b }: RgbColor): HsvColor {
  const rn = clamp(r, 0, 255) / 255
  const gn = clamp(g, 0, 255) / 255
  const bn = clamp(b, 0, 255) / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const d = max - min
  let h = 0
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6
    else if (max === gn) h = (bn - rn) / d + 2
    else h = (rn - gn) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  const s = max === 0 ? 0 : d / max
  return { h, s, v: max }
}

/**
 * Convert HSV (h: 0–360, s/v: 0–1) to RGB (0–255).
 *
 * @param hsv - Color to convert.
 * @returns The equivalent RGB color.
 */
export function hsvToRgb({ h, s, v }: HsvColor): RgbColor {
  const hh = ((h % 360) + 360) % 360
  const ss = clamp(s, 0, 1)
  const vv = clamp(v, 0, 1)
  const c = vv * ss
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1))
  const m = vv - c
  let r1: number
  let g1: number
  let b1: number
  if (hh < 60) [r1, g1, b1] = [c, x, 0]
  else if (hh < 120) [r1, g1, b1] = [x, c, 0]
  else if (hh < 180) [r1, g1, b1] = [0, c, x]
  else if (hh < 240) [r1, g1, b1] = [0, x, c]
  else if (hh < 300) [r1, g1, b1] = [x, 0, c]
  else [r1, g1, b1] = [c, 0, x]
  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
  }
}

/**
 * Whether `hex` parses to a 6-character hex color.
 *
 * @param hex - Candidate hex string (with or without `#`).
 * @returns `true` when the string parses cleanly.
 */
export function isValidHex(hex: string): boolean {
  return /^#?[0-9a-fA-F]{6}$|^#?[0-9a-fA-F]{3}$/.test(String(hex).trim())
}

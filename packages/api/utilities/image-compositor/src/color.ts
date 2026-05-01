/**
 * CSS color parsing utilities for the compositor.
 *
 * Supports the subset needed for layered-image rendering:
 * `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`, `rgb()`, `rgba()`, and the
 * keywords `transparent`, `black`, `white`.
 *
 * @module
 */

/**
 * RGBA color, each channel in `[0, 255]`.
 */
export interface Rgba {
  r: number
  g: number
  b: number
  a: number
}

const HEX_PATTERN = /^#([0-9a-f]{3,8})$/i
const RGB_PATTERN = /^rgba?\(\s*([^)]+)\)$/i

/**
 * Parse a CSS color string into RGBA bytes.
 *
 * @param input - CSS color string.
 * @returns Parsed RGBA, or `null` if the string is unrecognized.
 */
export function parseCssColor(input: string): Rgba | null {
  if (!input) return null
  const value = input.trim().toLowerCase()
  if (value === 'transparent') return { r: 0, g: 0, b: 0, a: 0 }
  if (value === 'black') return { r: 0, g: 0, b: 0, a: 255 }
  if (value === 'white') return { r: 255, g: 255, b: 255, a: 255 }

  const hex = value.match(HEX_PATTERN)
  if (hex) return parseHex(hex[1] as string)

  const rgb = value.match(RGB_PATTERN)
  if (rgb) return parseRgbFunc(rgb[1] as string)

  return null
}

/**
 * Parse the body of a hex color (without the leading `#`).
 *
 * @param body - Hex digits — 3, 4, 6, or 8 characters.
 * @returns Parsed RGBA, or `null` if invalid.
 */
function parseHex(body: string): Rgba | null {
  if (body.length === 3 || body.length === 4) {
    const r = parseInt(body[0]! + body[0]!, 16)
    const g = parseInt(body[1]! + body[1]!, 16)
    const b = parseInt(body[2]! + body[2]!, 16)
    const a = body.length === 4 ? parseInt(body[3]! + body[3]!, 16) : 255
    return { r, g, b, a }
  }
  if (body.length === 6 || body.length === 8) {
    const r = parseInt(body.slice(0, 2), 16)
    const g = parseInt(body.slice(2, 4), 16)
    const b = parseInt(body.slice(4, 6), 16)
    const a = body.length === 8 ? parseInt(body.slice(6, 8), 16) : 255
    return { r, g, b, a }
  }
  return null
}

/**
 * Parse the comma/space-separated body of `rgb()` or `rgba()`.
 *
 * Accepts integer or percentage channels and an optional alpha (0–1).
 *
 * @param body - The text between the parentheses.
 * @returns Parsed RGBA, or `null` if invalid.
 */
function parseRgbFunc(body: string): Rgba | null {
  const parts = body.split(/[\s,/]+/).filter(Boolean)
  if (parts.length < 3 || parts.length > 4) return null
  const r = parseChannel(parts[0]!)
  const g = parseChannel(parts[1]!)
  const b = parseChannel(parts[2]!)
  const a = parts.length === 4 ? parseAlpha(parts[3]!) : 255
  if (r === null || g === null || b === null || a === null) return null
  return { r, g, b, a }
}

/**
 * Parse a single 0–255 channel value, accepting either an integer or a
 * percentage suffix.
 *
 * @param token - Channel token (e.g. `'128'`, `'50%'`).
 */
function parseChannel(token: string): number | null {
  if (token.endsWith('%')) {
    const pct = parseFloat(token.slice(0, -1))
    if (!Number.isFinite(pct)) return null
    return Math.round((pct / 100) * 255)
  }
  const n = parseFloat(token)
  if (!Number.isFinite(n)) return null
  return clamp(Math.round(n), 0, 255)
}

/**
 * Parse an alpha value in `[0, 1]` (or `[0, 100]%`) into a 0–255 byte.
 *
 * @param token - Alpha token.
 */
function parseAlpha(token: string): number | null {
  if (token.endsWith('%')) {
    const pct = parseFloat(token.slice(0, -1))
    if (!Number.isFinite(pct)) return null
    return Math.round((pct / 100) * 255)
  }
  const n = parseFloat(token)
  if (!Number.isFinite(n)) return null
  return clamp(Math.round(n * 255), 0, 255)
}

/**
 * Clamp a number into `[lo, hi]`.
 *
 * @param value - Input value.
 * @param lo - Lower bound (inclusive).
 * @param hi - Upper bound (inclusive).
 */
export function clamp(value: number, lo: number, hi: number): number {
  return value < lo ? lo : value > hi ? hi : value
}

/**
 * Linearly interpolate two RGBA colors at fraction `t` in `[0, 1]`.
 *
 * @param a - Start color.
 * @param b - End color.
 * @param t - Interpolation fraction.
 */
export function lerpRgba(a: Rgba, b: Rgba, t: number): Rgba {
  const k = clamp(t, 0, 1)
  return {
    r: Math.round(a.r + (b.r - a.r) * k),
    g: Math.round(a.g + (b.g - a.g) * k),
    b: Math.round(a.b + (b.b - a.b) * k),
    a: Math.round(a.a + (b.a - a.a) * k),
  }
}

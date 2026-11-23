/**
 * The colour tokens of `base.css`, resolved in plain JavaScript.
 *
 * On the web the browser evaluates `base.css`'s `@theme`: a core token reads the
 * theme bond's `--mol-color-*`, and every derived token is a `color-mix()`. React
 * Native has no CSS engine and no `color-mix()`, so a native theme bond resolves
 * the same table here and hands the values to its styling runtime. The results
 * match Chromium's `color-mix(in srgb, …)` (a test compares all of them).
 *
 * @module
 */

import { colorTokens, type ThemeColorTokenKey } from './tokens.generated.js'
import type { ColorOperand, ColorToken, RGBA } from './types.js'

/**
 * Converts HSL (hue in degrees, saturation and lightness 0–1) to RGB (0–255).
 *
 * @param h - Hue.
 * @param s - Saturation.
 * @param l - Lightness.
 * @returns Red, green and blue.
 */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const k = (n: number): number => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number): number =>
    (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))) * 255
  return [f(0), f(8), f(4)]
}

/**
 * Reads a CSS colour: `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`, `rgb()`/`rgba()`,
 * `hsl()`/`hsla()` (comma or space syntax, `/` alpha), `black`, `white` or
 * `transparent`. Throws on anything else, so an unsupported theme value is
 * reported instead of painting black.
 *
 * @param input - The colour.
 * @returns The colour as red, green, blue (0–255) and alpha (0–1).
 */
export function parseColor(input: string): RGBA {
  const text = String(input).trim().toLowerCase()
  if (text === 'black') return [0, 0, 0, 1]
  if (text === 'white') return [255, 255, 255, 1]
  if (text === 'transparent') return [0, 0, 0, 0]
  const hex = /^#([0-9a-f]{3,8})$/.exec(text)
  if (hex && [3, 4, 6, 8].includes(hex[1].length)) {
    const h = hex[1].length <= 4 ? [...hex[1]].map((c) => c + c).join('') : hex[1]
    const n = (i: number): number => parseInt(h.slice(i, i + 2), 16)
    return [n(0), n(2), n(4), h.length === 8 ? n(6) / 255 : 1]
  }
  const fn = /^(rgba?|hsla?)\(([^)]+)\)$/.exec(text)
  if (fn) {
    const parts = fn[2].split(/[\s,/]+/).filter(Boolean)
    if (parts.length < 3 || parts.length > 4) throw new Error(`cannot read the colour "${input}"`)
    const num = (part: string, scale: number): number =>
      part.endsWith('%') ? (parseFloat(part) / 100) * scale : parseFloat(part)
    const alpha = parts[3] === undefined ? 1 : num(parts[3], 1)
    const [r, g, b] = fn[1].startsWith('rgb')
      ? [num(parts[0], 255), num(parts[1], 255), num(parts[2], 255)]
      : hslToRgb(parseFloat(parts[0]), parseFloat(parts[1]) / 100, parseFloat(parts[2]) / 100)
    if ([r, g, b, alpha].some((v) => Number.isNaN(v)))
      throw new Error(`cannot read the colour "${input}"`)
    return [r, g, b, alpha]
  }
  throw new Error(
    `cannot read the colour "${input}" (use hex, rgb(), rgba(), hsl(), hsla(), black, white or transparent)`,
  )
}

/**
 * CSS `color-mix(in srgb, a percent%, b)`: premultiplied interpolation, as the
 * browser computes it.
 *
 * @param a - The first colour.
 * @param percent - How much of `a`, 0–100.
 * @param b - The second colour.
 * @returns The mixed colour.
 */
export function mixSrgb(a: RGBA, percent: number, b: RGBA): RGBA {
  const p = percent / 100
  const alpha = a[3] * p + b[3] * (1 - p)
  if (alpha === 0) return [0, 0, 0, 0]
  const channel = (i: number): number => (a[i] * a[3] * p + b[i] * b[3] * (1 - p)) / alpha
  return [channel(0), channel(1), channel(2), alpha]
}

/**
 * The palette a theme passes in: any of the `ThemeColors` keys a core token
 * reads. A molecule `Theme['colors']` fits; a missing key takes `base.css`'s
 * default.
 */
export type ThemeColorInput = Partial<Record<ThemeColorTokenKey, string>>

/**
 * Every colour token of `base.css`, resolved for one palette.
 *
 * @param colors - The theme's colours (`Theme['colors']`); a missing key takes
 *   `base.css`'s default.
 * @param tokens - The token table (default: this package's `base.css`).
 * @returns Each token's colour, by token name (`primary`, `surface-container`, …).
 */
export function resolveColorTokens(
  colors: ThemeColorInput = {},
  tokens: readonly ColorToken<string>[] = colorTokens,
): Map<string, RGBA> {
  const byName = new Map(tokens.map((token) => [token.name, token]))
  const palette = colors as Partial<Record<string, string>>
  const out = new Map<string, RGBA>()
  const visiting = new Set<string>()

  const operand = (op: ColorOperand): RGBA => {
    if ('literal' in op) return parseColor(op.literal)
    if (byName.has(op.ref)) return resolve(op.ref)
    if (op.fallback !== undefined) return parseColor(op.fallback)
    throw new Error(`token table: --color-${op.ref} is referenced but not defined`)
  }
  const resolve = (name: string): RGBA => {
    const known = out.get(name)
    if (known) return known
    if (visiting.has(name)) throw new Error(`token table: --color-${name} refers to itself`)
    visiting.add(name)
    const token = byName.get(name) as ColorToken<string>
    const value =
      token.kind === 'core'
        ? parseColor(palette[token.themeKey] ?? token.default)
        : token.kind === 'mix'
          ? mixSrgb(operand(token.a), token.percent, operand(token.b))
          : operand(token)
    visiting.delete(name)
    out.set(name, value)
    return value
  }
  for (const token of tokens) resolve(token.name)
  return out
}

/**
 * Formats a resolved colour as CSS: `rgb(r, g, b)`, or `rgba(r, g, b, a)` when
 * it is translucent. Channels are rounded to whole numbers.
 *
 * @param color - The colour.
 * @returns The CSS colour.
 */
export function formatColor(color: RGBA): string {
  const [r, g, b] = color.slice(0, 3).map((n) => Math.round(Math.min(255, Math.max(0, n))))
  return color[3] >= 1
    ? `rgb(${r}, ${g}, ${b})`
    : `rgba(${r}, ${g}, ${b}, ${Number(color[3].toFixed(3))})`
}

/**
 * The CSS variables a non-browser styling runtime needs for one palette. Each
 * token gets two:
 *
 * - `--color-<name>`: the whole colour, meaning what it means on the web, so
 *   `bg-[var(--color-primary)]` works;
 * - `--color-<name>-rgb`: its `r g b` channels, for opacity modifiers
 *   (`bg-primary/25` → `rgb(var(--color-primary-rgb) / 0.25)`).
 *
 * @param colors - The theme's colours (`Theme['colors']`).
 * @returns The variables, by name.
 */
export function themeVariables(colors: ThemeColorInput = {}): Record<string, string> {
  const variables: Record<string, string> = {}
  for (const [name, color] of resolveColorTokens(colors)) {
    variables[`--color-${name}`] = formatColor(color)
    variables[`--color-${name}-rgb`] = color
      .slice(0, 3)
      .map((n) => Math.round(Math.min(255, Math.max(0, n))))
      .join(' ')
  }
  return variables
}

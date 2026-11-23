/**
 * Type definitions for Tailwind CSS UI components.
 *
 * @module
 */

// Re-export core types
export type { ClassValue, CVAConfig } from '@molecule/app-styling'

/** One operand of a derived colour: another token (with an optional fallback) or a literal colour. */
export type ColorOperand = { ref: string; fallback?: string } | { literal: string }

/**
 * One colour token of `base.css`'s `@theme`, as data: `core` reads the theme
 * bond's `--mol-color-<themeKey>` with a default, `mix` is
 * `color-mix(in srgb, a percent%, b)`, `alias` is another token.
 */
export type ColorToken<K extends string = string> =
  | { name: string; kind: 'core'; themeKey: K; default: string }
  | { name: string; kind: 'mix'; a: ColorOperand; percent: number; b: ColorOperand }
  | { name: string; kind: 'alias'; ref: string; fallback?: string }

/** A resolved colour: red, green and blue (0–255, unrounded) and alpha (0–1). */
export type RGBA = readonly [r: number, g: number, b: number, a: number]

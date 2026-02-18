/**
 * Responsive and state-based class helpers for Tailwind CSS.
 *
 * @module
 */

import type { ThemeBreakpoints } from './types.js'
import { cn } from './utilities.js'

/**
 * Generates responsive class variants.
 *
 * @param classes - Tailwind class strings, optionally with responsive prefixes (e.g. `'md:text-base'`).
 * @example
 * ```typescript
 * responsive('text-sm', 'md:text-base', 'lg:text-lg')
 * // => 'text-sm md:text-base lg:text-lg'
 * ```
 * @returns The merged class string (via `cn`).
 */
export const responsive = (...classes: (string | undefined | null | false)[]): string => {
  return cn(...classes)
}

/**
 * Returns classes that hide an element below the given breakpoint and show it at or above.
 *
 * @example
 * ```typescript
 * show('md') // => 'hidden md:block'
 * ```
 * @param breakpoint - The Tailwind breakpoint key (e.g. `'sm'`, `'md'`, `'lg'`).
 * @returns A class string like `'hidden md:block'`.
 */
export const show = (breakpoint: keyof ThemeBreakpoints): string => {
  return `hidden ${String(breakpoint)}:block`
}

/**
 * Returns classes that show an element below the given breakpoint and hide it at or above.
 * @param breakpoint - The Tailwind breakpoint key (e.g. `'sm'`, `'md'`, `'lg'`).
 * @returns A class string like `'block lg:hidden'`.
 */
export const hide = (breakpoint: keyof ThemeBreakpoints): string => {
  return `block ${String(breakpoint)}:hidden`
}

/**
 * Prefixes each class with `dark:` for Tailwind dark mode.
 *
 * @example
 * ```typescript
 * dark('bg-gray-900', 'text-white')
 * // => 'dark:bg-gray-900 dark:text-white'
 * ```
 * @param classes - Tailwind utility class strings.
 * @returns A space-separated string of `dark:`-prefixed classes.
 */
export const dark = (...classes: string[]): string => {
  return classes.map((c) => `dark:${c}`).join(' ')
}

/**
 * Prefixes each class with `hover:` for Tailwind hover state.
 *
 * @example
 * ```typescript
 * hover('bg-gray-100', 'scale-105')
 * // => 'hover:bg-gray-100 hover:scale-105'
 * ```
 * @param classes - Tailwind utility class strings.
 * @returns A space-separated string of `hover:`-prefixed classes.
 */
export const hover = (...classes: string[]): string => {
  return classes.map((c) => `hover:${c}`).join(' ')
}

/**
 * Prefixes each class with `focus:` for Tailwind focus state.
 *
 * @example
 * ```typescript
 * focus('ring-2', 'ring-primary')
 * // => 'focus:ring-2 focus:ring-primary'
 * ```
 * @param classes - Tailwind utility class strings.
 * @returns A space-separated string of `focus:`-prefixed classes.
 */
export const focus = (...classes: string[]): string => {
  return classes.map((c) => `focus:${c}`).join(' ')
}

/**
 * Prefixes each class with `active:` for Tailwind active (pressed) state.
 *
 * @example
 * ```typescript
 * active('scale-95')
 * // => 'active:scale-95'
 * ```
 * @param classes - Tailwind utility class strings.
 * @returns A space-separated string of `active:`-prefixed classes.
 */
export const active = (...classes: string[]): string => {
  return classes.map((c) => `active:${c}`).join(' ')
}

/**
 * Prefixes each class with `disabled:` for Tailwind disabled state.
 *
 * @example
 * ```typescript
 * disabled('opacity-50', 'cursor-not-allowed')
 * // => 'disabled:opacity-50 disabled:cursor-not-allowed'
 * ```
 * @param classes - Tailwind utility class strings.
 * @returns A space-separated string of `disabled:`-prefixed classes.
 */
export const disabled = (...classes: string[]): string => {
  return classes.map((c) => `disabled:${c}`).join(' ')
}

/**
 * Prefixes each class with `group-hover:` for Tailwind group hover state.
 *
 * @example
 * ```typescript
 * groupHover('text-primary', 'underline')
 * // => 'group-hover:text-primary group-hover:underline'
 * ```
 * @param classes - Tailwind utility class strings.
 * @returns A space-separated string of `group-hover:`-prefixed classes.
 */
export const groupHover = (...classes: string[]): string => {
  return classes.map((c) => `group-hover:${c}`).join(' ')
}

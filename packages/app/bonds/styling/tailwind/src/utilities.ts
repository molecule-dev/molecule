/**
 * Utility functions for Tailwind CSS styling.
 *
 * Re-exports core utilities from {@link `@molecule/app-styling`} and owns the
 * Tailwind-specific class merger (`tailwind-merge`) — keeping that dependency
 * in this bond rather than the framework-agnostic core.
 *
 * @module
 */

import { twMerge } from 'tailwind-merge'

import { setClassMerger } from '@molecule/app-styling'

export { camelToKebab, cn, cva } from '@molecule/app-styling'

/**
 * Registers `tailwind-merge` as the class merger for `@molecule/app-styling`'s
 * `cn()`, so conflicting Tailwind utilities (e.g. two `gap-*`) resolve with the
 * last one winning. Called once at startup by `setupAppStylingTailwind()` in
 * the default React bond wiring; call it directly in any custom setup (or test)
 * that renders Tailwind-styled components and relies on conflict resolution.
 */
export const registerTailwindClassMerger = (): void => {
  setClassMerger(twMerge)
}

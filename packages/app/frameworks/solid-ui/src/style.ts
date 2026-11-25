/**
 * React-compatible styles for Solid JSX bindings.
 *
 * @module
 */

import { toStyleProps as normalizeStyle } from '@molecule/app-inline-style-dom'

export { reactStyleText } from '@molecule/app-inline-style-dom'

/**
 * Normalizes a React-shaped style object for a Solid JSX `style` binding.
 *
 * @param style - The style object.
 * @returns CSS property names and values, or undefined for an absent style.
 */
export const toStyleProps = normalizeStyle

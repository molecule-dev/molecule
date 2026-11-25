/**
 * React-compatible styles for Svelte actions and server markup.
 *
 * @module
 */

import { bindInlineStyle, reactStyleText as serializeStyle } from '@molecule/app-inline-style-dom'

export type { CSSStyle } from '@molecule/app-inline-style-dom'

/**
 * Svelte action for a React-shaped style object. Attach it with `use:reactStyle={style}`.
 *
 * @param node - The HTML or SVG element to style.
 * @param style - The initial style object.
 * @returns The action's update and cleanup hooks.
 */
export const reactStyle = bindInlineStyle

/**
 * Serializes a React-shaped object for a server-rendered `style` attribute.
 *
 * @param style - The style object.
 * @returns CSS declaration text, or undefined for an empty style.
 */
export const reactStyleText = serializeStyle

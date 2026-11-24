/**
 * The web style of an element: its `style`, then its web-only paint.
 *
 * @module
 */

import type { CSSProperties } from 'react'

import type { BoxStyle, WebStyle } from '@molecule/app-ui'

/**
 * Merges an element's `style` and `webStyle` into the one inline style the DOM element gets, or
 * `undefined` when it has neither (so no empty `style` attribute is written).
 *
 * @param style - Layout and paint both renderers apply.
 * @param webStyle - Web-only paint, applied after `style`.
 * @returns The inline style, or `undefined`.
 */
export function webElementStyle(
  style: BoxStyle | undefined,
  webStyle: WebStyle | undefined,
): CSSProperties | undefined {
  if (!style && !webStyle) return undefined
  return { ...style, ...webStyle }
}

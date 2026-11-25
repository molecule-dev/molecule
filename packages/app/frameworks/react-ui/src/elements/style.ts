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

/**
 * Merges the two style inputs at their position in the authored attributes. That allows a
 * converted element to serialize the same markup as its literal HTML tag.
 *
 * @param props - The element attributes including either style input.
 * @returns The HTML attributes with one inline style.
 */
export function webElementAttributes<Props extends { style?: BoxStyle; webStyle?: WebStyle }>(
  props: Props,
): Props | Record<string, unknown> {
  if (!('style' in props) && !('webStyle' in props)) return props
  const style = webElementStyle(props.style, props.webStyle)
  return Object.fromEntries(
    Object.entries(props).map(([name, value]) =>
      name === 'style' || name === 'webStyle' ? ['style', style] : [name, value],
    ),
  )
}

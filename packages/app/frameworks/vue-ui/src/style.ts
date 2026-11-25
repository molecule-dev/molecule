import { toStyleProps } from '@molecule/app-inline-style-dom'

/** Inline styles for a Vue template binding or render function. */
export type VueStyle = string | Record<string, string> | VueStyle[] | undefined

/**
 * Normalizes React-shaped objects for a Vue style binding.
 *
 * @param style - A style object, CSS string, or array of styles.
 * @returns A Vue style binding, with objects converted to CSS property maps.
 */
export function reactStyleProps(style: unknown): VueStyle {
  if (Array.isArray(style)) return style.map(reactStyleProps)
  return typeof style === 'string' ? style : toStyleProps(style)
}

/**
 * The web style of an element: its `style`, then its web-only paint.
 *
 * @module
 */

import type { CSSProperties } from 'react'

import type { BoxProps, SvgStyle, WebStyle } from '@molecule/app-ui'

interface StyleProps {
  style?: BoxProps['style'] | SvgStyle
  webStyle?: WebStyle
}

/**
 * Merges an element's `style` and `webStyle` into the one inline style the DOM element gets, or
 * `undefined` when it has neither (so no empty `style` attribute is written).
 *
 * @param style - Layout and paint both renderers apply.
 * @param webStyle - Web-only paint, applied after `style`.
 * @returns The inline style, or `undefined`.
 */
export function webElementStyle(
  style: StyleProps['style'],
  webStyle: WebStyle | undefined,
): CSSProperties | undefined {
  if (!style && !webStyle) return undefined
  if (style && 'coverImage' in style) {
    const url = style.coverImage
    const cover = {
      backgroundImage: url ? 'url("' + escapeCssString(url) + '")' : undefined,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }
    const authored = Object.entries(style).flatMap(([name, value]) =>
      name === 'coverImage' ? Object.entries(cover) : [[name, value]],
    )
    return { ...Object.fromEntries(authored), ...webStyle }
  }
  return { ...style, ...webStyle }
}

/** Escapes special characters for a double-quoted CSS string. */
function escapeCssString(value: string): string {
  return value.replace(
    /["\\\n\r\f]/g,
    (character) => '\\' + character.charCodeAt(0).toString(16) + ' ',
  )
}

/**
 * Projects attributes onto the literal tag. An alias shares the first position with its target.
 * Overrides change the value at that position or append an attribute the element generates.
 *
 * @param props - The element attributes including either style input.
 * @param overrides - Replacement values and generated attributes by their DOM name.
 * @param aliases - Additional element names that map to DOM names.
 * @returns The DOM attributes with one inline style.
 */
export function webElementAttributes<Props extends StyleProps>(
  props: Props,
): Omit<Props, 'style' | 'webStyle'> & { style?: CSSProperties }
export function webElementAttributes(
  props: StyleProps,
  overrides: Readonly<Record<string, unknown>>,
  aliases?: Readonly<Record<string, string>>,
): Record<string, unknown>
export function webElementAttributes(
  props: StyleProps,
  overrides: Readonly<Record<string, unknown>> = {},
  aliases: Readonly<Record<string, string>> = {},
): Record<string, unknown> {
  const style = webElementStyle(props.style, props.webStyle)
  const authored = Object.entries(props).map(([name, value]) => {
    if (name === 'style' || name === 'webStyle') return ['style', style]
    return [Object.hasOwn(aliases, name) ? aliases[name] : name, value]
  })
  return { ...Object.fromEntries(authored), ...overrides }
}

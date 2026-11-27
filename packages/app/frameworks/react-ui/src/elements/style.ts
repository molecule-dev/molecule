/**
 * The web style of an element: its `style`, then its web-only paint.
 *
 * @module
 */

import type { CSSProperties } from 'react'

import { coverImageStyle } from '@molecule/app-inline-style-dom'
import type { BoxProps, ElementContentTransform, SvgStyle, WebStyle } from '@molecule/app-ui'

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
  if (!style || (!('coverImage' in style) && !('contentTransform' in style))) {
    return { ...style, ...webStyle }
  }
  const cover = 'coverImage' in style ? coverImageStyle(style.coverImage) : undefined
  const transform =
    'contentTransform' in style ? contentTransformStyle(style.contentTransform) : undefined
  const authored = Object.entries(style).flatMap(([name, value]) => {
    if (name === 'coverImage') return Object.entries(cover ?? {})
    if (name === 'contentTransform') return Object.entries(transform ?? {})
    return [[name, value]]
  })
  return { ...Object.fromEntries(authored), ...webStyle }
}

/** Expresses the portable scale and translation in CSS transform order. */
function contentTransformStyle(transform?: ElementContentTransform): CSSProperties | undefined {
  if (!transform) return undefined
  const { translateX, translateY, scale } = transform
  return {
    transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
    transformOrigin: '0 0',
  }
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

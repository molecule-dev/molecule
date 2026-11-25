/**
 * Fallthrough-attribute and inline-style helpers for the Vue margin notes.
 *
 * React destructures its named props and spreads what remains (`{...rest}`)
 * onto the root element. In Vue the named props are declared (so they never
 * appear in `attrs`), `inheritAttrs` is off, and these helpers rebuild the same
 * spread: {@link restAttrs} is the `{...rest}`, {@link classOf} merges the
 * `className` prop with Vue's own `class` attr, and {@link styleOf} merges the
 * React-shaped `style` prop (through `toStyleProps`, which paints its
 * `coverImage` as the React element does) with Vue's own `style` attr.
 *
 * @module
 */

import { toStyleProps } from '@molecule/app-inline-style-dom'

/** Vue's fallthrough attributes (everything not declared as a prop). */
export type FallthroughAttrs = Record<string, unknown>

/**
 * The React `...rest` spread: every fallthrough attr except `class` and
 * `style`, which {@link classOf} and {@link styleOf} merge separately.
 *
 * @param attrs - Vue fallthrough attrs.
 * @returns Attrs to spread onto the root element.
 */
export function restAttrs(attrs: FallthroughAttrs): FallthroughAttrs {
  const rest: FallthroughAttrs = {}
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'class' || key === 'style') continue
    rest[key] = value
  }
  return rest
}

/**
 * The element `class` value: the component's `className` prop (React's name)
 * plus Vue's own `class` attr, for callers that use either spelling.
 *
 * @param className - The `className` prop value.
 * @param attrs - Vue fallthrough attrs.
 * @returns The class strings to join with the component's own classes.
 */
export function classOf(
  className: string | undefined,
  attrs: FallthroughAttrs,
): (string | undefined)[] {
  const extra = attrs.class
  if (extra === undefined || extra === null || extra === '') return [className]
  return [className, Array.isArray(extra) ? extra.join(' ') : (extra as string)]
}

/**
 * The element `style` value: the React-shaped `style` prop plus Vue's own
 * `style` attr, as a value Vue's `h()` normalizes (an array it concatenates).
 *
 * @param style - The `style` prop value.
 * @param attrs - Vue fallthrough attrs.
 * @returns A style value for `h()`, or undefined when neither is set.
 */
export function styleOf(
  style: Record<string, unknown> | undefined,
  attrs: FallthroughAttrs,
): unknown {
  const own = toStyleProps(style)
  const attrStyle = attrs.style
  if (own === undefined && attrStyle === undefined) return undefined
  if (attrStyle === undefined) return own
  if (own === undefined) return attrStyle
  return [own, attrStyle]
}

/**
 * React-style inline style serialization for Angular host bindings.
 *
 * @module
 */

/**
 * CSS properties that take a raw number in React (no `px` suffix).
 * Mirrors React's `isUnitlessNumber` list.
 */
const UNITLESS = new Set([
  'animationIterationCount',
  'aspectRatio',
  'borderImageOutset',
  'borderImageSlice',
  'borderImageWidth',
  'boxFlex',
  'boxFlexGroup',
  'boxOrdinalGroup',
  'columnCount',
  'columns',
  'flex',
  'flexGrow',
  'flexPositive',
  'flexShrink',
  'flexNegative',
  'flexOrder',
  'gridArea',
  'gridRow',
  'gridRowEnd',
  'gridRowSpan',
  'gridRowStart',
  'gridColumn',
  'gridColumnEnd',
  'gridColumnSpan',
  'gridColumnStart',
  'fontWeight',
  'lineClamp',
  'lineHeight',
  'opacity',
  'order',
  'orphans',
  'scale',
  'tabSize',
  'widows',
  'zIndex',
  'zoom',
  'MozAnimationIterationCount',
  'MozBoxFlex',
  'MozLineClamp',
  'msGridRow',
  'msGridRowSpan',
  'msGridColumn',
  'msGridColumnSpan',
  'WebkitAnimationIterationCount',
  'WebkitBoxFlex',
  'WebkitLineClamp',
])

/**
 * Converts a camelCase CSS property name to kebab-case.
 *
 * @param key - The camelCase property name.
 * @returns The kebab-case CSS property name.
 */
export const kebab = (key: string): string =>
  key.startsWith('--') ? key : key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)

/**
 * Serializes a React-style style object the way React writes it to the DOM:
 * camelCase keys become kebab-case, numbers gain `px` unless the property is
 * unitless, and declaration order follows object key order (the conformance
 * normalizer sorts declarations anyway).
 *
 * @param style - The style object (or undefined).
 * @returns The `style` attribute text, or null when there is nothing to set.
 */
export function styleText(style: Record<string, unknown> | undefined | null): string | null {
  if (!style) return null
  const parts: string[] = []
  for (const [key, value] of Object.entries(style)) {
    if (value === null || value === undefined || value === false) continue
    const text =
      typeof value === 'number' ? (UNITLESS.has(key) ? String(value) : `${value}px`) : String(value)
    parts.push(`${kebab(key)}: ${text}`)
  }
  return parts.length ? parts.join('; ') : null
}

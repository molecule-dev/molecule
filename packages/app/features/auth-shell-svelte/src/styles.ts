/**
 * Inline-style serialization shared by the Svelte auth-shell components: turns
 * a React-shaped style object into the `style` attribute text react-dom would
 * produce, so both frameworks leave the same declarations on the element.
 *
 * @module
 */

/**
 * A React-shaped inline style object (camelCase properties; numbers allowed).
 */
export type AuthShellStyle = Record<string, string | number | undefined | null | false>

/**
 * Properties whose numeric values take no unit (React's `isUnitlessNumber`).
 */
const UNITLESS = new Set([
  'animationIterationCount',
  'aspectRatio',
  'columnCount',
  'columns',
  'flex',
  'flexGrow',
  'flexShrink',
  'fontWeight',
  'gridArea',
  'gridColumn',
  'gridColumnEnd',
  'gridColumnStart',
  'gridRow',
  'gridRowEnd',
  'gridRowStart',
  'lineClamp',
  'lineHeight',
  'opacity',
  'order',
  'scale',
  'tabSize',
  'zIndex',
  'zoom',
  'fillOpacity',
  'floodOpacity',
  'stopOpacity',
  'strokeDashoffset',
  'strokeOpacity',
  'strokeWidth',
])

/**
 * Turns a camelCase CSS property name into its kebab-case DOM spelling.
 *
 * @param name - The camelCase property (`marginTop`, `zIndex`).
 * @returns The kebab-case property (`margin-top`, `z-index`).
 */
const kebab = (name: string): string => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)

/**
 * Serializes a React-shaped style object to the `style` attribute text, with
 * numbers gaining `px` unless the property is unitless.
 *
 * @param style - The style object (may be undefined).
 * @returns The attribute text, or undefined when nothing is set.
 */
export const toStyleText = (style: AuthShellStyle | undefined): string | undefined => {
  if (!style) return undefined
  const parts: string[] = []
  for (const [name, value] of Object.entries(style)) {
    if (value === undefined || value === null || value === false || value === '') continue
    const text =
      typeof value === 'number' && value !== 0 && !UNITLESS.has(name) ? `${value}px` : String(value)
    parts.push(`${kebab(name)}: ${text}`)
  }
  return parts.length > 0 ? parts.join('; ') : undefined
}

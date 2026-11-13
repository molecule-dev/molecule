/**
 * Inline styles shared by every Svelte component: a Svelte action that applies
 * a React-shaped style object the way react-dom does, so both frameworks leave
 * the same declarations on the element.
 *
 * @module
 */

/**
 * A React-shaped inline style object (camelCase properties, numbers allowed).
 */
export type CSSStyle = Record<string, string | number | undefined | null | false>

/**
 * Properties whose numeric values take no unit (React's `isUnitlessNumber`).
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
  'gridRowStart',
  'gridColumn',
  'gridColumnEnd',
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
  'fillOpacity',
  'floodOpacity',
  'stopOpacity',
  'strokeDasharray',
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
 * React's `dangerousStyleValue`: null/undefined/boolean/empty values clear the
 * property, numbers other than 0 take `px` unless the property is unitless,
 * and strings are trimmed.
 *
 * @param name - The camelCase property name.
 * @param value - The style value.
 * @returns The string React would assign, or `''` to clear.
 */
const reactStyleValue = (
  name: string,
  value: string | number | undefined | null | false,
): string => {
  if (value === undefined || value === null || value === false || value === '') return ''
  if (typeof value === 'number' && value !== 0 && !UNITLESS.has(name)) return `${value}px`
  return String(value).trim()
}

/**
 * Svelte action applying a React-shaped style object to an element the way
 * React applies it: every entry is assigned through the CSSOM property setter
 * (in object order, numbers gaining `px` unless unitless, falsy entries
 * cleared), and keys removed by a re-render are cleared too. React never
 * writes a literal `style` string, so shorthand/longhand pairs
 * (`borderColor` + `borderTopColor`) merge in the CSSOM exactly as React's
 * serialized attribute does.
 *
 * @param node - The element to style.
 * @param style - The React-shaped style object (may be undefined).
 * @returns The action with an update that re-applies on prop changes.
 */
export function reactStyle(
  node: HTMLElement,
  style: CSSStyle | undefined,
): { update: (next: CSSStyle | undefined) => void } {
  const applied = new Set<string>()
  const apply = (next: CSSStyle | undefined): void => {
    const removed = new Set(applied)
    if (next) {
      for (const key of Object.keys(next)) {
        removed.delete(key)
        const text = reactStyleValue(key, next[key])
        if (key.startsWith('--')) node.style.setProperty(key, text)
        else node.style.setProperty(kebab(key), text)
        if (text) applied.add(key)
        else applied.delete(key)
      }
    }
    for (const key of removed) {
      node.style.setProperty(kebab(key), '')
      applied.delete(key)
    }
  }
  apply(style)
  return { update: apply }
}

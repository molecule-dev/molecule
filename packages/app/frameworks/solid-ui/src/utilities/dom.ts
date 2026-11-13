/**
 * Internal DOM-prop helpers shared by every component.
 *
 * The package ships preserved JSX. Under the hyperscript runtime the tests
 * render through (`solid-js/h`), and under `vite-plugin-solid` in a consumer
 * build, the one prop form that stays reactive in BOTH is a spread object with
 * a getter (`<div {...{ get class() { … } }}>`): hyperscript routes getter
 * descriptors through `spread()`, and the real Solid compiler emits
 * `spread(el, obj)` for JSX spreads, whose runtime reads getters inside a
 * render effect. Plain attribute expressions are eager in the hyperscript
 * runtime, so they are only used for values that never change.
 *
 * @module
 */

/**
 * CSS properties that take a bare number (React's unitless-number list).
 * A numeric value for any other property gets `px` appended, exactly like
 * React's `dangerousStyleValue`.
 */
const UNITLESS_PROPERTIES = new Set([
  'animation-iteration-count',
  'aspect-ratio',
  'border-image-outset',
  'border-image-slice',
  'border-image-width',
  'box-flex',
  'box-flex-group',
  'box-ordinal-group',
  'column-count',
  'columns',
  'flex',
  'flex-grow',
  'flex-positive',
  'flex-shrink',
  'flex-negative',
  'flex-order',
  'grid-area',
  'grid-row',
  'grid-row-end',
  'grid-row-start',
  'grid-column',
  'grid-column-end',
  'grid-column-start',
  'font-weight',
  'line-clamp',
  'line-height',
  'opacity',
  'order',
  'orphans',
  'scale',
  'tab-size',
  'widows',
  'z-index',
  'zoom',
  'fill-opacity',
  'flood-opacity',
  'stop-opacity',
  'stroke-dasharray',
  'stroke-dashoffset',
  'stroke-miterlimit',
  'stroke-opacity',
  'stroke-width',
  'moz-animation-iteration-count',
  'moz-border-image',
  'moz-box-flex',
  'moz-box-flex-group',
  'moz-box-ordinal-group',
  'moz-column-count',
  'moz-columns',
  'moz-font-weight',
  'moz-line-height',
  'moz-opacity',
  'moz-order',
  'moz-orphans',
  'moz-scale',
  'moz-tab-size',
  'moz-widows',
  'moz-z-index',
  'moz-zoom',
  'ms-flex',
  'ms-flex-grow',
  'ms-flex-positive',
  'ms-flex-shrink',
  'ms-flex-negative',
  'ms-flex-order',
  'ms-grid-row',
  'ms-grid-row-span',
  'ms-grid-column',
  'ms-grid-column-span',
  'ms-zoom',
  'webkit-animation-iteration-count',
  'webkit-border-image',
  'webkit-box-flex',
  'webkit-box-flex-group',
  'webkit-box-ordinal-group',
  'webkit-column-count',
  'webkit-columns',
  'webkit-flex',
  'webkit-flex-grow',
  'webkit-flex-positive',
  'webkit-flex-shrink',
  'webkit-flex-negative',
  'webkit-flex-order',
  'webkit-opacity',
  'webkit-order',
  'webkit-zoom',
])

/**
 * Converts one React-style camelCase style key to its CSS property name.
 *
 * @param key - The camelCase (or already kebab/custom) style key.
 * @returns The CSS property name (`marginTop` → `margin-top`).
 */
const toCssPropertyName = (key: string): string =>
  key.startsWith('--') || key.startsWith('-')
    ? key
    : key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)

/**
 * Converts a React-style `style` object (camelCase keys, numbers where CSS
 * allows unitless values) into the kebab-case object Solid's style runtime
 * applies through `setProperty`, so both runtimes render the same
 * declarations in the same order React would.
 *
 * `undefined`/`null`/`false` values are skipped (React omits them), `0` and
 * every other number are kept (`0` renders as `0px`, exactly like React's
 * `dangerousStyleValue`).
 *
 * @template S - The caller's style object type (React `CSSProperties` or any
 * plain record), accepted so callers need no cast. A plain CSS string is not
 * a React-style style value and is ignored.
 * @param style - The React-style style object (or undefined).
 * @returns A kebab-case style object Solid applies directly, or `undefined`.
 */
export function toStyleProps<S>(style: S): Record<string, string> | undefined {
  if (!style || typeof style !== 'object') return undefined
  const out: Record<string, string> = {}
  const source = style as Record<string, unknown>
  for (const key of Object.keys(style)) {
    const value = source[key]
    if (value === undefined || value === null || value === false) continue
    const property = toCssPropertyName(key)
    out[property] =
      typeof value === 'number' && !UNITLESS_PROPERTIES.has(property) ? `${value}px` : String(value)
  }
  return out
}

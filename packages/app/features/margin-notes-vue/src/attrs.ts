/**
 * Fallthrough-attribute and inline-style helpers for the Vue margin notes.
 *
 * React destructures its named props and spreads what remains (`{...rest}`)
 * onto the root element. In Vue the named props are declared (so they never
 * appear in `attrs`), `inheritAttrs` is off, and these helpers rebuild the same
 * spread: {@link restAttrs} is the `{...rest}`, {@link classOf} merges the
 * `className` prop with Vue's own `class` attr, and {@link styleOf} merges the
 * React-shaped `style` prop (numbers become `px` except where CSS keeps them
 * unitless; {@link elementStyle} first turns its `coverImage` into the
 * background the React element paints) with Vue's own `style` attr.
 *
 * @module
 */

/** Vue's fallthrough attributes (everything not declared as a prop). */
export type FallthroughAttrs = Record<string, unknown>

/** Properties React keeps unitless — a numeric value gets no `px`. */
const UNITLESS = new Set([
  'animation-iteration-count',
  'aspect-ratio',
  'border-image-outset',
  'border-image-slice',
  'border-image-width',
  'column-count',
  'columns',
  'fill-opacity',
  'flex',
  'flex-grow',
  'flex-shrink',
  'flood-opacity',
  'font-weight',
  'grid-area',
  'grid-column',
  'grid-column-end',
  'grid-column-start',
  'grid-row',
  'grid-row-end',
  'grid-row-start',
  'line-clamp',
  'line-height',
  'opacity',
  'order',
  'orphans',
  'scale',
  'stop-opacity',
  'stroke-dasharray',
  'stroke-dashoffset',
  'stroke-miterlimit',
  'stroke-opacity',
  'stroke-width',
  'tab-size',
  'widows',
  'z-index',
  'zoom',
])

/**
 * Hyphenates a camelCase CSS property name; an already-hyphenated name and a
 * `--custom-property` are returned as they are.
 *
 * @param name - The property name.
 * @returns The CSS property name.
 */
const hyphenate = (name: string): string =>
  name.startsWith('--') ? name : name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)

/** Escapes special characters for a double-quoted CSS string (the React element's rule). */
const escapeCssString = (value: string): string =>
  value.replace(/["\\\n\r\f]/g, (character) => `\\${character.charCodeAt(0).toString(16)} `)

/**
 * The declarations a React element's `style` paints for its `coverImage`: the
 * image behind the contents, centred and sized to cover the box. An empty URI
 * paints none.
 *
 * @param url - The image URI, or undefined for none.
 * @returns The camelCase declarations, in the order React writes them.
 */
const coverImage = (url: string | undefined): [string, string | undefined][] => [
  ['backgroundImage', url ? `url("${escapeCssString(url)}")` : undefined],
  ['backgroundSize', 'cover'],
  ['backgroundPosition', 'center'],
]

/**
 * A React element's `style` with its `coverImage` turned into the background
 * declarations the element paints, in the place the key had (React's
 * `webElementStyle`).
 *
 * @param style - The React-shaped style object, or undefined.
 * @returns The same declarations, `coverImage` replaced where it stood.
 */
export function elementStyle(
  style: Record<string, string | number | undefined> | undefined,
): Record<string, string | number | undefined> {
  return Object.fromEntries(
    Object.entries(style ?? {}).flatMap(([name, entry]): [string, string | number | undefined][] =>
      name === 'coverImage'
        ? coverImage(typeof entry === 'string' ? entry : undefined)
        : [[name, entry]],
    ),
  )
}

/**
 * Converts a React-shaped `style` object into the declarations Vue applies,
 * adding `px` to numeric values except the properties CSS keeps unitless
 * (React's own `dangerousStyleValue`).
 *
 * @param style - The React-shaped style object, or undefined.
 * @returns A kebab-case style object Vue applies, or undefined when empty.
 */
export function reactStyle(
  style: Record<string, string | number | undefined> | undefined,
): Record<string, string> | undefined {
  if (!style) return undefined
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(style)) {
    if (value === undefined || value === null) continue
    const property = hyphenate(key)
    out[property] =
      typeof value === 'number' && !UNITLESS.has(property) ? `${value}px` : String(value)
  }
  return Object.keys(out).length > 0 ? out : undefined
}

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
  style: Record<string, string | number | undefined> | undefined,
  attrs: FallthroughAttrs,
): unknown {
  const own = reactStyle(style)
  const attrStyle = attrs.style
  if (own === undefined && attrStyle === undefined) return undefined
  if (attrStyle === undefined) return own
  if (own === undefined) return attrStyle
  return [own, attrStyle]
}

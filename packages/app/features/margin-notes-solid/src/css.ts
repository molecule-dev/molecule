/**
 * Inline-style serialisation for the margin-notes component.
 *
 * React turns a style object into the element's `style` attribute, adding
 * `px` to numeric values except the properties CSS keeps unitless. The other
 * frameworks differ here (Solid passes values straight to the CSSOM), so the
 * components serialise the style themselves: every framework then renders the
 * same declarations and therefore the same pixels.
 *
 * @module
 */

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
 * @param style - The React-shaped style object.
 * @returns The same declarations, `coverImage` replaced where it stood.
 */
export const elementStyle = (
  style: Record<string, string | number>,
): Record<string, string | number | undefined> =>
  Object.fromEntries(
    Object.entries(style).flatMap(([name, entry]): [string, string | number | undefined][] =>
      name === 'coverImage'
        ? coverImage(typeof entry === 'string' ? entry : undefined)
        : [[name, entry]],
    ),
  )

/**
 * Serialises a style object into the `style` attribute React would render.
 *
 * @param style - The style declarations.
 * @returns The attribute value.
 */
export const styleString = (style: Record<string, string | number | undefined>): string =>
  Object.entries(style)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([name, value]) => {
      const property = hyphenate(name)
      const rendered =
        typeof value === 'number' && !UNITLESS.has(property) ? `${value}px` : String(value)
      return `${property}: ${rendered}`
    })
    .join('; ')

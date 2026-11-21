/**
 * Inline-style serialisation for the 3D viewer components.
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

/**
 * Serialises a style object into the `style` attribute React would render.
 *
 * @param style - The style declarations.
 * @returns The attribute value.
 */
export const styleString = (style: Record<string, string | number>): string =>
  Object.entries(style)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([name, value]) => {
      const property = hyphenate(name)
      const rendered =
        typeof value === 'number' && !UNITLESS.has(property) ? `${value}px` : String(value)
      return `${property}: ${rendered}`
    })
    .join('; ')

/**
 * The same declarations as a style map for Angular's `NgStyle`.
 *
 * `NgStyle` applies each declaration through the CSSOM, which is what React
 * does — an attribute written with `border: none` would keep that spelling
 * while React's normalised attribute says `border: medium`. Keys stay in
 * their camelCase form, which the CSSOM accepts in either spelling.
 *
 * @param style - The style declarations.
 * @returns The style map.
 */
export const styleObject = (style: Record<string, string | number>): Record<string, string> =>
  Object.fromEntries(
    Object.entries(style)
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .map(([name, value]) => {
        const rendered =
          typeof value === 'number' && !UNITLESS.has(hyphenate(name)) ? `${value}px` : String(value)
        return [name, rendered]
      }),
  )

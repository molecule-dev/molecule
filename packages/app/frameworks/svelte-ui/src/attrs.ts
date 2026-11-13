/**
 * React-name to DOM-attribute normalization for rest-prop spreads.
 *
 * Svelte's spread already maps most React-style property names
 * (`autoComplete`, `maxLength`, `readOnly`, `defaultChecked`, …) and attaches
 * `on*` handlers, but `htmlFor` and `className` pass through verbatim
 * (`htmlfor`, `classname`), so this helper renames the two Svelte leaves
 * alone before a rest object is spread onto an element.
 *
 * @module
 */

/**
 * React prop names whose DOM attribute name differs and Svelte does not map.
 * Built through assignment (not an object literal) because the values are DOM
 * ATTRIBUTE names — `class` here is the attribute a `className` prop lands on,
 * not a CSS class token, and the raw-class-names lint reads object-literal
 * `class`/`className` values as class lists.
 */
const RENAMES: Record<string, string> = {}
RENAMES.htmlFor = 'for'
RENAMES.className = 'class'

/**
 * Renames the React-only prop names inside a rest-prop bag so it can be
 * spread onto a DOM element with React's attribute semantics.
 *
 * @param rest - The rest props (already excluding destructured props).
 * @returns The props safe to spread onto a DOM element.
 */
export function reactAttrs(rest: Record<string, unknown>): Record<string, unknown> {
  let renamed = false
  for (const key of Object.keys(rest)) {
    if (RENAMES[key]) {
      renamed = true
      break
    }
  }
  if (!renamed) return rest
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(rest)) {
    out[RENAMES[key] ?? key] = value
  }
  return out
}

/**
 * Strips `on*` event handlers out of a rest-prop bag, so they can be attached
 * through {@link spreadEvents} instead of the attribute spread (Svelte's
 * spread applies prop-derived event keys as attributes, not listeners).
 *
 * @param rest - The rest props.
 * @returns The props without event handlers.
 */
export function withoutEvents(rest: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  let dropped = false
  for (const [key, value] of Object.entries(rest)) {
    if (key.startsWith('on') && typeof value === 'function') {
      dropped = true
      continue
    }
    out[key] = value
  }
  return dropped ? out : rest
}

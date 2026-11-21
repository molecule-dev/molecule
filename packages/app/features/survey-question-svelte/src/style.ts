/**
 * React-shaped inline styles as a declaration string.
 *
 * The React package writes its inline styles as objects; this package writes
 * the same declarations (kebab-case properties, string values) as one style
 * attribute, so the rendered DOM is identical.
 *
 * @module
 */

/**
 * Joins a React-shaped style object into a `style` attribute value, skipping
 * absent entries.
 *
 * @param style - The declarations, in object key order.
 * @returns The style attribute text.
 */
export function styleText(style: Record<string, string | undefined>): string {
  return Object.entries(style)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}: ${value}`)
    .join('; ')
}

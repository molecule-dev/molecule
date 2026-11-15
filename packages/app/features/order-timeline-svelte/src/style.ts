/**
 * Inline style application for the order timeline: a Svelte action that
 * applies a React-shaped style object the way react-dom does, so the
 * declarations land on the element through the CSSOM exactly as React's
 * runtime leaves them.
 *
 * @module
 */

/** Inline style declarations, keyed by their CSS property name. */
export type CSSStyle = Record<string, string | undefined>

/**
 * Svelte action applying a style object the way React does: every entry is
 * assigned through the CSSOM property setter, an empty or missing value clears
 * the property (which also clears a shorthand's longhands, something
 * `removeProperty` does not do), and keys removed by a re-render are cleared.
 *
 * @param node - The element to style.
 * @param style - The style declarations.
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
      for (const [name, value] of Object.entries(next)) {
        removed.delete(name)
        const text = value === undefined ? '' : value.trim()
        node.style.setProperty(name, text)
        if (text) applied.add(name)
        else applied.delete(name)
      }
    }
    for (const name of removed) {
      node.style.setProperty(name, '')
      applied.delete(name)
    }
  }
  apply(style)
  return { update: apply }
}

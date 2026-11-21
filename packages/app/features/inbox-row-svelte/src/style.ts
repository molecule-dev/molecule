/**
 * Inline style application for this package's component: a Svelte action that
 * applies a React-shaped style object the way react-dom does, so the
 * declarations land on the element through the CSSOM exactly as React's
 * runtime leaves them. A plain `style="…"` attribute would be written as an
 * attribute string, which leaves values React normalizes (a hex colour
 * is serialized in its expanded form) unnormalized.
 *
 * @module
 */

/** A React-shaped inline style object (camelCase keys). */
export type CSSStyle = Record<string, string | number | undefined | null | false>

/**
 * Turns a camelCase CSS property name into its kebab-case DOM spelling.
 *
 * @param name - The camelCase property (`borderRadius`).
 * @returns The kebab-case property (`border-radius`).
 */
const kebab = (name: string): string => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)

/**
 * Svelte action applying a React-shaped style object to an element the way
 * React does: every entry is assigned through the CSSOM property setter (in
 * object order, values serialized as strings), and keys removed by a
 * re-render are cleared too.
 *
 * @param node - The element to style.
 * @param style - The style object (may be undefined).
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
      for (const [key, value] of Object.entries(next)) {
        removed.delete(key)
        const text =
          value === undefined || value === null || value === false || value === ''
            ? ''
            : String(value).trim()
        node.style.setProperty(kebab(key), text)
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

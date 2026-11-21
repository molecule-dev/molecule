/**
 * Svelte inline-style action: applies a React-style style object through the
 * CSSOM property setters, as react-dom does.
 *
 * A raw `style` attribute string is not equivalent — jsdom's CSS engine
 * serializes shorthands (`border: none` becomes `border: medium`) only when the
 * declaration is set through the CSSOM, so the action keeps the rendered style
 * attribute identical to React's.
 *
 * @module
 */

/**
 * Applies the declarations of a style object to an element's `style`.
 *
 * Property names are kebab-case, so `style.setProperty` accepts them directly.
 *
 * @param node - The element the action is attached to.
 * @param style - The declarations to apply.
 * @returns The action, whose `update` re-applies on a change.
 */
export function inlineStyle(
  node: HTMLElement,
  style: Record<string, string>,
): { update: (next: Record<string, string>) => void } {
  const apply = (next: Record<string, string>): void => {
    for (const [property, value] of Object.entries(next)) node.style.setProperty(property, value)
  }
  apply(style)
  return { update: apply }
}

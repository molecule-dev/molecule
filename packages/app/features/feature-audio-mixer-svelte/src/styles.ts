/**
 * Svelte actions for the mixer's inline styles that React sets conditionally.
 *
 * @module
 */

/**
 * Applies React's `borderTop: color ? `3px solid ${color}` : undefined` to the
 * header strip: a CSSOM property assignment, so the shorthand is parsed and
 * canonicalized exactly as React's inline style is, and an absent color clears
 * it completely.
 *
 * @param node - The header element.
 * @param color - The channel's accent color, or undefined for none.
 * @returns The action's update hook.
 */
export function borderTop(
  node: HTMLElement,
  color: string | undefined,
): { update(next: string | undefined): void } {
  const apply = (value: string | undefined): void => {
    node.style.borderTop = value ? `3px solid ${value}` : ''
  }
  apply(color)
  return {
    update: (next: string | undefined) => apply(next),
  }
}

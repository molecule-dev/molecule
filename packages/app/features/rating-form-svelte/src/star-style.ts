/**
 * The star button's inline style, applied the way react-dom applies it.
 *
 * @module
 */

/** The colours a star draws in, filled or empty. */
const STAR_COLORS = {
  filled: 'var(--mol-color-warning, #facc15)',
  empty: 'var(--mol-color-border, rgba(128,128,128,0.4))',
} as const

/**
 * Applies the star button's four declarations through the CSSOM property
 * setters (as react-dom does) instead of a `style` attribute string: cssstyle
 * — jsdom's CSS engine — drops `background: none` when it parses a full
 * declaration list, so a raw attribute would serialize differently from React.
 *
 * @param node - The star's `<button>`.
 * @param filled - Whether the star draws in the filled colour.
 * @returns The action, whose `update` re-applies on a fill change.
 */
export function starStyle(node: HTMLElement, filled: boolean): { update: (next: boolean) => void } {
  const apply = (on: boolean): void => {
    node.style.setProperty('background', 'none')
    node.style.setProperty('border', 'none')
    node.style.setProperty('font-size', '28px')
    node.style.setProperty('color', on ? STAR_COLORS.filled : STAR_COLORS.empty)
  }
  apply(filled)
  return { update: apply }
}

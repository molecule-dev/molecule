/**
 * The DOM helper the bonded legal HTML renders through.
 *
 * @module
 */

/**
 * Applies an HTML string to an element's `innerHTML` and keeps it current — the
 * DOM equivalent of React's `dangerouslySetInnerHTML`, which is the trust model
 * this package shares with the React reference (the legal catalog is
 * app-supplied, and the `appName` interpolated into it is HTML-escaped first).
 *
 * @param node - The element whose contents the HTML replaces.
 * @param html - The HTML string.
 * @returns The action's update hook, which re-applies a later HTML string.
 */
export function innerHtml(
  node: HTMLElement,
  html: string,
): {
  /** Replaces the element's contents with a new HTML string. */
  update: (next: string) => void
} {
  node.innerHTML = html
  return {
    update(next: string): void {
      if (node.innerHTML !== next) node.innerHTML = next
    },
  }
}

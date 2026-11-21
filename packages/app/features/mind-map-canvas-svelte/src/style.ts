/**
 * Svelte action reproducing react-dom's inline-style application for the
 * inline editor's input.
 *
 * Svelte compiles static `style:` directives into one `cssText` write at
 * mount, and jsdom's combined-shorthand parse of that write drops
 * `background: transparent`. React applies inline styles per property
 * (`el.style.<prop> = …`), which keeps every declaration — so this action
 * applies the declarations the same way, one `setProperty` per key, on mount
 * and on every change.
 *
 * @module
 */

/**
 * Applies `styles` to the element the way react-dom applies an inline `style`
 * object: per property, through the CSSOM, never as one raw `cssText` write.
 *
 * @param node - The element to style.
 * @param styles - CSS property names (kebab-case or custom properties) and
 *   their values.
 * @returns The action's update, re-applying on changed styles.
 */
export function reactInlineStyle(
  node: HTMLElement,
  styles: Record<string, string>,
): { update: (next: Record<string, string>) => void } {
  const apply = (next: Record<string, string>): void => {
    for (const [name, value] of Object.entries(next)) node.style.setProperty(name, value)
  }
  apply(styles)
  return { update: apply }
}

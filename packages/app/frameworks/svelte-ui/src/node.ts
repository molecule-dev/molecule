/**
 * Whether a node-valued Svelte prop renders anything, by React's `slot(node)` rule.
 *
 * @module
 */

/**
 * Whether a node-valued prop renders anything: not `null`, `undefined`, a boolean or `''`. React's
 * `slot(node)` from `@molecule/app-react/render` decides the same way. A snippet counts, as a React
 * component element does: only rendering it could tell that it renders nothing.
 *
 * @param node - The prop value (a string, a number or a snippet).
 * @returns True when it renders something.
 */
export function rendersNode(node: unknown): boolean {
  return node !== null && node !== undefined && typeof node !== 'boolean' && node !== ''
}

/**
 * Whether a resolved Solid node renders anything, by React's `slot(node)` rule.
 *
 * @module
 */

/**
 * Whether a node, resolved with Solid's `children()`, renders anything: not `null`, `undefined`,
 * a boolean or `''`, and not a list holding only those. React's `slot(node)` from
 * `@molecule/app-react/render` decides the same way, so a dialog that points at its heading only
 * while the title renders reads the same in both.
 *
 * @param node - The resolved node.
 * @returns True when it renders something.
 */
export function rendersNode(node: unknown): boolean {
  if (node === null || node === undefined || typeof node === 'boolean' || node === '') return false
  if (Array.isArray(node)) return node.some(rendersNode)
  return true
}

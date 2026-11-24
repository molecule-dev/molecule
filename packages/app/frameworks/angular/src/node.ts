/**
 * Whether a node input renders anything, by React's `slot(node)` rule.
 *
 * @module
 */

/**
 * Whether a node input renders anything: not `null`, `undefined`, a boolean or `''`, and not
 * a list holding only those. React's `slot(node)` from `@molecule/app-react/render` decides the
 * same way, so a component that renders a wrapper, a default or an `aria-*` reference only
 * while a node prop has something to show reads the same in both: `title=""` renders no heading,
 * like an omitted `title`. Projected content is read with the `SlotReader` of
 * {@link usePlacement} instead, which already counts only what renders.
 *
 * @example
 * ```ts
 * showUnit(): boolean {
 *   return rendersNode(this.unit) || this.unitProjected()
 * }
 * ```
 *
 * @param node - The input's value.
 * @returns True when it renders something.
 */
export function rendersNode(node: unknown): boolean {
  if (node === null || node === undefined || typeof node === 'boolean' || node === '') return false
  if (Array.isArray(node)) return node.some(rendersNode)
  return true
}

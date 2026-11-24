/**
 * Whether a resolved Solid node renders anything, by React's `slot(node)` rule.
 *
 * @module
 */

/**
 * Whether a node, resolved with Solid's `children()`, renders anything: not `null`, `undefined`,
 * a boolean or `''`, and not a list holding only those. React's `slot(node)` from
 * `@molecule/app-react/render` decides the same way, so a component that renders a wrapper only
 * while a node prop has something to show (a dialog's heading id, a dropdown panel) reads the
 * same in both: an empty list (`[]`, a `<For>` over no rows) renders nothing, like an omitted
 * prop.
 *
 * @example
 * ```tsx
 * const content = resolveNode(() => props.children)
 * return <Show when={open() && rendersNode(content())}><div>{content()}</div></Show>
 * ```
 *
 * @param node - The resolved node.
 * @returns True when it renders something.
 */
export function rendersNode(node: unknown): boolean {
  if (node === null || node === undefined || typeof node === 'boolean' || node === '') return false
  if (Array.isArray(node)) return node.some(rendersNode)
  return true
}

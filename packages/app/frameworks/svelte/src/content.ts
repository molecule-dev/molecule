/**
 * Rendered DOM content, read by React's `slot(node)` rule.
 *
 * @module
 */

/**
 * The children of a node that render something: elements, and text nodes with text. Comments
 * and empty text nodes are Svelte's own anchors (and other components' placeholders), not
 * content.
 *
 * @example
 * ```ts
 * const nodes = contentNodes(titleEl)
 * const text = nodes.length === 1 && nodes[0].nodeType === 3 ? nodes[0].textContent : ''
 * ```
 *
 * @param node - The node whose children are read.
 * @returns Those children, in order.
 */
export function contentNodes(node: Node): ChildNode[] {
  return Array.from(node.childNodes).filter(
    (child) => child.nodeType === 1 || (child.nodeType === 3 && (child.textContent ?? '') !== ''),
  )
}

/**
 * Whether a node's children render anything (see {@link contentNodes}). A Svelte component
 * cannot tell from a snippet's value whether it renders anything (`{#each}` over no rows,
 * `{#if false}`), so a component that renders a wrapper only while its content has something to
 * show, as React's `slot(children) !== undefined && <div>…</div>` does, asks the rendered DOM
 * instead (see `PresentWhileContent`).
 *
 * @example
 * ```ts
 * rendersContent(panel) // false while the panel's snippet renders an empty list
 * ```
 *
 * @param node - The node whose children are read.
 * @returns True when one of them renders something.
 */
export function rendersContent(node: Node): boolean {
  return contentNodes(node).length > 0
}

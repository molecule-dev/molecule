/**
 * DOM helpers for {@link ShowMore}: a Svelte snippet is opaque (it has no
 * length), so React's `children.slice(0, initialCount)` is reproduced as a DOM
 * effect — the nodes the children snippet rendered are measured once, then
 * detached or restored in order.
 *
 * @module
 */

/**
 * The nodes a snippet rendered at the top level of an element: its element
 * children and the text children that carry content (comment anchors and
 * template whitespace are not items).
 *
 * @param root - The element whose children the snippet rendered.
 * @returns The item nodes, in document order.
 */
export const itemNodes = (root: Element): (Element | Text)[] =>
  Array.from(root.childNodes).filter(
    (node): node is Element | Text =>
      node.nodeType === Node.ELEMENT_NODE ||
      (node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim() !== ''),
  )

/**
 * Shows the first `visibleCount` items and hides the rest, restoring the
 * order React renders: the visible items, then the toggle.
 *
 * @param root - The list's root element.
 * @param items - The item nodes, in document order (captured once).
 * @param visibleCount - How many items React would render.
 * @param anchor - The node the hidden items go back in front of (the toggle), when attached.
 */
export const truncateNodes = (
  root: Element,
  items: (Element | Text)[],
  visibleCount: number,
  anchor: Node | null,
): void => {
  const before = anchor?.parentNode === root ? anchor : null
  for (const [index, node] of items.entries()) {
    if (index < visibleCount) {
      if (!node.isConnected) root.insertBefore(node, before)
    } else if (node.isConnected) {
      node.parentNode?.removeChild(node)
    }
  }
}

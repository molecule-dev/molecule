/**
 * DOM helpers for the projected-slot wrappers and the truncated list of the
 * Angular collapsible section.
 *
 * React renders node props conditionally (`{expr && <div>…}`) and truncates a
 * `children` array (`children.slice(0, initialCount)`). Angular content
 * projection needs always-mounted `<ng-content>` capture points, and a
 * projected list has no `length`: these helpers reconcile the rendered DOM with
 * what React would have rendered.
 *
 * @module
 */

import type { TemplateRef } from '@angular/core'

/**
 * Whether a node-valued prop is an Angular template (a `{ $nodes }` value)
 * rather than plain text. Checked structurally — `TemplateRef` is a type-only
 * import in the emitted metadata, so `instanceof` is not dependable across
 * bundles.
 *
 * @param value - The prop value.
 * @returns True when it can be rendered with `ngTemplateOutlet`.
 */
export const isTemplate = (value: unknown): value is TemplateRef<unknown> =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as TemplateRef<unknown>).createEmbeddedView === 'function'

/**
 * Renders a text value the way React renders a node string.
 *
 * @param value - The prop value.
 * @returns The text to render, or `''` when there is nothing.
 */
export const textOf = (value: unknown): string =>
  value === null || value === undefined ? '' : String(value)

/**
 * Whether an `<ng-content>` wrapper captured any element or text node.
 *
 * @param el - The wrapper element.
 * @returns True when at least one projected node exists.
 */
export const hasNodes = (el: Element | undefined | null): boolean => {
  if (!el) return false
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === Node.ELEMENT_NODE) return true
    if (node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim()) return true
  }
  return false
}

/**
 * The nodes a projected list rendered: element children and the text children
 * that carry content (comment anchors are not items).
 *
 * @param root - The element that hosts the projected nodes.
 * @returns The item nodes, in document order.
 */
export const itemNodes = (root: Element): (Element | Text)[] =>
  Array.from(root.childNodes).filter(
    (node): node is Element | Text =>
      node.nodeType === Node.ELEMENT_NODE ||
      (node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim() !== ''),
  )

/** Where a detached wrapper goes back: the parent it was attached to. */
export interface AttachedState {
  /** The wrapper's parent element, remembered when it is detached. */
  parent: Node | null
}

/**
 * Attaches or detaches a wrapper whose position is its parent's end, as React
 * renders a `{expr && <element>…}` branch: the wrapper is appended when it
 * comes back.
 *
 * @param el - The wrapper element.
 * @param shouldShow - Whether React would have it in the DOM.
 * @param state - The wrapper's remembered parent.
 */
export const setAttached = (
  el: Element | undefined | null,
  shouldShow: boolean,
  state: AttachedState,
): void => {
  if (!el) return
  if (shouldShow) {
    if (!el.isConnected && state.parent) state.parent.appendChild(el)
  } else if (el.isConnected) {
    state.parent = el.parentNode
    el.parentNode?.removeChild(el)
  }
}

/**
 * Shows the first `visibleCount` items and hides the rest, restoring the order
 * React renders: the visible items, then the toggle.
 *
 * @param root - The list's root element.
 * @param items - The item nodes, in document order (captured once).
 * @param visibleCount - How many items React would render.
 * @param anchor - The node the hidden items go back in front of (the toggle), when attached.
 */
export const truncateItems = (
  root: Element,
  items: (Element | Text)[],
  visibleCount: number,
  anchor: Node | null,
): void => {
  const before = anchor && anchor.parentNode === root ? anchor : null
  for (const [index, node] of items.entries()) {
    if (index < visibleCount) {
      if (!node.isConnected) root.insertBefore(node, before)
    } else if (node.isConnected) {
      node.parentNode?.removeChild(node)
    }
  }
}

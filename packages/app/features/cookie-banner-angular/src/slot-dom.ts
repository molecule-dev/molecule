/**
 * DOM helpers for the projected node props of the Angular cookie-consent
 * banner.
 *
 * React renders a node prop bare inside the element that holds it (`<h3>` for
 * the title, `<p>` for the description). Angular content projection needs an
 * always-mounted `<ng-content>` capture point, so each field renders through a
 * pair of capture spans — one for the plain input's text and one for the
 * projected nodes — and {@link applyNodeLayout} keeps whichever React would
 * have rendered, unwrapping it into the parent element.
 *
 * @module
 */

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
 * Reconciles a field's pair of capture spans with React's DOM: whichever of the
 * two React would render is unwrapped into the parent element (so no wrapper
 * element appears), and the other is removed.
 *
 * @param fallback - The span holding the plain input's text.
 * @param slot - The span holding the projected node content.
 * @param hasSlotContent - Whether the caller projected node content.
 */
export const applyNodeLayout = (
  fallback: HTMLElement | undefined,
  slot: HTMLElement | undefined,
  hasSlotContent: boolean,
): void => {
  if (!fallback || !slot) return
  const parent = fallback.parentNode
  if (!parent) return
  if (hasSlotContent) {
    // React renders only the node: drop the text capture point, unwrap the node.
    if (fallback.isConnected) parent.removeChild(fallback)
    while (slot.firstChild) parent.insertBefore(slot.firstChild, slot)
    if (slot.isConnected) parent.removeChild(slot)
    return
  }
  // React renders only the input text: unwrap it, drop both capture points.
  while (fallback.firstChild) parent.insertBefore(fallback.firstChild, fallback)
  if (fallback.isConnected) parent.removeChild(fallback)
  if (slot.isConnected) parent.removeChild(slot)
}

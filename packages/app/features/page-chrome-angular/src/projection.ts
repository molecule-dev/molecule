/**
 * Content-projection helpers shared by the page-chrome components.
 *
 * React renders an optional region's wrapper (`<p>` for a subtitle, the action
 * row, the hero's media column) only while its prop is truthy, and removes it
 * when the prop goes away. Angular's `<ng-content>` can only project into
 * markup that exists, so each of those wrappers is always in the template and
 * these helpers detach it while its projected content is empty, remembering
 * where React would put it so a later projection restores the exact order.
 *
 * @module
 */

/**
 * Whether an element captured any element or non-blank text node.
 *
 * @param el - The element to inspect (an absent or blank region is empty).
 * @returns True when at least one projected node exists.
 */
export const hasNodes = (el: Element | undefined): boolean => {
  if (!el) return false
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === 1) return true
    if (node.nodeType === 3 && (node.textContent ?? '').trim()) return true
  }
  return false
}

/**
 * Leaves a comment marker at an element's position, so the element can be
 * detached and re-attached exactly where React renders it.
 *
 * @param el - The element to mark.
 * @returns The marker node, or undefined when the element has no parent yet.
 */
export const markPosition = (el: Element | undefined): Comment | undefined => {
  const parent = el?.parentNode
  if (!el || !parent) return undefined
  const marker = el.ownerDocument.createComment('mol-page-chrome')
  parent.insertBefore(marker, el)
  return marker
}

/**
 * Detaches an optional region while its projected content is empty, and
 * re-attaches it at its marker once content is projected again.
 *
 * @param el - The region's wrapper element.
 * @param marker - The position marker from {@link markPosition}.
 */
export const syncPresence = (el: Element | undefined, marker: Comment | undefined): void => {
  const parent = marker?.parentNode
  if (!el || !parent) return
  if (hasNodes(el)) {
    if (!el.parentNode) parent.insertBefore(el, marker)
  } else if (el.parentNode) {
    el.remove()
  }
}

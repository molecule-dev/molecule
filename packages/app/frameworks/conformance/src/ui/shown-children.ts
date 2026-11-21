/**
 * The element tree a case's snapshot shows: a mount wrapper or a framework's host element
 * (`data-parity-unwrap`) is left out and replaced by its children, as the normalizer does. The
 * focus and ref paths and the layout stubs follow this tree, so a host element one framework adds
 * changes neither a path nor a stubbed scroll height.
 *
 * @module
 */

/**
 * Whether the snapshot leaves this element out (`data-parity-unwrap`).
 *
 * @param el - The element.
 * @returns Whether it is left out.
 */
export const isLeftOut = (el: Element): boolean => el.hasAttribute('data-parity-unwrap')

/**
 * An element's element children as the snapshot shows them: a left-out child is replaced by its own.
 *
 * @param parent - The element.
 * @returns Its shown children, in order.
 */
export const shownChildren = (parent: Element): Element[] =>
  Array.from(parent.children).flatMap((child) =>
    isLeftOut(child) ? shownChildren(child) : [child],
  )

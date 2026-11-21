/**
 * DOM helpers for the projected capture points of {@link SidebarLayout}.
 *
 * React renders the bottom slot container only when a slot exists, and renders
 * a bare placeholder `<span>` while the user menu is absent but the theme
 * toggle is present. Angular projection needs an always-mounted `<ng-content>`
 * capture point, so the container lives in the template unconditionally and
 * these helpers reconcile it against React's DOM: the capture points are marked
 * `data-parity-unwrap` (the conformance snapshot expands them, so they look like
 * React's bare slot) and the container / placeholder are detached when React
 * would not render them, re-attached from where they were removed.
 *
 * @module
 */

import type { Renderer2 } from '@angular/core'

/**
 * Whether an ng-content wrapper captured any element or text node.
 *
 * @param el - The wrapper element.
 * @returns True when at least one projected node exists.
 */
export const hasNodes = (el: Element | undefined | null): boolean => {
  if (!el) return false
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === 1) return true
    if (node.nodeType === 3 && (node.textContent ?? '').trim()) return true
  }
  return false
}

/**
 * Attaches or detaches one template element against what React renders,
 * remembering the parent it came from so it returns to the same place (the
 * slot container's parent is the `<aside>`, not the component host).
 */
export class SlotGuard {
  private readonly parents = new Map<Element, Node>()
  private readonly anchors = new Map<Element, Comment>()

  /**
   * Creates the guard.
   *
   * @param renderer - The DOM renderer.
   */
  constructor(private readonly renderer: Renderer2) {}

  /**
   * Attaches or detaches the element (contents move with it).
   *
   * @param el - The element to reconcile.
   * @param shouldAttach - Whether it should be in the DOM.
   */
  toggle(el: Element | undefined | null, shouldAttach: boolean): void {
    if (!el) return
    if (shouldAttach) {
      const parent = this.parents.get(el)
      if (!parent || el.isConnected) return
      const anchor = this.anchors.get(el)
      if (anchor?.isConnected) {
        parent.insertBefore(el, anchor)
        this.renderer.removeChild(parent, anchor)
        this.anchors.delete(el)
      } else {
        parent.appendChild(el)
      }
    } else if (el.isConnected && el.parentNode) {
      const parent = el.parentNode
      this.parents.set(el, parent)
      // A placeholder comment keeps the re-insertion position stable; the
      // conformance normalizer strips comment nodes, so it never shows.
      const anchor = this.renderer.createComment('slot')
      parent.insertBefore(anchor, el)
      this.anchors.set(el, anchor)
      this.renderer.removeChild(parent, el)
    }
  }
}

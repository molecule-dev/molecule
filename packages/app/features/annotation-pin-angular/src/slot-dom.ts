/**
 * DOM helpers for the projected capture points of the annotation-pin
 * components.
 *
 * React renders an optional node prop directly and drops it otherwise, and
 * renders the popup only while the pin is selected. Angular projection needs
 * an always-mounted `<ng-content>` capture point, and an `ng-content` created
 * later never receives the projection — so each capture point (and the popup)
 * lives in the template unconditionally and these helpers reconcile it
 * against React's DOM.
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
 * Attaches or detaches one template element, remembering whether it is in the
 * DOM so repeated change-detection passes never move it again.
 *
 * A detached element leaves a comment where it sat, so re-attaching puts it
 * back in React's position; the conformance normalizer strips comments.
 */
export class ElementToggle {
  /** Whether the element is currently in the DOM. */
  private attached = true
  /** The comment standing in for the element while it is detached. */
  private anchor: Comment | null = null
  /** The parent the detached element goes back into. */
  private parent: Node | null = null

  /**
   * Creates the toggle.
   *
   * @param renderer - The DOM renderer.
   */
  constructor(private readonly renderer: Renderer2) {}

  /**
   * Attaches or detaches the element.
   *
   * @param el - The element.
   * @param shouldAttach - Whether it should be in the DOM.
   */
  toggle(el: Element | undefined | null, shouldAttach: boolean): void {
    if (!el) return
    if (shouldAttach === this.attached) return
    const parent = el.parentNode ?? this.parent
    if (!parent) return
    if (shouldAttach) {
      if (this.anchor?.isConnected) {
        parent.insertBefore(el, this.anchor)
        this.renderer.removeChild(parent, this.anchor)
      } else {
        parent.appendChild(el)
      }
      this.anchor = null
      this.parent = null
      this.attached = true
      return
    }
    const anchor = this.renderer.createComment('slot')
    parent.insertBefore(anchor, el)
    this.renderer.removeChild(parent, el)
    this.anchor = anchor
    this.parent = parent
    this.attached = false
  }
}

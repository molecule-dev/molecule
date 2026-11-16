/**
 * DOM helpers for the projected capture points of the empty-state components.
 *
 * React renders an optional wrapper only when its node prop is present, and
 * drops it otherwise. Angular projection needs an always-mounted `<ng-content>`
 * capture point, so each optional wrapper lives in the template unconditionally
 * and these helpers reconcile it against React's DOM: the wrapper is detached
 * (contents move with it) when React would not render it, and re-attached when a
 * later render supplies one.
 *
 * @module
 */

import type { ElementRef, Renderer2 } from '@angular/core'

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
 * Reconciles one always-mounted wrapper against what React renders.
 *
 * Both operations are idempotent and anchored in the wrapper's current parent
 * (default: the component host), so a wrapper whose contents move with it can
 * be detached and re-attached across prop changes.
 */
export class SlotGuard {
  private readonly anchors = new Map<Element, Comment>()

  /**
   * Creates the guard.
   *
   * @param host - The component host element (default anchor parent).
   * @param renderer - The DOM renderer.
   */
  constructor(
    private readonly host: ElementRef<HTMLElement>,
    private readonly renderer: Renderer2,
  ) {}

  /**
   * Attaches or detaches the element (contents move with it).
   *
   * @param el - The wrapper element.
   * @param shouldAttach - Whether it should be in the DOM.
   */
  toggle(el: Element | undefined | null, shouldAttach: boolean): void {
    if (!el) return
    if (shouldAttach && !el.isConnected) {
      // A wrapper of a nested region has no parent while detached, so it goes
      // back beside the anchor comment it left (its own parent), not the host.
      const anchor = this.anchors.get(el)
      const parent: Node = anchor?.isConnected
        ? anchor.parentNode!
        : (el.parentElement ?? this.host.nativeElement)
      if (anchor?.isConnected) {
        parent.insertBefore(el, anchor)
        this.renderer.removeChild(parent, anchor)
        this.anchors.delete(el)
      } else {
        parent.appendChild(el)
      }
    } else if (!shouldAttach && el.isConnected) {
      // A placeholder comment keeps the re-insertion position stable; the
      // conformance normalizer strips comment nodes, so it never shows.
      const parent: Node = el.parentNode!
      this.anchorIn(parent, el)
      this.renderer.removeChild(parent, el)
    }
  }

  /**
   * Returns the wrapper's anchor comment in `parent`, creating (or replacing a
   * stale one) where the wrapper sits.
   *
   * @param parent - The anchor's parent.
   * @param el - The wrapper the anchor stands for.
   * @returns The connected anchor comment.
   */
  private anchorIn(parent: Node, el: Element): Comment {
    const existing = this.anchors.get(el)
    if (existing?.isConnected && existing.parentNode === parent) return existing
    if (existing) this.anchors.delete(el)
    const created = this.renderer.createComment('slot')
    parent.insertBefore(created, el.isConnected ? el : null)
    this.anchors.set(el, created)
    return created
  }
}

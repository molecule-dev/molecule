/**
 * DOM helpers for the projected capture points of the chatbot-tester
 * components.
 *
 * React renders a node prop directly and drops the element entirely when the
 * node is absent. Angular projection needs an always-mounted `<ng-content>`
 * capture point, so each capture point lives in the template unconditionally
 * and these helpers reconcile it against React's DOM: the capture point is
 * marked `data-parity-unwrap` (the snapshot expands it, so it looks like
 * React's own nodes) and is detached together with its contents when React
 * would not render it.
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
 * React's truthiness for a node value (`{node ? … : null}`), over the values
 * Angular can receive for a node-input: a template reference, a string, a
 * number, or nothing.
 *
 * @param value - The node value.
 * @returns True when React would render it.
 */
export const nodeTruthy = (value: unknown): boolean =>
  value !== undefined && value !== null && value !== false && value !== '' && value !== 0

/**
 * Reconciles one always-mounted wrapper against what React renders.
 *
 * Both operations are idempotent and anchored in the wrapper's current parent,
 * so a wrapper whose contents move with it can be detached and re-attached
 * across prop changes.
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
   * Attaches or detaches the element (its contents move with it).
   *
   * @param el - The wrapper element.
   * @param shouldAttach - Whether it should be in the DOM.
   */
  toggle(el: Element | undefined | null, shouldAttach: boolean): void {
    if (!el) return
    const parent: Node = el.parentElement ?? this.host.nativeElement
    if (shouldAttach && !el.isConnected) {
      const anchor = this.anchors.get(el)
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

/**
 * Renders a text value the way React renders a node string.
 *
 * @param value - The prop value.
 * @returns The text to render, or `''` when there is nothing.
 */
export const textOf = (value: unknown): string =>
  value === null || value === undefined ? '' : String(value)

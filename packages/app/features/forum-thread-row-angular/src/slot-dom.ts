/**
 * DOM helpers for the projected-slot wrappers of {@link ForumThreadRow}.
 *
 * React renders node props inside conditional wrappers (an
 * `{expr && <div>…}` branch). Angular projection needs always-mounted
 * `<ng-content>` capture points, so the wrappers live in the template
 * unconditionally and these helpers reconcile them against React's DOM: an
 * empty slot's wrapper is detached from its parent (an anchor comment keeps
 * its position stable for a later re-attach).
 *
 * @module
 */

import type { ElementRef, Renderer2 } from '@angular/core'

/**
 * Whether a wrapper holds projected slot content. The wrapper's own text
 * branch contributes exactly one leading text node — the interpolation, which
 * Angular creates even when the string input is empty — and Angular strips
 * whitespace-only template text between it and the `<ng-content>` capture
 * point. So any ELEMENT child, any text node after that first one, or any
 * non-empty text node at all, is projected slot content. (The adapter
 * projects slots with `ngProjectAs`, which writes no real `slot` attribute
 * into the DOM, so an attribute query cannot see the projection.)
 *
 * @param el - The wrapper element.
 * @returns True when at least one projected node exists.
 */
export const hasProjectedSlot = (el: Element | undefined | null): boolean => {
  if (!el) return false
  const nodes = Array.from(el.childNodes)
  for (const [index, node] of nodes.entries()) {
    if (index === 0 && node.nodeType === 3) continue
    if (node.nodeType === 1) return true
    if (node.nodeType === 3 && (node.textContent ?? '').trim()) return true
  }
  return false
}

/**
 * Reconciles one projected-slot wrapper against what React renders: attach
 * or detach the wrapper, whose CONTENTS move with it. Idempotent, and anchored
 * in the wrapper's current parent — for a detached wrapper, the parent of its
 * anchor comment, so a NESTED wrapper (the meta spans live in the meta `<div>`)
 * returns to its own position, never to the host.
 */
export class SlotGuard {
  private readonly anchors = new Map<Element, Comment>()

  /**
   * Creates the guard.
   *
   * @param host - The component host element (last-resort anchor parent).
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
    const anchor = this.anchors.get(el)
    const parent: Node = el.parentElement ?? anchor?.parentNode ?? this.host.nativeElement
    if (shouldAttach && !el.isConnected) {
      if (anchor?.isConnected && anchor.parentNode === parent) {
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
   * Returns the wrapper's anchor comment in `parent`, creating (or replacing
   * a stale one) where the wrapper sits.
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

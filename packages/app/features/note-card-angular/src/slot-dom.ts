/**
 * DOM helpers for the projected-slot wrappers of {@link NoteCard}.
 *
 * React renders node props either bare (no wrapper) or conditionally (an
 * `{expr && <div>…}` branch). Angular projection needs always-mounted
 * `<ng-content>` capture points, so the wrappers live in the template
 * unconditionally and these helpers reconcile them against React's DOM:
 * an empty or bare slot's wrapper is detached from the host (an anchor
 * comment keeps its position stable for a later re-attach).
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
 * Reconciles one projected-slot wrapper against what React renders.
 *
 * Three operations, all idempotent and anchored in the wrapper's current
 * parent (default: the component host):
 * - {@link SlotGuard.toggle} — attach or detach a wrapper whose CONTENTS move
 *   with it (the `<h3>`, the `<footer>`, the modified-at `<span>`);
 * - {@link SlotGuard.reveal} — move a bare slot's projected nodes out of the
 *   wrapper to the wrapper's own position and detach the wrapper (React
 *   renders `{actions}` with no wrapper element);
 * - {@link SlotGuard.hide} — detach a wrapper together with its contents
 *   (an empty capture wrapper beside a rendered footer).
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
   * Moves one slot's projected nodes out of its capture wrapper to the
   * wrapper's position and detaches the now-empty wrapper — React renders
   * the slot bare.
   *
   * @param el - The capture wrapper.
   */
  reveal(el: Element | undefined | null): void {
    if (!el) return
    const parent: Node = el.parentElement ?? this.host.nativeElement
    const anchor = this.anchorIn(parent, el)
    for (const node of Array.from(el.childNodes)) parent.insertBefore(node, anchor)
    if (el.isConnected) this.renderer.removeChild(parent, el)
  }

  /**
   * Detaches the wrapper together with its contents — React dropped them.
   *
   * @param el - The capture wrapper.
   */
  hide(el: Element | undefined | null): void {
    if (!el) return
    const parent: Node = el.parentElement ?? this.host.nativeElement
    this.anchorIn(parent, el)
    if (el.isConnected) this.renderer.removeChild(parent, el)
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

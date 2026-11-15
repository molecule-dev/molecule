/**
 * DOM helpers for the projected-slot wrappers of the medication row.
 *
 * React renders the dosage, form, instructions, prescriber and actions
 * wrappers conditionally (`{expr && <span>…}`). Angular projection needs
 * always-mounted `<ng-content>` capture points, so the wrappers live in the
 * template unconditionally and {@link SlotGuard.toggle} reconciles them
 * against React's DOM: a wrapper with nothing to show is detached (an anchor
 * comment keeps its position stable for a later re-attach when a later props
 * step fills it).
 *
 * @module
 */

import type { ElementRef, Renderer2 } from '@angular/core'

/**
 * Whether a wrapper holds any element or non-whitespace text node — the input
 * text the template rendered, or the projected slot content.
 *
 * @param el - The wrapper element.
 * @returns True when at least one rendered node exists.
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
 * Counts the nodes a wrapper renders that the DOM serialization shows: an
 * element, or a text node with non-whitespace content (comment anchors the
 * template inserts for its control-flow blocks are ignored).
 *
 * @param el - The wrapper element.
 * @returns The rendered node count.
 */
export const renderedNodeCount = (el: Element | undefined | null): number => {
  if (!el) return 0
  let count = 0
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === 1) count += 1
    else if (node.nodeType === 3 && (node.textContent ?? '').trim()) count += 1
  }
  return count
}

/**
 * Whether a wrapper holds projected content beyond the static nodes its
 * template renders (a label interpolation, an input's text): the rendered node
 * count is larger than `staticCount`.
 *
 * @param el - The wrapper element.
 * @param staticCount - The rendered nodes the template itself produces.
 * @returns True when projected content follows the static nodes.
 */
export const hasProjectedNodes = (el: Element | undefined | null, staticCount: number): boolean =>
  renderedNodeCount(el) > staticCount

/**
 * Attaches or detaches one projected-slot element against what React renders.
 * Idempotent, anchored in the element's current parent (default: the component
 * host); the contents move with the element.
 */
export class SlotGuard {
  private readonly anchors = new Map<Element, Comment>()
  /** Where each detached element belongs: its parent when it was last attached. */
  private readonly homes = new Map<Element, Node>()

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
   * Attaches or detaches the element (contents move with it). A detached
   * element re-attaches to the parent it had when it was last attached — not
   * to the host: a detached wrapper has no `parentElement`, and React's DOM
   * keeps its position inside the component tree.
   *
   * @param el - The element.
   * @param shouldAttach - Whether it should be in the DOM.
   */
  toggle(el: Element | undefined | null, shouldAttach: boolean): void {
    if (!el) return
    if (el.parentElement) this.homes.set(el, el.parentElement)
    const parent: Node = this.homes.get(el) ?? el.parentElement ?? this.host.nativeElement
    if (shouldAttach && !el.isConnected) {
      const anchor = this.anchors.get(el)
      if (anchor?.isConnected && anchor.parentNode === parent) {
        parent.insertBefore(el, anchor)
        this.renderer.removeChild(parent, anchor)
        this.anchors.delete(el)
      } else {
        if (anchor?.isConnected) this.renderer.removeChild(anchor.parentNode!, anchor)
        this.anchors.delete(el)
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
   * Returns the element's anchor comment in `parent`, creating (or replacing a
   * stale one) where the element sits.
   *
   * @param parent - The anchor's parent.
   * @param el - The element the anchor stands for.
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

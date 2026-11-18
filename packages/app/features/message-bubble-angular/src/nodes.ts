/**
 * DOM helpers shared by the Angular message primitives, not part of the public
 * surface: a node-valued prop's shape test, its text rendering, and the
 * capture-point guard the list uses for React's empty-state branch.
 *
 * @module
 */

import type { ElementRef, Renderer2, TemplateRef } from '@angular/core'

/**
 * Whether a node-valued prop is an Angular template rather than plain text.
 * Checked structurally — `TemplateRef` is a type-only import in the emitted
 * metadata, so `instanceof` is not dependable across bundles.
 *
 * @param value - The prop value.
 * @returns True when it can be rendered with `ngTemplateOutlet`.
 */
export const isTemplate = (value: unknown): value is TemplateRef<unknown> =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as TemplateRef<unknown>).createEmbeddedView === 'function'

/**
 * Renders a text value the way React renders a node string.
 *
 * @param value - The prop value.
 * @returns The text to render, or `''` when there is nothing.
 */
export const textOf = (value: unknown): string =>
  value === null || value === undefined ? '' : String(value)

/**
 * Whether a value renders text (React renders strings and numbers as text; a
 * template renders through its outlet instead).
 *
 * @param value - The prop value.
 * @returns True when the value is plain text.
 */
export const hasText = (value: unknown): boolean =>
  typeof value === 'string' || typeof value === 'number'

/**
 * Whether a value renders anything at all: text, a template, or a node.
 *
 * @param value - The prop value.
 * @returns True when React would render the value.
 */
export const hasNode = (value: unknown): boolean =>
  value !== null && value !== undefined && value !== false

/**
 * Whether an `ng-content` capture point received any element or text node.
 *
 * @param el - The capture point.
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
 * Reconciles one always-mounted wrapper against what React renders, attaching
 * or detaching it (its contents move with it). Both operations are idempotent
 * and anchored in the wrapper's current parent (default: the component host).
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
   * Attaches or detaches the element.
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
      // Placeholder comment keeps the re-insertion position stable; the
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

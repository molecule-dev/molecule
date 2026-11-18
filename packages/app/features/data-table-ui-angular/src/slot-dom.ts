/**
 * DOM helpers shared by the Angular data-table components: node-prop
 * detection, text rendering, projected-content presence, and keeping a
 * template element in the DOM exactly while React renders it.
 *
 * @module
 */

import type { Renderer2, TemplateRef } from '@angular/core'

/**
 * Whether a node-valued prop is an Angular template (a projected node) rather
 * than plain text. Checked structurally — `TemplateRef` is a type-only import
 * in the emitted metadata, so `instanceof` is not dependable across bundles.
 *
 * @param value - The prop value.
 * @returns True when it can be rendered with `ngTemplateOutlet`.
 */
export const isTemplate = (value: unknown): value is TemplateRef<unknown> =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as TemplateRef<unknown>).createEmbeddedView === 'function'

/**
 * The prop value as a template, when the caller passed a node.
 *
 * @param value - The prop value.
 * @returns The template, or null for text or nothing.
 */
export const templateOf = (value: unknown): TemplateRef<unknown> | null =>
  isTemplate(value) ? value : null

/**
 * Renders a value the way React renders a node string.
 *
 * @param value - The prop value.
 * @returns The text to render, or `''` when there is nothing.
 */
export const textOf = (value: unknown): string =>
  value === null || value === undefined ? '' : String(value)

/**
 * Whether an element holds anything that renders (projected content or text),
 * ignoring the template's own whitespace and Angular's anchor comments.
 *
 * @param el - The element, or undefined before the view resolves.
 * @returns True when the element renders content.
 */
export const hasContent = (el: Element | undefined | null): boolean => {
  if (!el) return false
  return Array.from(el.childNodes).some(
    (node) =>
      node.nodeType === Node.ELEMENT_NODE ||
      ((node.nodeType === Node.TEXT_NODE || node.nodeType === Node.CDATA_SECTION_NODE) &&
        (node.textContent ?? '').trim() !== ''),
  )
}

/** Where a withheld element came from. */
interface DetachedAt {
  /** The parent it is restored into. */
  parent: Node
  /** The sibling it is restored before (`null`: last child). */
  anchor: Node | null
}

/**
 * Keeps one template element in the DOM exactly while React renders it.
 *
 * React renders a wrapper element only when its content exists (the title row
 * when there is a title or an action, the actions cell when there are actions).
 * Angular has no way to select projected content, so each wrapper stays in the
 * template and this helper detaches it — projected content travels with it —
 * while React renders nothing, restoring it at the same position when content
 * appears.
 */
export class ConditionalElement {
  private readonly detached = new Map<Element, DetachedAt>()

  /**
   * Creates the helper.
   *
   * @param renderer - The DOM renderer.
   */
  constructor(private readonly renderer: Renderer2) {}

  /**
   * Shows or withholds one element.
   *
   * @param el - The element (undefined before the view resolves).
   * @param shouldShow - Whether React renders it.
   */
  sync(el: Element | undefined | null, shouldShow: boolean): void {
    if (!el) return
    if (shouldShow) {
      const at = this.detached.get(el)
      if (!at) return
      at.parent.insertBefore(el, at.anchor)
      this.detached.delete(el)
      return
    }
    if (!el.isConnected) return
    const parent = el.parentNode
    if (!parent) return
    this.detached.set(el, { parent, anchor: el.nextSibling })
    this.renderer.removeChild(parent, el)
  }
}

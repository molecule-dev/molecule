/**
 * DOM helpers for the projected content of the Angular faceted-search
 * primitives. Not part of the package's public surface.
 *
 * React renders a node prop or its children bare, and renders the filter pill's
 * panel `<div>` only while it is open. Angular content projection needs an
 * always-mounted `<ng-content>` capture point, so the panel renders as an
 * always-mounted wrapper that these helpers attach and detach to match React's
 * DOM.
 *
 * @module
 */

import type { TemplateRef } from '@angular/core'

/**
 * Whether a node-valued prop is an Angular template (a `{ $nodes }` value)
 * rather than plain text. Checked structurally — `TemplateRef` is a type-only
 * import in the emitted metadata, so `instanceof` is not dependable across
 * bundles.
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
 * Whether an `<ng-content>` wrapper captured any element or text node.
 *
 * @param el - The wrapper element.
 * @returns True when at least one projected node exists.
 */
export const hasNodes = (el: Element | undefined | null): boolean => {
  if (!el) return false
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === Node.ELEMENT_NODE) return true
    if (node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim()) return true
  }
  return false
}

/** Where a detached wrapper goes back: the parent it was attached to. */
export interface AttachedState {
  /** The wrapper's parent element, remembered when it is detached. */
  parent: Node | null
}

/**
 * Attaches or detaches a wrapper whose position is its parent's end, as React
 * renders a `{expr && <element>…}` branch: the wrapper is appended when it
 * comes back.
 *
 * @param el - The wrapper element.
 * @param shouldShow - Whether React would have it in the DOM.
 * @param state - The wrapper's remembered parent.
 */
export const setAttached = (
  el: Element | undefined | null,
  shouldShow: boolean,
  state: AttachedState,
): void => {
  if (!el) return
  if (shouldShow) {
    if (!el.isConnected && state.parent) state.parent.appendChild(el)
  } else if (el.isConnected) {
    state.parent = el.parentNode
    el.parentNode?.removeChild(el)
  }
}

/**
 * Helpers for the settings-page scaffold's optional, projected-slot regions.
 *
 * React renders those regions conditionally (`{node && <p>…</p>}`). Angular
 * projection needs an always-mounted `<ng-content>` capture point, so the
 * regions render optimistically and withdraw themselves when nothing landed —
 * the same approach the framework's other feature ports use.
 *
 * @module
 */

import type { TemplateRef } from '@angular/core'

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
 * Whether a value renders as text (React renders strings and numbers, and
 * nothing for `null` / `undefined` / booleans).
 *
 * @param value - The prop value.
 * @returns True when the value renders as text.
 */
export const isText = (value: unknown): boolean =>
  typeof value === 'string' || typeof value === 'number'

/**
 * Whether an optional node prop renders — React's `{node && …}` truthiness for
 * a string or number value.
 *
 * @param value - The prop value.
 * @returns True when the value is truthy text.
 */
export const hasText = (value: unknown): boolean =>
  typeof value === 'string' ? value !== '' : typeof value === 'number' && value !== 0

/**
 * Whether a node renders anything (an element, or text with content beyond
 * whitespace).
 *
 * @param node - The node.
 * @returns True when it renders.
 */
const hasRenderable = (node: Node): boolean =>
  node.nodeType === Node.ELEMENT_NODE ||
  (node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim().length > 0)

/**
 * Whether an element carries renderable content (a projected slot landed, or
 * its text input rendered).
 *
 * @param el - The element.
 * @returns True when its children render anything.
 */
export const hasRenderableContent = (el: HTMLElement | undefined | null): boolean =>
  el ? Array.from(el.childNodes).some(hasRenderable) : false

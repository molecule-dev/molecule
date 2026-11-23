/**
 * Helpers for the settings-page scaffold's optional, projected-slot regions.
 *
 * React renders those regions conditionally (`{node && <p>…</p>}`). Angular
 * projection needs an always-mounted `<ng-content>` capture point, so the
 * regions stay in the template and the placement function takes them out of the
 * page while nothing renders in them — the same approach the framework's other
 * feature ports use.
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

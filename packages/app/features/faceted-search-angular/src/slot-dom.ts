/**
 * Node-prop helpers for the projected content of the Angular faceted-search
 * primitives. Not part of the package's public surface: they detect a
 * `TemplateRef` and render a text value the way React renders a node.
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

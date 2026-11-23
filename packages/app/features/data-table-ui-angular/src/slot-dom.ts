/**
 * Node-prop helpers shared by the Angular data-table components: node-prop
 * detection and text rendering.
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

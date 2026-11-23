/**
 * DOM helpers shared by the Angular message primitives, not part of the public
 * surface: a node-valued prop's shape test and its text rendering.
 *
 * @module
 */

import type { TemplateRef } from '@angular/core'

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

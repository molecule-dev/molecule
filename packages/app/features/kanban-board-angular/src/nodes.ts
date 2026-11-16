/**
 * Node-or-text helpers for the Angular Kanban primitives: a field React
 * renders as a `ReactNode` arrives here as a template reference or text.
 *
 * @module
 */

import { TemplateRef } from '@angular/core'

/**
 * Whether a field renders through `NgTemplateOutlet` rather than as text.
 *
 * @param value - The field.
 * @returns True when it is a template reference.
 */
export function isTemplate(value: unknown): value is TemplateRef<unknown> {
  return value instanceof TemplateRef
}

/**
 * The text a field renders (React renders strings and numbers as text).
 *
 * @param value - The field.
 * @returns The text, or `''` for an absent or template value.
 */
export function textOf(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : ''
}

/**
 * Narrows a template-or-text field to a `TemplateRef`, for `[ngTemplateOutlet]`.
 *
 * @param value - The field.
 * @returns The template reference, or null.
 */
export function templateOf(value: unknown): TemplateRef<unknown> | null {
  return isTemplate(value) ? value : null
}

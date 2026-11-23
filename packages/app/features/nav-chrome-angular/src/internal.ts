/**
 * Internal node helpers for `@molecule/app-nav-chrome-angular`. Not exported
 * from the package barrel.
 *
 * @module
 */

import type { TemplateRef } from '@angular/core'

/**
 * Whether a value is a node template — a node-valued prop's Angular
 * representation. Checked structurally: `TemplateRef` is a type-only import
 * here, so the check survives any bundler.
 *
 * @param value - The prop value.
 * @returns True for a template ref.
 */
export const isNodeTemplate = (value: unknown): value is TemplateRef<unknown> =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as TemplateRef<unknown>).createEmbeddedView === 'function'

/**
 * Whether a node value renders as plain text (React renders `{value}`).
 *
 * @param value - The prop value.
 * @returns True when the value interpolates as text.
 */
export const hasText = (value: unknown): boolean =>
  value !== undefined && value !== null && value !== false && value !== '' && !isNodeTemplate(value)

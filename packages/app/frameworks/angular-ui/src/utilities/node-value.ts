/**
 * Node-valued prop handling: the adapter projects node values either as
 * `TemplateRef` inputs (inside data props like `items[0].header`) or as
 * projected `[slot=…]` content; plain strings render as text.
 *
 * @module
 */

import { TemplateRef } from '@angular/core'

/**
 * Whether a node-valued prop arrived as a TemplateRef.
 *
 * @param value - The prop value.
 * @returns The TemplateRef, or null for any other value.
 */
export function asTemplate(value: unknown): TemplateRef<unknown> | null {
  return value instanceof TemplateRef ? value : null
}

/**
 * Renders a plain-string (or numeric) node value (React renders both as text).
 *
 * @param value - The prop value.
 * @returns The text, or empty.
 */
export function nodeText(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  return ''
}

/**
 * Whether a node-valued prop was passed at all (presence check for
 * conditional wrappers).
 *
 * @param value - The prop value.
 * @returns True when given.
 */
export function isGiven(value: unknown): boolean {
  return value !== undefined && value !== null
}

/**
 * Whether a node-valued prop renders anything: React's `slot(node) !== undefined` for the values
 * an Angular input carries (not `null`, `undefined`, a boolean or `''`; a template counts).
 *
 * @param value - The prop value.
 * @returns True when it renders something.
 */
export function rendersNode(value: unknown): boolean {
  return isGiven(value) && typeof value !== 'boolean' && value !== ''
}

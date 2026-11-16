/**
 * Node-or-text helpers for the Svelte Kanban primitives: a data field React
 * renders as a `ReactNode` arrives here as a snippet or plain text.
 *
 * @module
 */

import type { Snippet } from 'svelte'

/**
 * Whether a field renders as a snippet rather than plain text.
 *
 * @param value - The field.
 * @returns True when it renders as a snippet.
 */
export function isSnippet(value: unknown): value is Snippet {
  return typeof value === 'function'
}

/**
 * The text a field renders (React renders strings and numbers as text).
 *
 * @param value - The field.
 * @returns The text, or `''` for an absent or snippet value.
 */
export function textOf(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : ''
}

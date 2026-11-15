/**
 * Types for the Svelte inline-edit field, the same props
 * `@molecule/app-inline-edit-react` accepts.
 *
 * @module
 */

import type { Snippet } from 'svelte'

/** Props accepted by the {@link InlineEdit} component. */
export interface InlineEditProps {
  /** Current value. */
  value: string
  /** Called when the user commits a new value. Return a Promise to block the UI while saving. */
  onSubmit: (next: string) => void | Promise<void>
  /** Render mode for the editor. */
  variant?: 'input' | 'textarea'
  /** Renderer for the read state — a snippet receiving the value; defaults to plain text. */
  renderRead?: Snippet<[string]>
  /** Placeholder when value is empty. */
  placeholder?: string
  /** Extra classes. */
  className?: string
}

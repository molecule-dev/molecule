/**
 * Types for the Solid inline-edit field, the same props
 * `@molecule/app-inline-edit-react` accepts.
 *
 * @module
 */

import type { JSX } from 'solid-js'

/** Props accepted by the {@link InlineEdit} component. */
export interface InlineEditProps {
  /** Current value. */
  value: string
  /** Called when the user commits a new value. Return a Promise to block the UI while saving. */
  onSubmit: (next: string) => void | Promise<void>
  /** Render mode for the editor. */
  variant?: 'input' | 'textarea'
  /** Renderer for the read state — defaults to plain text. */
  renderRead?: (value: string) => JSX.Element
  /**
   * Placeholder when value is empty. Also becomes the editor field's
   * accessible label while editing; without it the field falls back to the
   * translated `inlineEdit.aria.edit` default.
   */
  placeholder?: string
  /** Extra classes. */
  className?: string
}

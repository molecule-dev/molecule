/**
 * Types of `@molecule/app-inline-edit-angular` — the Angular counterpart of
 * `@molecule/app-inline-edit-react`, same props and DOM.
 *
 * @module
 */

import type { TemplateRef } from '@angular/core'

/** Props accepted by {@link InlineEdit} — the same props React's `InlineEdit` accepts. */
export interface InlineEditProps {
  /** Current value. */
  value: string
  /** Called when the user commits a new value. Return a Promise to block the UI while saving. */
  onSubmit: (next: string) => void | Promise<void>
  /** Render mode for the editor. */
  variant?: 'input' | 'textarea'
  /** Renderer for the read state — an `ng-template` receiving the value as `$implicit` / `a0`. */
  renderRead?: TemplateRef<unknown> | null
  /**
   * Placeholder when value is empty. Also becomes the editor field's
   * accessible label while editing; without it the field falls back to the
   * translated `inlineEdit.aria.edit` default.
   */
  placeholder?: string
  /** Extra classes. */
  className?: string
}

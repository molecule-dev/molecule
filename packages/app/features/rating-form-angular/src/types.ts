/**
 * Types of `@molecule/app-rating-form-angular` — the Angular counterpart of
 * `@molecule/app-rating-form-react`, same props and DOM.
 *
 * @module
 */

import type { TemplateRef } from '@angular/core'

/**
 * Props accepted by {@link RatingForm} — the same props
 * `@molecule/app-rating-form-react` accepts. Node-valued props (`title`,
 * `submitLabel`) are `TemplateRef`s (or plain strings/numbers) in Angular.
 */
export interface RatingFormProps {
  /** Called with the submitted rating + optional comment. */
  onSubmit: (rating: number, comment: string) => void | Promise<void>
  /** Maximum stars. Defaults to 5. */
  max?: number
  /** Initial rating (uncontrolled). */
  defaultRating?: number
  /** Whether a comment is required. Defaults to false. */
  requireComment?: boolean
  /** Form heading: text or a template. */
  title?: TemplateRef<unknown> | string | number | null
  /** Comment placeholder. */
  commentPlaceholder?: string
  /** Submit-button label: text or a template. */
  submitLabel?: TemplateRef<unknown> | string | number | null
  /** Extra classes. */
  className?: string
}

/**
 * Types for the Solid star-rating + comment form.
 *
 * @module
 */

import type { JSX } from 'solid-js'

/**
 * Props accepted by {@link RatingForm} — the same props (React names) as
 * `@molecule/app-rating-form-react`, with node-valued props as Solid JSX.
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
  /** Form heading. */
  title?: JSX.Element
  /** Comment placeholder. */
  commentPlaceholder?: string
  /** Submit-button label. */
  submitLabel?: JSX.Element
  /** Extra classes. */
  className?: string
}

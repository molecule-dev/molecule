/**
 * Types for the Vue star-rating + comment form.
 *
 * @module
 */

import type { VNodeChild } from 'vue'

/**
 * Props accepted by {@link RatingForm} — the same props (React names) as
 * `@molecule/app-rating-form-react`, with node-valued props as Vue nodes.
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
  /** Form heading. Passed as a prop or as the same-named slot. */
  title?: VNodeChild
  /** Comment placeholder. */
  commentPlaceholder?: string
  /** Submit-button label. Passed as a prop or as the same-named slot. */
  submitLabel?: VNodeChild
  /** Extra classes. */
  className?: string
}

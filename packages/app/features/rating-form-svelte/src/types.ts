/**
 * Types for the Svelte star-rating + comment form.
 *
 * @module
 */

import type { Snippet } from 'svelte'

/**
 * Props accepted by {@link RatingForm} — the same props (React names) as
 * `@molecule/app-rating-form-react`, with node-valued props as snippets (or
 * plain strings).
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
  /** Form heading — a snippet or a plain string. */
  title?: Snippet | string
  /** Comment placeholder. */
  commentPlaceholder?: string
  /** Submit-button label — a snippet or a plain string. */
  submitLabel?: Snippet | string
  /** Extra classes. */
  className?: string
}

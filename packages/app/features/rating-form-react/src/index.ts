/**
 * Interactive star-rating + comment form.
 *
 * Exports `<RatingForm>`.
 *
 * @example
 * ```tsx
 * import { RatingForm } from '@molecule/app-rating-form-react'
 *
 * <RatingForm
 *   title="Leave a review"
 *   onSubmit={async (rating, comment) => {
 *     await submitReview({ rating, comment })
 *   }}
 *   requireComment={false}
 *   submitLabel="Submit review"
 * />
 * ```
 * @module
 */

export * from './RatingForm.js'

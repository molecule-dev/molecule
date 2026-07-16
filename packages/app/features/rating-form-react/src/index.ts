/**
 * Interactive star-rating + comment form.
 *
 * Exports `<RatingForm>`.
 *
 * @example
 * ```tsx
 * import { RatingForm } from '@molecule/app-rating-form-react'
 *
 * const submitReview = async (review: { rating: number; comment: string }): Promise<void> => {
 *   await fetch('/api/reviews', { method: 'POST', body: JSON.stringify(review) })
 * }
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
 *
 * @remarks
 * Companion locale bond: `@molecule/app-locales-rating-form`. The submit button
 * stays disabled until a star rating is selected, and `requireComment` blocks
 * submission on blank comments silently (no inline error is rendered). Rejected
 * `onSubmit` promises propagate — handle errors in your handler. Requires the
 * app-react i18n provider and a wired ClassMap bond.
 *
 * @module
 */

export * from './RatingForm.js'

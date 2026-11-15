/**
 * Solid interactive star-rating + comment form.
 *
 * Exports `RatingForm` — a star radiogroup, a comment textarea and a submit
 * button. It is the Solid counterpart of `@molecule/app-rating-form-react`:
 * same props (React names) and the same DOM for the same input.
 *
 * @example
 * ```tsx
 * import { RatingForm } from '@molecule/app-rating-form-solid'
 *
 * declare const api: { submitReview: (review: { rating: number; comment: string }) => Promise<void> }
 *
 * export function Review() {
 *   return (
 *     <RatingForm
 *       title="Leave a review"
 *       onSubmit={async (rating, comment) => {
 *         await api.submitReview({ rating, comment })
 *       }}
 *       requireComment={false}
 *       submitLabel="Submit review"
 *     />
 *   )
 * }
 * ```
 *
 * @remarks
 * Companion locale bond: `@molecule/app-locales-rating-form`. The submit button
 * stays disabled until a star rating is selected, and `requireComment` blocks
 * submission on blank comments silently (no inline error is rendered). Rejected
 * `onSubmit` promises propagate — handle errors in your handler. Requires a
 * bonded ClassMap and `@molecule/app-solid`'s i18n provider above it.
 *
 * @module
 */

export * from './RatingForm.jsx'
export * from './types.js'

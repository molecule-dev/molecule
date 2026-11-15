/**
 * Vue interactive star-rating + comment form.
 *
 * Exports `<RatingForm>` — a star radiogroup, a comment textarea and a submit
 * button. It is the Vue counterpart of `@molecule/app-rating-form-react`: same
 * props (React names) and the same DOM for the same input.
 *
 * @example
 * ```ts
 * import { defineComponent, h } from 'vue'
 * import { RatingForm } from '@molecule/app-rating-form-vue'
 *
 * const submitReview = async (review: { rating: number; comment: string }): Promise<void> => {
 *   await fetch('/api/reviews', { method: 'POST', body: JSON.stringify(review) })
 * }
 *
 * const Review = defineComponent({
 *   setup() {
 *     return () =>
 *       h(RatingForm, {
 *         title: 'Leave a review',
 *         onSubmit: async (rating: number, comment: string) => {
 *           await submitReview({ rating, comment })
 *         },
 *         requireComment: false,
 *         submitLabel: 'Submit review',
 *       })
 *   },
 * })
 * ```
 *
 * @remarks
 * Companion locale bond: `@molecule/app-locales-rating-form`. The submit button
 * stays disabled until a star rating is selected, and `requireComment` blocks
 * submission on blank comments silently (no inline error is rendered). Rejected
 * `onSubmit` promises propagate — handle errors in your handler. Requires a
 * bonded ClassMap and the Vue binding's i18n provider above it.
 *
 * @module
 */

export * from './RatingForm.js'
export * from './types.js'

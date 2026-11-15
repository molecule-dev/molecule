/**
 * Svelte interactive star-rating + comment form.
 *
 * Exports `RatingForm` — a star radiogroup, a comment textarea and a submit
 * button. It is the Svelte counterpart of `@molecule/app-rating-form-react`:
 * same props (React names) and the same DOM for the same input.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { RatingForm } from '@molecule/app-rating-form-svelte'
 *
 *   async function submitReview(rating: number, comment: string): Promise<void> {
 *     await fetch('/api/reviews', { method: 'POST', body: JSON.stringify({ rating, comment }) })
 *   }
 * </script>
 *
 * <RatingForm
 *   title="Leave a review"
 *   onSubmit={submitReview}
 *   requireComment={false}
 *   submitLabel="Submit review"
 * />
 * ```
 *
 * @remarks
 * Companion locale bond: `@molecule/app-locales-rating-form`. The submit button
 * stays disabled until a star rating is selected, and `requireComment` blocks
 * submission on blank comments silently (no inline error is rendered). Rejected
 * `onSubmit` promises propagate — handle errors in your handler. Requires a
 * bonded ClassMap and `@molecule/app-svelte`'s i18n provider above it.
 *
 * @module
 */

export * from './components.js'
export * from './types.js'

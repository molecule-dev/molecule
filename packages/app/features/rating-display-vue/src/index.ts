/**
 * Vue star-rating display.
 *
 * Exports `RatingDisplay` — fractional star rendering (inline SVG), optional
 * review count tail, optional interactive mode via `onChange`. It is the Vue
 * counterpart of `@molecule/app-rating-display-react`: same props (React
 * names), same DOM for the same input.
 *
 * @example
 * ```ts
 * import { createApp, defineComponent, h, ref } from 'vue'
 * import { RatingDisplay } from '@molecule/app-rating-display-vue'
 *
 * const scrollToReviews = (): void => {
 *   document.getElementById('reviews')?.scrollIntoView()
 * }
 *
 * const ProductRating = defineComponent({
 *   setup() {
 *     const rating = ref(0)
 *     return () =>
 *       h('div', [
 *         // First: read-only with review count. Second: interactive — user picks a rating.
 *         h(RatingDisplay, { value: 4.5, reviewCount: 128, onReviewsClick: scrollToReviews }),
 *         h(RatingDisplay, {
 *           value: rating.value,
 *           size: 'lg',
 *           onChange: (v: number) => {
 *             rating.value = v
 *           },
 *         }),
 *       ])
 *   },
 * })
 *
 * createApp(ProductRating).mount('#app')
 * ```
 *
 * @remarks
 * Stars are inline SVG filled with `currentColor` — set a text color on the
 * wrapper (e.g. a warning/amber token) to tint them; unfilled portions render
 * at 25% opacity of the same color. Accessible labels are translated through
 * `useTranslation()`, matching the React package and following a locale switch:
 * the container label (`ratingDisplay.aria.rating`, overridable via `ariaLabel`)
 * and the per-star "Rate N of M" button labels in interactive mode
 * (`ratingDisplay.aria.rate`). Requires a wired ClassMap bond.
 *
 * @module
 */

export * from './RatingDisplay.js'
export * from './types.js'

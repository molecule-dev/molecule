/**
 * Svelte star-rating display.
 *
 * Exports `RatingDisplay` — fractional star rendering (inline SVG), optional
 * review count tail, optional interactive mode via `onChange`. It is the
 * Svelte counterpart of `@molecule/app-rating-display-react`: same props
 * (React names), same DOM for the same input.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { RatingDisplay } from '@molecule/app-rating-display-svelte'
 *
 *   let rating = $state(0)
 *   const scrollToReviews = (): void => {
 *     document.getElementById('reviews')?.scrollIntoView()
 *   }
 * </script>
 *
 * <!-- Read-only with review count, then interactive: the user picks a rating. -->
 * <RatingDisplay value={4.5} reviewCount={128} onReviewsClick={scrollToReviews} />
 * <RatingDisplay value={rating} size="lg" onChange={(v) => (rating = v)} />
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

export * from './components.js'
export * from './types.js'

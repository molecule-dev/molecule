/**
 * Solid star-rating display.
 *
 * Exports `RatingDisplay` — fractional star rendering (inline SVG), optional
 * review count tail, optional interactive mode via `onChange`. It is the
 * Solid counterpart of `@molecule/app-rating-display-react`: same props
 * (React names), same DOM for the same input.
 *
 * @example
 * ```tsx
 * import { createSignal } from 'solid-js'
 * import { RatingDisplay } from '@molecule/app-rating-display-solid'
 *
 * export function ProductRating() {
 *   const [rating, setRating] = createSignal(0)
 *   const scrollToReviews = (): void => {
 *     document.getElementById('reviews')?.scrollIntoView()
 *   }
 *   // First: read-only with review count. Second: interactive — user picks a rating.
 *   return (
 *     <>
 *       <RatingDisplay value={4.5} reviewCount={128} onReviewsClick={scrollToReviews} />
 *       <RatingDisplay value={rating()} size="lg" onChange={(v) => setRating(v)} />
 *     </>
 *   )
 * }
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

export * from './RatingDisplay.jsx'
export * from './types.js'

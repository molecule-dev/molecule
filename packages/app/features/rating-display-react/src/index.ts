/**
 * React star-rating display.
 *
 * Exports `<RatingDisplay>` — fractional star rendering (inline SVG),
 * optional review count tail, optional interactive mode via `onChange`.
 *
 * @example
 * ```tsx
 * import { useState } from 'react'
 * import { RatingDisplay } from '@molecule/app-rating-display-react'
 *
 * function ProductRating() {
 *   const [rating, setRating] = useState(0)
 *   const scrollToReviews = (): void => {
 *     document.getElementById('reviews')?.scrollIntoView()
 *   }
 *   // First: read-only with review count. Second: interactive — user picks a rating.
 *   return (
 *     <>
 *       <RatingDisplay value={4.5} reviewCount={128} onReviewsClick={scrollToReviews} />
 *       <RatingDisplay value={rating} size="lg" onChange={(v) => setRating(v)} />
 *     </>
 *   )
 * }
 * ```
 *
 * @remarks
 * Stars are inline SVG filled with `currentColor` — set a text color on the
 * wrapper (e.g. a warning/amber token) to tint them; unfilled portions render
 * at 25% opacity of the same color. Accessibility labels are English defaults:
 * the container label is overridable via `ariaLabel`, but the per-star "Rate N
 * of M" button labels in interactive mode are not — this package has no locale
 * bond. Requires a wired ClassMap bond.
 *
 * @module
 */

export * from './RatingDisplay.js'

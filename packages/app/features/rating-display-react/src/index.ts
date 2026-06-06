/**
 * React star-rating display.
 *
 * Exports `<RatingDisplay>` — fractional star rendering (inline SVG),
 * optional review count tail, optional interactive mode via `onChange`.
 *
 * @example
 * ```tsx
 * import { RatingDisplay } from '@molecule/app-rating-display-react'
 *
 * // Read-only with review count
 * <RatingDisplay value={4.5} reviewCount={128} onReviewsClick={() => scrollToReviews()} />
 *
 * // Interactive — user picks a rating
 * <RatingDisplay value={rating} size="lg" onChange={(v) => setRating(v)} />
 * ```
 * @module
 */

export * from './RatingDisplay.js'

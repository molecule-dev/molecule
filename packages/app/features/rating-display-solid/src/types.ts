/**
 * Types of `@molecule/app-rating-display-solid` — the Solid counterpart of
 * `@molecule/app-rating-display-react`: the same props (React names) and the
 * same DOM for the same input.
 *
 * @module
 */

/** Props for {@link RatingDisplay}. */
export interface RatingDisplayProps {
  /** Rating value (0–max). Fractional supported. */
  value: number
  /** Maximum rating. Defaults to 5. */
  max?: number
  /** Optional review count shown after the stars. */
  reviewCount?: number
  /**
   * Called when the review-count is clicked (renders it as a button). React
   * passes the click event, so this receives it too.
   */
  onReviewsClick?: (event?: MouseEvent) => void
  /** Size preset. */
  size?: 'sm' | 'md' | 'lg'
  /** Interactive mode — star clicks call `onChange(starIndex + 1)`. */
  onChange?: (value: number) => void
  /** Accessible label override. */
  ariaLabel?: string
  /** Extra classes. */
  className?: string
}

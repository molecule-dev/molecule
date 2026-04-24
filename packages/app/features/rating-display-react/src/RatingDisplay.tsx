import { getClassMap } from '@molecule/app-ui'

interface RatingDisplayProps {
  /** Rating value (0–max). Fractional supported. */
  value: number
  /** Maximum rating. Defaults to 5. */
  max?: number
  /** Optional review count shown after the stars. */
  reviewCount?: number
  /** Called when the review-count is clicked (renders it as a button). */
  onReviewsClick?: () => void
  /** Size preset. */
  size?: 'sm' | 'md' | 'lg'
  /** Interactive mode — star clicks call `onChange(starIndex + 1)`. */
  onChange?: (value: number) => void
  /** Accessible label override. */
  ariaLabel?: string
  /** Extra classes. */
  className?: string
}

const SIZE_PX = { sm: 12, md: 16, lg: 20 } as const

/**
 *
 * @param root0
 * @param root0.fill
 * @param root0.size
 */
function Star({ fill, size }: { fill: number; size: number }) {
  const path =
    'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'
  const id = `star-grad-${Math.random().toString(36).slice(2, 9)}`
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <defs>
        <linearGradient id={id}>
          <stop offset={`${fill * 100}%`} stopColor="currentColor" />
          <stop offset={`${fill * 100}%`} stopColor="currentColor" stopOpacity={0.25} />
        </linearGradient>
      </defs>
      <path d={path} fill={`url(#${id})`} />
    </svg>
  )
}

/**
 * Star-rating display supporting fractional values and an optional
 * review-count tail. When `onChange` is provided each star becomes an
 * interactive button.
 *
 * Uses inline SVG stars so the component works without icon-font fallback.
 * @param root0
 * @param root0.value
 * @param root0.max
 * @param root0.reviewCount
 * @param root0.onReviewsClick
 * @param root0.size
 * @param root0.onChange
 * @param root0.ariaLabel
 * @param root0.className
 */
export function RatingDisplay({
  value,
  max = 5,
  reviewCount,
  onReviewsClick,
  size = 'md',
  onChange,
  ariaLabel,
  className,
}: RatingDisplayProps) {
  const cm = getClassMap()
  const px = SIZE_PX[size]
  const stars = Array.from({ length: max }, (_, i) => {
    const fill = Math.max(0, Math.min(1, value - i))
    return { i, fill }
  })
  return (
    <span
      className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), className)}
      role="img"
      aria-label={ariaLabel ?? `Rating: ${value} of ${max}`}
    >
      {stars.map(({ i, fill }) =>
        onChange ? (
          <button
            key={i}
            type="button"
            onClick={() => onChange(i + 1)}
            aria-label={`Rate ${i + 1} of ${max}`}
          >
            <Star fill={fill} size={px} />
          </button>
        ) : (
          <Star key={i} fill={fill} size={px} />
        ),
      )}
      {reviewCount !== undefined &&
        (onReviewsClick ? (
          <button
            type="button"
            onClick={onReviewsClick}
            className={cm.cn(cm.textSize('sm'), cm.link)}
          >
            ({reviewCount})
          </button>
        ) : (
          <span className={cm.textSize('sm')}>({reviewCount})</span>
        ))}
    </span>
  )
}

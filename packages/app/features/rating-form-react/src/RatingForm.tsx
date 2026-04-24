import type { FormEvent, ReactNode } from 'react'
import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Button, Textarea } from '@molecule/app-ui-react'

interface RatingFormProps {
  /** Called with the submitted rating + optional comment. */
  onSubmit: (rating: number, comment: string) => void | Promise<void>
  /** Maximum stars. Defaults to 5. */
  max?: number
  /** Initial rating (uncontrolled). */
  defaultRating?: number
  /** Whether a comment is required. Defaults to false. */
  requireComment?: boolean
  /** Form heading. */
  title?: ReactNode
  /** Comment placeholder. */
  commentPlaceholder?: string
  /** Submit-button label. */
  submitLabel?: ReactNode
  /** Extra classes. */
  className?: string
}

/**
 * Interactive star-rating + comment form. Used for review submission
 * (product reviews, course feedback, support-ticket CSAT).
 * @param root0
 * @param root0.onSubmit
 * @param root0.max
 * @param root0.defaultRating
 * @param root0.requireComment
 * @param root0.title
 * @param root0.commentPlaceholder
 * @param root0.submitLabel
 * @param root0.className
 */
export function RatingForm({
  onSubmit,
  max = 5,
  defaultRating = 0,
  requireComment,
  title,
  commentPlaceholder,
  submitLabel,
  className,
}: RatingFormProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [rating, setRating] = useState(defaultRating)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const display = hover || rating

  /**
   *
   * @param e
   */
  async function handle(e: FormEvent) {
    e.preventDefault()
    if (submitting || !rating) return
    if (requireComment && !comment.trim()) return
    setSubmitting(true)
    try {
      await onSubmit(rating, comment)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handle} className={cm.cn(cm.stack(3), className)}>
      {title && <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>{title}</h3>}
      <div
        role="radiogroup"
        aria-label={t('rating.label', {}, { defaultValue: 'Rating' })}
        className={cm.flex({ align: 'center', gap: 'xs' })}
        onMouseLeave={() => setHover(0)}
      >
        {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={rating === n}
            aria-label={`${n} of ${max}`}
            onClick={() => setRating(n)}
            onMouseEnter={() => setHover(n)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 28,
              color: n <= display ? '#facc15' : 'rgba(0,0,0,0.2)',
            }}
          >
            ★
          </button>
        ))}
      </div>
      <Textarea
        value={comment}
        onChange={(e) => setComment((e.target as HTMLTextAreaElement).value)}
        placeholder={
          commentPlaceholder ??
          t('rating.commentPlaceholder', {}, { defaultValue: 'Share your thoughts (optional)' })
        }
        rows={4}
        aria-label="Comment"
      />
      <Button type="submit" variant="solid" color="primary" disabled={submitting || !rating}>
        {submitting
          ? t('rating.submitting', {}, { defaultValue: 'Submitting…' })
          : (submitLabel ?? t('rating.submit', {}, { defaultValue: 'Submit review' }))}
      </Button>
    </form>
  )
}

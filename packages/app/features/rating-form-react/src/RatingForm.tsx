import type { JSX, ReactNode } from 'react'
import { useRef, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import type { ElementHandle, KitEvent, KitKeyboardEvent } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Button, Textarea } from '@molecule/app-ui-react'
import { Box, FormArea, Pressable, Text } from '@molecule/app-ui-react/elements'

/** Props for {@link RatingForm}. */
export interface RatingFormProps {
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
 * @param props - Component props (see {@link RatingFormProps}).
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
}: RatingFormProps): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [rating, setRating] = useState(defaultRating)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const display = hover || rating
  // The star holding the group's one tab stop: the selected one, or the first
  // when no star is selected — no rating yet, or a defaultRating outside
  // 1..max, which marks no star (an out-of-range value must still leave the
  // group reachable from the keyboard).
  const tabStop = rating >= 1 && rating <= max ? rating : 1
  // The stars by number, as the elements hand them over (an `ElementHandle` on every renderer,
  // so `focus()` moves between them on the web and on a device alike).
  const starRefs = useRef(new Map<number, ElementHandle>())

  /**
   * Handles form submission: validates state, delegates to onSubmit, and manages submitting flag.
   * @param e - The form submit event every kit hands its handler (it only cancels the default).
   */
  async function handle(e: KitEvent): Promise<void> {
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

  /**
   * Selects a star and moves focus with it — the APG radio group's roving
   * tabindex, where the checked star is the group's one keyboard stop.
   * @param n - The star to select.
   */
  function selectAndFocus(n: number): void {
    setRating(n)
    starRefs.current.get(n)?.focus()
  }

  /**
   * Handles the radio keys on a star (the APG radio group pattern): ArrowRight /
   * ArrowDown select and focus the next star, ArrowLeft / ArrowUp the previous
   * one, both wrapping; Home and End jump to the first and last. The handled
   * keys are prevented (they would otherwise scroll or move focus); Space and
   * Enter stay the button's own click, and any other key is ignored.
   * @param e - The key event on a star button.
   */
  function onStarKeyDown(e: KitKeyboardEvent): void {
    const current = tabStop
    let next: number
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        next = current >= max ? 1 : current + 1
        break
      case 'ArrowLeft':
      case 'ArrowUp':
        next = current <= 1 ? max : current - 1
        break
      case 'Home':
        next = 1
        break
      case 'End':
        next = max
        break
      default:
        return
    }
    e.preventDefault()
    selectAndFocus(next)
  }

  return (
    <FormArea as="form" onSubmit={handle} className={cm.cn(cm.stack(3), className)}>
      {title && (
        <Text as="h3" className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
          {title}
        </Text>
      )}
      {/* jsx-a11y's interactive-supports-focus asks the group (it carries
          onMouseLeave) to be focusable, so it keeps a tabIndex — but at -1 the
          group is only ever focused through script, never a tab stop. The
          stars carry the keyboard instead (the APG radio group): a roving
          tabindex makes the checked star the group's one tab stop. */}
      <Box
        as="div"
        role="radiogroup"
        tabIndex={-1}
        aria-label={t('rating.label', {}, { defaultValue: 'Rating' })}
        className={cm.flex({ align: 'center', gap: 'xs' })}
        onMouseLeave={() => setHover(0)}
      >
        {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
          <Pressable
            as="button"
            key={n}
            ref={(el) => {
              if (el) starRefs.current.set(n, el)
              else starRefs.current.delete(n)
            }}
            type="button"
            role="radio"
            data-mol-id="rating-form-star"
            tabIndex={n === tabStop ? 0 : -1}
            aria-checked={rating === n}
            aria-label={t('rating.star', { n, max }, { defaultValue: '{{n}} of {{max}}' })}
            onClick={() => setRating(n)}
            onKeyDown={onStarKeyDown}
            onMouseEnter={() => setHover(n)}
            /* mol-bespoke-button: icon-only 28px star glyph, no label and no
               button surface — the star IS the control, so the inline
               background/border reset the browser's button defaults. Fill
               colour is a theme token now (`#facc15` / `rgba(0,0,0,0.2)`
               ignored the theme and the empty star vanished on a dark
               surface); 44px touch floor from the ClassMap. */
            className={cm.cn(cm.cursorPointer, cm.touchTarget)}
            webStyle={{
              background: 'none',
              border: 'none',
              fontSize: 28,
              color:
                n <= display
                  ? 'var(--mol-color-warning, #facc15)'
                  : 'var(--mol-color-border, rgba(128,128,128,0.4))',
            }}
          >
            ★
          </Pressable>
        ))}
      </Box>
      <Textarea
        value={comment}
        onChange={(e) => setComment((e.target as HTMLTextAreaElement).value)}
        placeholder={
          commentPlaceholder ??
          t('rating.commentPlaceholder', {}, { defaultValue: 'Share your thoughts (optional)' })
        }
        rows={4}
        aria-label={t('rating.comment', {}, { defaultValue: 'Comment' })}
      />
      <Button type="submit" variant="solid" color="primary" disabled={submitting || !rating}>
        {submitting
          ? t('rating.submitting', {}, { defaultValue: 'Submitting…' })
          : (submitLabel ?? t('rating.submit', {}, { defaultValue: 'Submit review' }))}
      </Button>
    </FormArea>
  )
}

/**
 * Solid star-rating + comment form: a star radiogroup, a comment textarea and
 * a submit button, with its own hover / submitting state.
 *
 * Solid counterpart of `@molecule/app-rating-form-react`'s `RatingForm` — the
 * same props (React names), the same ClassMap tokens, and the same DOM for the
 * same input.
 *
 * @module
 */

import { type Component, createMemo, createSignal, For } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'
import { Button, Textarea } from '@molecule/app-ui-solid'

import type { RatingFormProps } from './types.js'

/**
 * The star button's inline style: the same four properties React assigns, set
 * through the CSSOM so the shorthand `border` serializes exactly as React's.
 *
 * @param filled - Whether the star draws in the filled colour.
 * @returns The style object for a star button.
 */
const starStyle = (filled: boolean): Record<string, string> => ({
  background: 'none',
  border: 'none',
  'font-size': '28px',
  color: filled
    ? 'var(--mol-color-warning, #facc15)'
    : 'var(--mol-color-border, rgba(128,128,128,0.4))',
})

/**
 * Interactive star-rating + comment form. Used for review submission
 * (product reviews, course feedback, support-ticket CSAT).
 *
 * The submit button stays disabled until a star rating is selected, and
 * `requireComment` blocks submission on blank comments silently (no inline
 * error is rendered). Rejected `onSubmit` promises propagate — handle errors in
 * your handler.
 *
 * @param props - Component props (see {@link RatingFormProps}).
 * @returns The rendered rating form.
 */
export const RatingForm: Component<RatingFormProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()
  // React's useState: the initial value is read once; a later `defaultRating`
  // prop change does not move the selection.
  const [rating, setRating] = createSignal(props.defaultRating ?? 0)
  const [hover, setHover] = createSignal(0)
  const [comment, setComment] = createSignal('')
  const [submitting, setSubmitting] = createSignal(false)

  const max = (): number => props.max ?? 5
  const display = (): number => hover() || rating()
  const stars = createMemo((): number[] =>
    Array.from({ length: max() }, (_value, index) => index + 1),
  )

  /**
   * Handles form submission: validates state, delegates to onSubmit, and
   * manages the submitting flag.
   *
   * @param event - The submit event (React's `FormEvent`).
   * @returns A promise that settles when `onSubmit` does.
   */
  const handle = async (event: Event): Promise<void> => {
    event.preventDefault()
    if (submitting() || !rating()) return
    if (props.requireComment && !comment().trim()) return
    setSubmitting(true)
    try {
      await props.onSubmit(rating(), comment())
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handle} class={cm.cn(cm.stack(3), props.className)}>
      {props.title && (
        <h3 class={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>{props.title}</h3>
      )}
      <div
        role="radiogroup"
        aria-label={t('rating.label', {}, { defaultValue: 'Rating' })}
        class={cm.flex({ align: 'center', gap: 'xs' })}
        onMouseLeave={() => setHover(0)}
      >
        <For each={stars()}>
          {(n) => (
            <button
              type="button"
              role="radio"
              data-mol-id="rating-form-star"
              aria-checked={rating() === n}
              aria-label={t('rating.star', { n, max: max() }, { defaultValue: '{{n}} of {{max}}' })}
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              class={cm.cn(cm.cursorPointer, cm.touchTarget)}
              style={starStyle(n <= display())}
            >
              ★
            </button>
          )}
        </For>
      </div>
      <Textarea
        value={comment()}
        onChange={(event: Event) => setComment((event.target as HTMLTextAreaElement).value)}
        placeholder={
          props.commentPlaceholder ??
          t('rating.commentPlaceholder', {}, { defaultValue: 'Share your thoughts (optional)' })
        }
        rows={4}
        aria-label="Comment"
      />
      <Button type="submit" variant="solid" color="primary" disabled={submitting() || !rating()}>
        {submitting()
          ? t('rating.submitting', {}, { defaultValue: 'Submitting…' })
          : (props.submitLabel ?? t('rating.submit', {}, { defaultValue: 'Submit review' }))}
      </Button>
    </form>
  )
}

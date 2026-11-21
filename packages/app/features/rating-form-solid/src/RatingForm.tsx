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
  // The star buttons by number, for the keyboard handler's focus moves.
  const starEls = new Map<number, HTMLButtonElement>()

  const max = (): number => props.max ?? 5
  const display = (): number => hover() || rating()
  // The star holding the group's one tab stop: the selected one, or the first
  // when no star is selected — no rating yet, or a defaultRating outside
  // 1..max, which marks no star (an out-of-range value must still leave the
  // group reachable from the keyboard).
  const tabStop = (): number => {
    const selected = rating()
    return selected >= 1 && selected <= max() ? selected : 1
  }
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

  /**
   * Selects a star and moves focus with it — the APG radio group's roving
   * tabindex, where the checked star is the group's one keyboard stop.
   *
   * @param n - The star to select.
   */
  const selectAndFocus = (n: number): void => {
    setRating(n)
    starEls.get(n)?.focus()
  }

  /**
   * Handles the radio keys on a star (the APG radio group pattern):
   * ArrowRight / ArrowDown select and focus the next star, ArrowLeft / ArrowUp
   * the previous one, both wrapping; Home and End jump to the first and last.
   * The handled keys are prevented (they would otherwise scroll or move
   * focus); Space and Enter stay the native button click, and any other key is
   * ignored.
   *
   * @param event - The key event on a star button.
   */
  const onStarKeyDown = (event: KeyboardEvent): void => {
    const current = tabStop()
    let next: number
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        next = current >= max() ? 1 : current + 1
        break
      case 'ArrowLeft':
      case 'ArrowUp':
        next = current <= 1 ? max() : current - 1
        break
      case 'Home':
        next = 1
        break
      case 'End':
        next = max()
        break
      default:
        return
    }
    event.preventDefault()
    selectAndFocus(next)
  }

  return (
    <form onSubmit={handle} class={cm.cn(cm.stack(3), props.className)}>
      {props.title && (
        <h3 class={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>{props.title}</h3>
      )}
      {/* jsx-a11y's interactive-supports-focus asks the group (it carries
          onMouseLeave) to be focusable, so it keeps a tabindex — but at -1 the
          group is only ever focused through script, never a tab stop. The
          stars carry the keyboard instead (React's `tabIndex={-1}`, the APG
          radio group's roving tabindex). */}
      <div
        role="radiogroup"
        tabindex={-1}
        aria-label={t('rating.label', {}, { defaultValue: 'Rating' })}
        class={cm.flex({ align: 'center', gap: 'xs' })}
        onMouseLeave={() => setHover(0)}
      >
        <For each={stars()}>
          {(n) => (
            <button
              ref={(el) => starEls.set(n, el)}
              type="button"
              role="radio"
              data-mol-id="rating-form-star"
              tabindex={n === tabStop() ? 0 : -1}
              aria-checked={rating() === n}
              aria-label={t('rating.star', { n, max: max() }, { defaultValue: '{{n}} of {{max}}' })}
              onClick={() => setRating(n)}
              onKeyDown={onStarKeyDown}
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
        onChange={(event) => setComment((event.target as HTMLTextAreaElement).value)}
        placeholder={
          props.commentPlaceholder ??
          t('rating.commentPlaceholder', {}, { defaultValue: 'Share your thoughts (optional)' })
        }
        rows={4}
        aria-label={t('rating.comment', {}, { defaultValue: 'Comment' })}
      />
      <Button type="submit" variant="solid" color="primary" disabled={submitting() || !rating()}>
        {submitting()
          ? t('rating.submitting', {}, { defaultValue: 'Submitting…' })
          : (props.submitLabel ?? t('rating.submit', {}, { defaultValue: 'Submit review' }))}
      </Button>
    </form>
  )
}

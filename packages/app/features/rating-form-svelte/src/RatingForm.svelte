<!--
  RatingForm: the Svelte counterpart of `@molecule/app-rating-form-react`'s
  `RatingForm` — a star radiogroup, a comment textarea and a submit button,
  tracking its own hover / submitting state. Same props, same DOM for the same
  input; node props are snippets (or plain strings) and every visible string
  goes through `t()` so a locale switch re-renders it.

  The `svelte-ignore` line below marks a deliberate trade-off React's package
  documents: `rating` captures the initial `defaultRating` prop value once (a
  later prop write must not move the selection).
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Button, Textarea } from '@molecule/app-ui-svelte'

  import { starStyle } from './star-style.js'
  import type { RatingFormProps } from './types.js'

  let {
    onSubmit,
    max = 5,
    defaultRating = 0,
    requireComment,
    title,
    commentPlaceholder,
    submitLabel,
    className,
  }: RatingFormProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  // svelte-ignore state_referenced_locally
  // React's useState seeds the rating from the `defaultRating` PROP VALUE once
  // (a later prop write never moves the selection), so capturing the initial
  // value is the point, not an oversight.
  let rating = $state(defaultRating)
  let hover = $state(0)
  let comment = $state('')
  let submitting = $state(false)

  const display = $derived(hover || rating)
  const stars = $derived(Array.from({ length: max }, (_value, index) => index + 1))
  // The star holding the group's one tab stop: the selected one, or the first
  // when no star is selected — no rating yet, or a defaultRating outside
  // 1..max, which marks no star (an out-of-range value must still leave the
  // group reachable from the keyboard).
  const tabStop = $derived(rating >= 1 && rating <= max ? rating : 1)

  // The star buttons by number, for the keyboard handler's focus moves.
  let starEls: Record<number, HTMLButtonElement> = {}

  // Every `t(…)` runs inside a `$derived`: it reads the i18n version under the
  // hood, so these re-run on a locale switch the way React's render-time `t`
  // calls re-run on a re-render.
  const ratingLabel = $derived(t('rating.label', {}, { defaultValue: 'Rating' }))
  const placeholderText = $derived(
    commentPlaceholder ??
      t('rating.commentPlaceholder', {}, { defaultValue: 'Share your thoughts (optional)' }),
  )
  const commentLabel = $derived(t('rating.comment', {}, { defaultValue: 'Comment' }))
  const submittingText = $derived(t('rating.submitting', {}, { defaultValue: 'Submitting…' }))
  const submitText = $derived(t('rating.submit', {}, { defaultValue: 'Submit review' }))

  /**
   * Handles form submission: validates state, delegates to onSubmit, and
   * manages the submitting flag (React's `handle`).
   *
   * @param event - The submit event.
   */
  async function handle(event: SubmitEvent): Promise<void> {
    event.preventDefault()
    if (submitting || !rating) return
    if (requireComment && !comment.trim()) return
    submitting = true
    try {
      await onSubmit(rating, comment)
    } finally {
      submitting = false
    }
  }

  /**
   * A capture action for a star button: records the node under its star
   * number, so the keyboard handler can move focus with `focus()`. An action
   * runs at mount with the node itself, which `bind:this` to a plain object
   * member does not guarantee.
   *
   * @param node - The star button.
   * @param n - The star number.
   * @returns An update hook, so a re-keyed button re-registers under its new number.
   */
  function captureStar(node: HTMLButtonElement, n: number): { update: (next: number) => void } {
    starEls[n] = node
    return {
      update: (next) => {
        starEls[next] = node
      },
    }
  }

  /**
   * Selects a star and moves focus with it — the APG radio group's roving
   * tabindex, where the checked star is the group's one keyboard stop.
   *
   * @param n - The star to select.
   */
  function selectAndFocus(n: number): void {
    rating = n
    starEls[n]?.focus()
  }

  /**
   * Handles the radio keys on a star (the APG radio group pattern):
   * ArrowRight / ArrowDown select and focus the next star, ArrowLeft / ArrowUp
   * the previous one, both wrapping; Home and End jump to the first and last.
   * The handled keys are prevented (they would otherwise scroll or move
   * focus); Space and Enter stay the native button click, and any other key is
   * ignored (React's `onStarKeyDown`).
   *
   * @param event - The key event on a star button.
   */
  function onStarKeyDown(event: KeyboardEvent): void {
    const current = tabStop
    let next: number
    switch (event.key) {
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
    event.preventDefault()
    selectAndFocus(next)
  }
</script>

<form class={cm.cn(cm.stack(3), className)} onsubmit={handle}>
  {#if title}
    <h3 class={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
      {#if typeof title === 'function'}{@render title?.()}{:else}{title}{/if}
    </h3>
  {/if}
  <!-- jsx-a11y's interactive-supports-focus asks the group (it carries
       onmouseleave) to be focusable, so it keeps a tabindex — but at -1 the
       group is only ever focused through script, never a tab stop. The stars
       carry the keyboard instead (React's `tabIndex={-1}`, the APG radio
       group's roving tabindex). -->
  <div
    role="radiogroup"
    tabindex="-1"
    aria-label={ratingLabel}
    class={cm.flex({ align: 'center', gap: 'xs' })}
    onmouseleave={() => (hover = 0)}
  >
    {#each stars as n (n)}
      <button
        type="button"
        role="radio"
        data-mol-id="rating-form-star"
        tabindex={n === tabStop ? 0 : -1}
        aria-checked={rating === n}
        aria-label={t('rating.star', { n, max }, { defaultValue: '{{n}} of {{max}}' })}
        onclick={() => (rating = n)}
        onkeydown={onStarKeyDown}
        onmouseenter={() => (hover = n)}
        class={cm.cn(cm.cursorPointer, cm.touchTarget)}
        use:captureStar={n}
        use:starStyle={n <= display}
      >
        ★
      </button>
    {/each}
  </div>
  <Textarea
    value={comment}
    onChange={(event: Event) => (comment = (event.target as HTMLTextAreaElement).value)}
    placeholder={placeholderText}
    rows={4}
    aria-label={commentLabel}
  />
  <Button type="submit" variant="solid" color="primary" disabled={submitting || !rating}>
    {#if submitting}
      {submittingText}
    {:else if typeof submitLabel === 'function'}
      {@render submitLabel?.()}
    {:else if submitLabel !== undefined && submitLabel !== null}
      {submitLabel}
    {:else}
      {submitText}
    {/if}
  </Button>
</form>

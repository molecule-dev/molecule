<!--
  RatingForm: the Svelte counterpart of `@molecule/app-rating-form-react`'s
  `RatingForm` — a star radiogroup, a comment textarea and a submit button,
  tracking its own hover / submitting state. Same props, same DOM for the same
  input; node props are snippets (or plain strings) and every visible string
  goes through `t()` so a locale switch re-renders it.

  The `svelte-ignore` lines below mark two deliberate trade-offs React's package
  documents: `rating` captures the initial `defaultRating` prop value once (a
  later prop write must not move the selection), and the radiogroup `<div>`
  carries no `tabindex` — React renders none, and the star `<button>`s are the
  focusable controls, so adding one would change the DOM this package must
  reproduce exactly.
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

  // Every `t(…)` runs inside a `$derived`: it reads the i18n version under the
  // hood, so these re-run on a locale switch the way React's render-time `t`
  // calls re-run on a re-render.
  const ratingLabel = $derived(t('rating.label', {}, { defaultValue: 'Rating' }))
  const placeholderText = $derived(
    commentPlaceholder ??
      t('rating.commentPlaceholder', {}, { defaultValue: 'Share your thoughts (optional)' }),
  )
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
</script>

<form class={cm.cn(cm.stack(3), className)} onsubmit={handle}>
  {#if title}
    <h3 class={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
      {#if typeof title === 'function'}{@render title()}{:else}{title}{/if}
    </h3>
  {/if}
  <!-- svelte-ignore a11y_interactive_supports_focus -->
  <div
    role="radiogroup"
    aria-label={ratingLabel}
    class={cm.flex({ align: 'center', gap: 'xs' })}
    onmouseleave={() => (hover = 0)}
  >
    {#each stars as n (n)}
      <button
        type="button"
        role="radio"
        data-mol-id="rating-form-star"
        aria-checked={rating === n}
        aria-label={t('rating.star', { n, max }, { defaultValue: '{{n}} of {{max}}' })}
        onclick={() => (rating = n)}
        onmouseenter={() => (hover = n)}
        class={cm.cn(cm.cursorPointer, cm.touchTarget)}
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
    aria-label="Comment"
  />
  <Button type="submit" variant="solid" color="primary" disabled={submitting || !rating}>
    {#if submitting}
      {submittingText}
    {:else if typeof submitLabel === 'function'}
      {@render submitLabel()}
    {:else if submitLabel !== undefined && submitLabel !== null}
      {submitLabel}
    {:else}
      {submitText}
    {/if}
  </Button>
</form>

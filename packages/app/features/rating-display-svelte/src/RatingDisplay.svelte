<!--
  RatingDisplay: the Svelte counterpart of `@molecule/app-rating-display-react`'s
  `RatingDisplay` — fractional star rendering (inline SVG), optional review
  count tail, optional interactive mode via `onChange`. Same props (React
  names), same DOM for the same input.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import type { RatingDisplayProps } from './types.js'

  /** Star pixel size per size preset. */
  const SIZE_PX = { sm: 12, md: 16, lg: 20 } as const

  /** The star's single SVG path, identical to React's. */
  const STAR_PATH =
    'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'

  let {
    value,
    max = 5,
    reviewCount,
    onReviewsClick,
    size = 'md',
    onChange,
    ariaLabel,
    className,
  }: RatingDisplayProps = $props()

  /**
   * Mints one star's gradient id, exactly as React's `Star` does.
   *
   * @returns The gradient id.
   */
  const starId = (): string => `star-grad-${Math.random().toString(36).slice(2, 9)}`

  const { t } = useTranslation()
  const cm = $derived(getClassMap())
  const px = $derived<number | undefined>(SIZE_PX[size])
  // One flex row shared by the root and the stars span, so wrapping the stars
  // in the inner span leaves the layout as it was.
  const layout = $derived(cm.flex({ align: 'center', gap: 'xs' }))
  const label = $derived(
    ariaLabel ??
      t(
        'ratingDisplay.aria.rating',
        { value, max },
        { defaultValue: 'Rating: {{value}} of {{max}}' },
      ),
  )
  /**
   * The per-star button label in interactive mode.
   *
   * @param star - The star number (1-based).
   * @returns The accessible label.
   */
  const rateLabel = (star: number): string =>
    t(
      'ratingDisplay.aria.rate',
      { value: star, max },
      { defaultValue: 'Rate {{value}} of {{max}}' },
    )
  const stars = $derived(
    Array.from({ length: max }, (_value, i) => ({
      i,
      fill: Math.max(0, Math.min(1, value - i)),
      id: starId(),
    })),
  )
</script>

{#snippet star(fill: number, id: string)}
  <svg width={px} height={px} viewBox="0 0 24 24" aria-hidden="true">
    <defs>
      <linearGradient {id}>
        <stop offset={`${fill * 100}%`} stop-color="currentColor" />
        <stop offset={`${fill * 100}%`} stop-color="currentColor" stop-opacity="0.25" />
      </linearGradient>
    </defs>
    <path d={STAR_PATH} fill={`url(#${id})`} />
  </svg>
{/snippet}

<span class={cm.cn(layout, className)}>
  <span class={layout} role={onChange ? 'group' : 'img'} aria-label={label}>
    {#each stars as { i, fill, id } (i)}
      {#if onChange}
        <button
          type="button"
          onclick={() => onChange?.(i + 1)}
          aria-pressed={i + 1 <= Math.round(value) ? 'true' : 'false'}
          aria-label={rateLabel(i + 1)}
        >
          {@render star(fill, id)}
        </button>
      {:else}
        {@render star(fill, id)}
      {/if}
    {/each}
  </span>
  {#if reviewCount !== undefined}
    {#if onReviewsClick}
      <button
        type="button"
        onclick={(event) => onReviewsClick?.(event)}
        class={cm.cn(cm.textSize('sm'), cm.link)}
      >
        ({reviewCount})
      </button>
    {:else}
      <span class={cm.textSize('sm')}>({reviewCount})</span>
    {/if}
  {/if}
</span>

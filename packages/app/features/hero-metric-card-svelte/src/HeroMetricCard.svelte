<!--
  HeroMetricCard: the Svelte counterpart of
  `@molecule/app-hero-metric-card-react`'s `HeroMetricCard` — top-of-dashboard
  hero metric card. Same props (React names), same ClassMap tokens, same DOM
  for the same input. Node-valued props (`title`, `value`, `unit`, `subtitle`,
  `progressRing`, `icon`) are snippets, or plain strings.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import type { UIClassMap } from '@molecule/app-ui'
  import { getClassMap } from '@molecule/app-ui'
  import { Card } from '@molecule/app-ui-svelte'

  import HeroMetricTrendChip from './HeroMetricTrendChip.svelte'
  import type { HeroMetricAccent, HeroMetricCardProps, HeroMetricSemanticAccent } from './types.js'

  /**
   * Maps a semantic hero accent to a real ClassMap color variant. The theme
   * exposes no `danger`/`neutral` color token, so those names are translated
   * to the tokens that DO exist (`danger → error`, `neutral → secondary`).
   */
  const ACCENT_COLOR_VARIANT: Record<
    HeroMetricSemanticAccent,
    'error' | 'secondary' | 'primary' | 'success' | 'warning' | 'info'
  > = {
    primary: 'primary',
    success: 'success',
    warning: 'warning',
    danger: 'error',
    info: 'info',
    neutral: 'secondary',
  }

  /**
   * Resolves the top-edge accent bar's color: a semantic accent routes through
   * `cm.progressColor()`; any other string is a one-off CSS color.
   *
   * @param cm - The active ClassMap resolver.
   * @param accent - The accent token or raw color string.
   * @returns A ClassMap color class and/or an inline background color.
   */
  const resolveAccentBar = (
    cm: UIClassMap,
    accent: HeroMetricAccent,
  ): { className?: string; backgroundColor?: string } => {
    const variant = ACCENT_COLOR_VARIANT[accent as HeroMetricSemanticAccent]
    if (variant) return { className: cm.progressColor(variant) }
    return { backgroundColor: accent }
  }

  let {
    title,
    value,
    unit,
    trend,
    subtitle,
    progressRing,
    icon,
    accent,
    onClick,
    loading = false,
    className,
    dataMolId,
  }: HeroMetricCardProps = $props()

  const { t } = useTranslation()

  const cm = $derived(getClassMap())
  const accentBar = $derived(accent ? resolveAccentBar(cm, accent) : undefined)
  const clickable = $derived(typeof onClick === 'function')
  const rightSlot = $derived(progressRing ?? icon)
  const hasUnit = $derived(unit !== undefined && unit !== null)
  const loadingLabel = $derived(
    t('hero-metric-card.loading', {}, { defaultValue: 'Loading metric…' }),
  )
  const cardStyle = $derived(accentBar ? { overflow: 'hidden' } : undefined)
  const accentStyle = $derived(
    `display: block; height: 4px${
      accentBar?.backgroundColor ? `; background-color: ${accentBar.backgroundColor}` : ''
    }`,
  )
</script>

<Card
  className={cm.cn(className)}
  padding="none"
  style={cardStyle}
  interactive={clickable}
  {onClick}
  data-mol-id={dataMolId}
>
  {#if accentBar}
    <span aria-hidden="true" class={cm.cn(accentBar.className)} style={accentStyle}></span>
  {/if}
  <div class={cm.cardPadding('md')}>
    <div
      class={cm.flex({ justify: 'between', align: 'center', gap: 'md' })}
      aria-busy={loading || undefined}
    >
      <div class={cm.stack(2)}>
        <span
          class={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.uppercase,
            cm.trackingWide,
            cm.textMuted,
          )}
        >
          {#if typeof title === 'function'}{@render title()}{:else}{title}{/if}
        </span>
        {#if loading}
          <span
            class={cm.cn(cm.textSize('5xl'), cm.fontWeight('bold'))}
            role="status"
            aria-live="polite"
          >
            {loadingLabel}
          </span>
        {:else}
          <div class={cm.flex({ align: 'baseline', gap: 'xs' })}>
            <span
              class={cm.cn(cm.textSize('5xl'), cm.fontWeight('extrabold'), cm.heroMetricCardValue)}
            >
              {#if typeof value === 'function'}{@render value()}{:else}{value}{/if}
            </span>
            {#if hasUnit}
              <span class={cm.cn(cm.textSize('lg'), cm.fontWeight('medium'), cm.textMuted)}>
                {#if typeof unit === 'function'}{@render unit()}{:else}{unit}{/if}
              </span>
            {/if}
          </div>
        {/if}
        {#if !loading && trend}
          <HeroMetricTrendChip {trend} />
        {/if}
        {#if !loading && subtitle}
          <span class={cm.cn(cm.textSize('sm'), cm.textMuted)}>
            {#if typeof subtitle === 'function'}{@render subtitle()}{:else}{subtitle}{/if}
          </span>
        {/if}
      </div>
      {#if rightSlot}
        <div class={cm.flex({ align: 'center', justify: 'center' })}>
          {#if typeof rightSlot === 'function'}{@render rightSlot()}{:else}{rightSlot}{/if}
        </div>
      {/if}
    </div>
  </div>
</Card>

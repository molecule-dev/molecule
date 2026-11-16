<!--
  BiasIndicator: the Svelte counterpart of `@molecule/app-bias-indicator-react`'s
  `BiasIndicator` — a horizontal -1..+1 scale with a coloured marker at `bias`,
  an optional reliability dot/chip below, and a compact single-dot variant for
  dense lists. Same props (React names), same ClassMap tokens, same inline
  styles, and the same DOM for the same input. All UI text routes through
  `useTranslation()` so a locale switch re-renders it.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import {
    biasToBucket,
    biasToPercent,
    bucketColor,
    reliabilityToTier,
    tierColor,
  } from './logic.js'
  import type { BiasBucket, BiasIndicatorProps, ReliabilityTier } from './types.js'

  let {
    bias,
    reliability,
    compact = false,
    sourceLabel,
    className,
    dataMolId,
  }: BiasIndicatorProps = $props()

  /** i18n key per bias bucket. */
  const BIAS_KEY: Record<BiasBucket, string> = {
    'far-left': 'biasIndicator.bias.farLeft',
    left: 'biasIndicator.bias.leftLeaning',
    center: 'biasIndicator.bias.center',
    right: 'biasIndicator.bias.rightLeaning',
    'far-right': 'biasIndicator.bias.farRight',
  }

  /** English fallback per bias bucket. */
  const BIAS_FALLBACK: Record<BiasBucket, string> = {
    'far-left': 'Far left',
    left: 'Left-leaning',
    center: 'Center',
    right: 'Right-leaning',
    'far-right': 'Far right',
  }

  /** i18n key per reliability tier. */
  const TIER_KEY: Record<ReliabilityTier, string> = {
    high: 'biasIndicator.reliability.high',
    medium: 'biasIndicator.reliability.medium',
    low: 'biasIndicator.reliability.low',
    disputed: 'biasIndicator.reliability.disputed',
  }

  /** English fallback per reliability tier. */
  const TIER_FALLBACK: Record<ReliabilityTier, string> = {
    high: 'Reliability: high',
    medium: 'Reliability: medium',
    low: 'Reliability: low',
    disputed: 'Reliability: disputed',
  }

  /** The baked-in scale gradient: info → info-light → neutral → warning → error. */
  const SCALE_GRADIENT =
    'linear-gradient(to right, var(--color-info, #2563eb) 0%, var(--color-info-light, #60a5fa) 25%, var(--color-foreground-secondary, #9ca3af) 50%, var(--color-warning-light, #fbbf24) 75%, var(--color-error, #dc2626) 100%)'

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  const bucket = $derived(biasToBucket(bias))
  const biasLabel = $derived(t(BIAS_KEY[bucket], {}, { defaultValue: BIAS_FALLBACK[bucket] }))
  const tier = $derived(reliability !== undefined ? reliabilityToTier(reliability) : null)
  const tierLabel = $derived(
    tier ? t(TIER_KEY[tier], {}, { defaultValue: TIER_FALLBACK[tier] }) : null,
  )
  const color = $derived(bucketColor(bucket))
  const containerId = $derived(dataMolId ?? 'bias-indicator')
  const ariaLabel = $derived(tierLabel ? `${biasLabel} — ${tierLabel}` : biasLabel)

  const dotClasses = $derived(cm.cn(cm.w(2), cm.h(2), cm.roundedFull, cm.displayInlineBlock))
  const compactClasses = $derived(cm.cn(cm.flex({ align: 'center', gap: 'xs' }), className))
  const compactSourceClasses = $derived(cm.cn(cm.textSize('xs'), cm.textMuted))
  const rootClasses = $derived(cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), className))
  const sourceClasses = $derived(cm.cn(cm.textSize('xs'), cm.fontWeight('semibold')))
  const scaleClasses = $derived(cm.cn(cm.position('relative'), cm.h(2)))
  const markerClasses = $derived(cm.cn(cm.position('absolute'), cm.roundedFull))
  const rowClasses = $derived(cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 'xs' })))
  const biasLabelClasses = $derived(cm.cn(cm.textSize('xs')))
  const chipClasses = $derived(cm.cn(cm.flex({ align: 'center', gap: 'xs' }), cm.textSize('xs')))
</script>

{#if compact}
  <span
    role="img"
    aria-label={ariaLabel}
    data-mol-id={containerId}
    data-bias-bucket={bucket}
    data-reliability-tier={tier ?? undefined}
    class={compactClasses}
  >
    <span aria-hidden="true" class={dotClasses} style="background: {color}"></span>
    {#if sourceLabel !== undefined}
      <span class={compactSourceClasses}
        >{#if typeof sourceLabel === 'function'}{@render sourceLabel()}{:else}{sourceLabel}{/if}</span
      >
    {/if}
  </span>
{:else}
  <div
    data-mol-id={containerId}
    data-bias-bucket={bucket}
    data-reliability-tier={tier ?? undefined}
    class={rootClasses}
  >
    {#if sourceLabel !== undefined}
      <span data-mol-id="bias-indicator-source" class={sourceClasses}
        >{#if typeof sourceLabel === 'function'}{@render sourceLabel()}{:else}{sourceLabel}{/if}</span
      >
    {/if}
    <div
      role="img"
      aria-label={biasLabel}
      data-mol-id="bias-indicator-scale"
      class={scaleClasses}
      style="width: 100%; min-width: 80px; border-radius: 999px; background: {SCALE_GRADIENT}; opacity: 0.45"
    >
      <span
        data-mol-id="bias-indicator-marker"
        aria-hidden="true"
        class={markerClasses}
        style="left: {biasToPercent(
          bias,
        )}%; top: 50%; transform: translate(-50%, -50%); width: 12px; height: 12px; background: {color}; border: 2px solid var(--color-surface, #ffffff); box-shadow: 0 0 0 1px var(--color-border, rgba(0,0,0,0.15))"
      ></span>
    </div>
    <div class={rowClasses}>
      <span data-mol-id="bias-indicator-bias-label" class={biasLabelClasses}>{biasLabel}</span>
      {#if tier && tierLabel}
        <span
          data-mol-id="bias-indicator-reliability"
          data-reliability-tier={tier}
          class={chipClasses}
        >
          <span aria-hidden="true" class={dotClasses} style="background: {tierColor(tier)}"></span>
          <span>{tierLabel}</span>
        </span>
      {/if}
    </div>
  </div>
{/if}

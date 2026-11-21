<!--
  LoyaltyTierBadge: the Svelte counterpart of
  `@molecule/app-loyalty-tier-badge-react`'s `LoyaltyTierBadge` — the same
  props (React names), the same ClassMap tokens, the same inline styles and the
  same DOM for the same input. The tier glyph is a colored circle holding the
  label's first letter; when `points` and `nextTierThreshold` are both given (and
  a next tier exists) it also renders a progress bar and an "X to next tier"
  readout, and platinum shows "Top tier reached" instead.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import type { LoyaltyTier, LoyaltyTierBadgeProps } from './types.js'
  import { computeProgress, nextTierOf } from './utils.js'

  /**
   * Accent color per tier — the metallic color IS the tier's identity (data), so
   * it never follows the theme; the badge's neutral chrome comes from the ClassMap.
   */
  const TIER_COLOR: Record<LoyaltyTier, string> = {
    bronze: '#b87333',
    silver: '#c0c0c0',
    gold: '#d4af37',
    platinum: '#e5e4e2',
  }

  /** The glyph's pixel size per `size` prop. */
  const SIZE_PX: Record<NonNullable<LoyaltyTierBadgeProps['size']>, number> = {
    sm: 36,
    md: 56,
    lg: 80,
  }

  let {
    tier,
    points,
    nextTierThreshold,
    nextTierLabel,
    tierLabel,
    size = 'md',
    dataMolId,
    className,
  }: LoyaltyTierBadgeProps = $props()

  const { t } = useTranslation()

  const cm = $derived(getClassMap())
  const px = $derived(SIZE_PX[size])
  const accent = $derived(TIER_COLOR[tier])
  const next = $derived(nextTierOf(tier))
  const progress = $derived(computeProgress(points, nextTierThreshold))
  const showProgress = $derived(
    typeof points === 'number' &&
      typeof nextTierThreshold === 'number' &&
      nextTierThreshold > 0 &&
      next !== null,
  )

  /**
   * The translated name of a tier rung. Every rung is a literal key (the
   * locale bond owns `loyaltyTierBadge.tier.<rung>`), so the i18n gate can
   * check each one exists in the bond.
   *
   * @param rung - The tier to name.
   * @returns The tier's translated name.
   */
  const translatedTierName = (rung: LoyaltyTier): string => {
    switch (rung) {
      case 'bronze':
        return t('loyaltyTierBadge.tier.bronze', {}, { defaultValue: 'Bronze' })
      case 'silver':
        return t('loyaltyTierBadge.tier.silver', {}, { defaultValue: 'Silver' })
      case 'gold':
        return t('loyaltyTierBadge.tier.gold', {}, { defaultValue: 'Gold' })
      case 'platinum':
        return t('loyaltyTierBadge.tier.platinum', {}, { defaultValue: 'Platinum' })
    }
  }

  const tierName = $derived(tierLabel ?? translatedTierName(tier))

  const nextName = $derived(nextTierLabel ?? (next ? translatedTierName(next) : ''))

  const remaining = $derived(
    showProgress ? Math.max(0, (nextTierThreshold ?? 0) - (points ?? 0)) : 0,
  )

  const groupLabel = $derived(
    t('loyaltyTierBadge.group', { tier: tierName }, { defaultValue: '{{tier}} tier' }),
  )
  const progressLabel = $derived(
    t('loyaltyTierBadge.progress', { next: nextName }, { defaultValue: 'Progress to {{next}}' }),
  )
  const remainingLabel = $derived(
    t(
      'loyaltyTierBadge.remaining',
      { remaining, next: nextName },
      { defaultValue: '{{remaining}} to {{next}}' },
    ),
  )
  const topTierLabel = $derived(
    t('loyaltyTierBadge.topTier', {}, { defaultValue: 'Top tier reached' }),
  )

  const glyphStyle = $derived(
    [
      `width: ${px}px`,
      `height: ${px}px`,
      'border-radius: 50%',
      // The tier's metallic accent is data (the tier's identity), not a theme tone.
      `background: radial-gradient(circle at 30% 30%, ${accent} 0%, ${accent}99 60%, ${accent}66 100%)`,
      'display: inline-flex',
      'align-items: center',
      'justify-content: center',
      'flex-shrink: 0',
      'font-weight: 700',
      `font-size: ${Math.round(px * 0.45)}px`,
    ].join('; '),
  )

  const progressOuterStyle =
    'position: relative; height: 6px; border-radius: 3px; overflow: hidden; width: 100%'
  // The fill carries the tier's accent (data).
  const progressInnerStyle = $derived(
    `width: ${Math.round(progress * 100)}%; height: 100%; background: ${accent}; transition: width 200ms ease`,
  )
</script>

<div
  class={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), className)}
  role="group"
  data-mol-id={dataMolId ?? 'loyalty-tier-badge'}
  data-tier={tier}
  aria-label={groupLabel}
>
  <span aria-hidden="true" class={cm.borderAll} style={glyphStyle} data-mol-id="loyalty-tier-glyph">
    {tierName.charAt(0)}
  </span>
  <div class={cm.flex({ direction: 'col', gap: 'xs' })} style="flex: 1 1 0%">
    <span class={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>{tierName}</span>
    {#if showProgress}
      <div
        role="progressbar"
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow={Math.round(progress * 100)}
        aria-label={progressLabel}
        data-mol-id="loyalty-tier-progress"
        class={cm.surfaceSecondary}
        style={progressOuterStyle}
      >
        <div style={progressInnerStyle}></div>
      </div>
      <span
        class={cm.cn(cm.textSize('xs'), cm.textMuted)}
        data-mol-id="loyalty-tier-progress-label"
      >
        {remainingLabel}
      </span>
    {:else if next === null}
      <span class={cm.cn(cm.textSize('xs'), cm.textMuted)} data-mol-id="loyalty-tier-top">
        {topTierLabel}
      </span>
    {/if}
  </div>
</div>

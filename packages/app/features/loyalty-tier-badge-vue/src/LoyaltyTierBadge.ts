/**
 * Vue Bronze/Silver/Gold/Platinum loyalty tier badge with optional progress
 * bar to the next tier.
 *
 * Vue counterpart of `@molecule/app-loyalty-tier-badge-react`'s
 * `LoyaltyTierBadge` — the same props (React names), the same ClassMap
 * tokens, the same inline styles and the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

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

/**
 * Loyalty tier badge — renders a colored glyph + tier label + (optional)
 * "X / Y to next tier" progress bar.
 *
 * Tier glyph colors are always the standard metallic accents (fixed per-tier
 * hex values — theme tokens are not consulted for the glyph); pass
 * `tierLabel` / `nextTierLabel` to override the translated defaults for
 * branded programs (e.g. "Member" / "Elite").
 *
 * @param props - Component props (see {@link LoyaltyTierBadgeProps}).
 * @returns The loyalty tier badge component.
 */
export const LoyaltyTierBadge = defineComponent({
  name: 'LoyaltyTierBadge',
  props: {
    tier: { type: String as PropType<LoyaltyTier>, required: true },
    points: Number,
    nextTierThreshold: Number,
    nextTierLabel: String,
    tierLabel: String,
    size: { type: String as PropType<'sm' | 'md' | 'lg'>, default: 'md' },
    dataMolId: String,
    className: String,
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()

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

    return (): VNode => {
      const px = SIZE_PX[props.size ?? 'md']
      const accent = TIER_COLOR[props.tier]
      const next = nextTierOf(props.tier)
      const progress = computeProgress(props.points, props.nextTierThreshold)
      const showProgress =
        typeof props.points === 'number' &&
        typeof props.nextTierThreshold === 'number' &&
        props.nextTierThreshold > 0 &&
        next !== null

      const tierName = props.tierLabel ?? translatedTierName(props.tier)

      const nextName = props.nextTierLabel ?? (next ? translatedTierName(next) : '')

      const remaining = showProgress
        ? Math.max(0, (props.nextTierThreshold ?? 0) - (props.points ?? 0))
        : 0

      const glyphStyle = {
        width: `${px}px`,
        height: `${px}px`,
        borderRadius: '50%',
        // The tier's metallic accent is data (the tier's identity), not a theme tone.
        background: `radial-gradient(circle at 30% 30%, ${accent} 0%, ${accent}99 60%, ${accent}66 100%)`,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: '0',
        fontWeight: '700',
        fontSize: `${Math.round(px * 0.45)}px`,
      }

      const progressOuter = {
        position: 'relative',
        height: '6px',
        borderRadius: '3px',
        overflow: 'hidden',
        width: '100%',
      }
      const progressInner = {
        width: `${Math.round(progress * 100)}%`,
        height: '100%',
        // The fill carries the tier's accent (data).
        background: accent,
        transition: 'width 200ms ease',
      }

      const status: VNode[] = showProgress
        ? [
            h(
              'div',
              {
                role: 'progressbar',
                'aria-valuemin': 0,
                'aria-valuemax': 100,
                'aria-valuenow': Math.round(progress * 100),
                'aria-label': t(
                  'loyaltyTierBadge.progress',
                  { next: nextName },
                  { defaultValue: 'Progress to {{next}}' },
                ),
                'data-mol-id': 'loyalty-tier-progress',
                class: cm.surfaceSecondary,
                style: progressOuter,
              },
              [h('div', { style: progressInner })],
            ),
            h(
              'span',
              {
                class: cm.cn(cm.textSize('xs'), cm.textMuted),
                'data-mol-id': 'loyalty-tier-progress-label',
              },
              [
                t(
                  'loyaltyTierBadge.remaining',
                  { remaining, next: nextName },
                  { defaultValue: '{{remaining}} to {{next}}' },
                ),
              ],
            ),
          ]
        : next === null
          ? [
              h(
                'span',
                {
                  class: cm.cn(cm.textSize('xs'), cm.textMuted),
                  'data-mol-id': 'loyalty-tier-top',
                },
                [t('loyaltyTierBadge.topTier', {}, { defaultValue: 'Top tier reached' })],
              ),
            ]
          : []

      return h(
        'div',
        {
          class: cm.cn(cm.flex({ align: 'center', gap: 'sm' }), props.className),
          role: 'group',
          'data-mol-id': props.dataMolId ?? 'loyalty-tier-badge',
          'data-tier': props.tier,
          'aria-label': t(
            'loyaltyTierBadge.group',
            { tier: tierName },
            { defaultValue: '{{tier}} tier' },
          ),
        },
        [
          h(
            'span',
            {
              class: cm.borderAll,
              'aria-hidden': 'true',
              style: glyphStyle,
              'data-mol-id': 'loyalty-tier-glyph',
            },
            [tierName.charAt(0)],
          ),
          h('div', { class: cm.flex({ direction: 'col', gap: 'xs' }), style: { flex: '1' } }, [
            h('span', { class: cm.cn(cm.textSize('sm'), cm.fontWeight('semibold')) }, [tierName]),
            ...status,
          ]),
        ],
      )
    }
  },
})

/**
 * Vue user reputation / karma display.
 *
 * Vue counterpart of `@molecule/app-reputation-badge-react`'s
 * `ReputationBadge` — the same props (React names), the same ClassMap tokens,
 * the same i18n keys and the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Badge } from '@molecule/app-ui-vue'
import { useTranslation } from '@molecule/app-vue'

import { colorForLevel, DEFAULT_THRESHOLDS, levelForScore } from './levels.js'
import type { ReputationLevel, ReputationThresholds } from './types.js'

/** The i18n translate function the bonded provider hands out. */
type Translate = ReturnType<typeof useTranslation>['t']

/**
 * Resolve a level's translated label — exactly React's `levelLabel`: one
 * LITERAL i18n key per in-contract level, and the literal
 * `reputationBadge.level.fallback` key (whose English is the bare `{{level}}`
 * placeholder, so an unknown id renders as itself) for anything else.
 *
 * Literal keys, never one built from the level id: the i18n gate can only see
 * literal keys, so a key built at runtime that no locale bond carries leaves
 * every non-English user on English with nothing reporting it.
 *
 * @param t - The bonded translate function.
 * @param level - The level id (may be out of contract).
 * @returns The translated label.
 */
function levelLabel(t: Translate, level: ReputationLevel): string {
  switch (level) {
    case 'newcomer':
      return t('reputationBadge.level.newcomer', {}, { defaultValue: 'Newcomer' })
    case 'contributor':
      return t('reputationBadge.level.contributor', {}, { defaultValue: 'Contributor' })
    case 'trusted':
      return t('reputationBadge.level.trusted', {}, { defaultValue: 'Trusted' })
    case 'veteran':
      return t('reputationBadge.level.veteran', {}, { defaultValue: 'Veteran' })
    case 'legend':
      return t('reputationBadge.level.legend', {}, { defaultValue: 'Legend' })
    default:
      return t('reputationBadge.level.fallback', { level }, { defaultValue: '{{level}}' })
  }
}

/**
 * Compact-thousands formatter — keeps the badge readable at large scores.
 *
 * Examples: `42` → `"42"`, `1500` → `"1.5k"`, `12300` → `"12.3k"`,
 * `1_250_000` → `"1.3m"`.
 *
 * @param score - The score to format.
 * @returns A short human-readable string.
 */
function formatScore(score: number): string {
  if (!Number.isFinite(score)) return '0'
  const sign = score < 0 ? '-' : ''
  const abs = Math.abs(score)
  if (abs >= 1_000_000) {
    return `${sign}${trimZero((abs / 1_000_000).toFixed(1))}m`
  }
  if (abs >= 1_000) {
    return `${sign}${trimZero((abs / 1_000).toFixed(1))}k`
  }
  return `${sign}${Math.round(abs)}`
}

/**
 * Drop a trailing `.0` from a fixed-precision number string.
 *
 * @param s - The fixed-precision string (e.g. `"1.0"`).
 * @returns The cleaned string (e.g. `"1"`).
 */
function trimZero(s: string): string {
  return s.endsWith('.0') ? s.slice(0, -2) : s
}

/**
 * User reputation / karma display.
 *
 * Renders a numeric score paired with a tier chip whose color reflects the
 * derived (or explicit) `level`. Tier color comes from the active ClassMap
 * bond's `cm.badge()` helper, so apps swapping styling libraries restyle these
 * chips for free.
 *
 * @param props - Component props (see `ReputationBadgeProps`).
 * @returns The rendered reputation badge element.
 */
export const ReputationBadge = defineComponent({
  name: 'ReputationBadge',
  props: {
    score: {
      type: Number,
      required: true,
    },
    level: String as PropType<ReputationLevel | undefined>,
    thresholds: Object as PropType<ReputationThresholds | undefined>,
    variant: String as PropType<'compact' | 'full'>,
    className: String,
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()

    return (): VNode => {
      const resolvedLevel: ReputationLevel =
        props.level ?? levelForScore(props.score, props.thresholds ?? DEFAULT_THRESHOLDS)
      const color = colorForLevel(resolvedLevel)
      const label = levelLabel(t, resolvedLevel)
      const formattedScore = formatScore(props.score)
      const ariaLabel = t(
        'reputationBadge.aria',
        { score: formattedScore, level: label },
        { defaultValue: '{{score}} reputation, {{level}}' },
      )

      const chip = h(Badge, { color }, () => label)

      if (props.variant === 'full') {
        return h(
          'div',
          {
            class: cm.cn(cm.stack(1), props.className),
            'data-mol-id': 'reputation-badge',
            'aria-label': ariaLabel,
          },
          [
            h('span', { class: cm.cn(cm.textSize('xs'), cm.fontWeight('medium')) }, [
              t('reputationBadge.caption', {}, { defaultValue: 'Reputation' }),
            ]),
            h(
              'div',
              {
                class: cm.flex({ align: 'center', gap: 'sm' }),
                'data-mol-id': 'reputation-badge-row',
              },
              [
                h(
                  'span',
                  {
                    class: cm.cn(cm.textSize('lg'), cm.fontWeight('bold')),
                    'data-mol-id': 'reputation-badge-score',
                  },
                  [formattedScore],
                ),
                chip,
              ],
            ),
          ],
        )
      }

      return h(
        'span',
        {
          class: cm.cn(cm.flex({ align: 'center', gap: 'xs' }), props.className),
          'data-mol-id': 'reputation-badge',
          'aria-label': ariaLabel,
        },
        [
          h('span', { class: cm.fontWeight('semibold'), 'data-mol-id': 'reputation-badge-score' }, [
            formattedScore,
          ]),
          chip,
        ],
      )
    }
  },
})

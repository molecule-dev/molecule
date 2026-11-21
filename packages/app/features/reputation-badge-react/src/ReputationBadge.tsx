import type React from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Badge } from '@molecule/app-ui-react'

import { colorForLevel, DEFAULT_THRESHOLDS, levelForScore } from './levels.js'
import type { ReputationLevel, ReputationThresholds } from './types.js'

/** The i18n translate function the bonded provider hands out. */
type Translate = ReturnType<typeof useTranslation>['t']

/**
 * Resolve a level's translated label through one LITERAL i18n key per
 * in-contract level, and the literal `reputationBadge.level.fallback` key (its
 * English is the bare `{{level}}` placeholder, so an unknown id renders as
 * itself) for anything else.
 *
 * Keys are literals, never built from the level id: the i18n gate
 * (`scripts/check-i18n-parity.js`) can only see literal keys, so a key built at
 * runtime that no locale bond carries leaves every non-English user on English
 * with nothing reporting it.
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

/** Props accepted by the {@link ReputationBadge} component. */
export interface ReputationBadgeProps {
  /** Numeric reputation / karma score. */
  score: number
  /**
   * Explicit reputation level. If omitted, derived from `score` via
   * {@link levelForScore} using `thresholds` (or {@link DEFAULT_THRESHOLDS}).
   */
  level?: ReputationLevel
  /** Override the default score → level thresholds. */
  thresholds?: ReputationThresholds
  /**
   * Layout variant.
   * - `'compact'` (default) — score number inline with a small level chip.
   * - `'full'` — stacked layout with a "Reputation" caption above the row.
   */
  variant?: 'compact' | 'full'
  /** Extra classes merged onto the outer wrapper. */
  className?: string
}

/**
 * User reputation / karma display.
 *
 * Renders a numeric score paired with a tier chip whose color reflects the
 * derived (or explicit) {@link ReputationLevel}. Used by discussion-boards,
 * forum, and social-media flagships to surface community standing.
 *
 * Tier color comes from the active ClassMap bond's `cm.badge()` helper, so
 * apps swapping styling libraries restyle these chips for free.
 *
 * @param props - Component props (see {@link ReputationBadgeProps}).
 * @returns The rendered reputation badge element.
 */
export function ReputationBadge({
  score,
  level,
  thresholds = DEFAULT_THRESHOLDS,
  variant = 'compact',
  className,
}: ReputationBadgeProps): React.JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()

  const resolvedLevel: ReputationLevel = level ?? levelForScore(score, thresholds)
  const color = colorForLevel(resolvedLevel)

  const levelLabelText = levelLabel(t, resolvedLevel)

  const formattedScore = formatScore(score)
  const ariaLabel = t(
    'reputationBadge.aria',
    { score: formattedScore, level: levelLabelText },
    { defaultValue: '{{score}} reputation, {{level}}' },
  )

  if (variant === 'full') {
    return (
      <div
        className={cm.cn(cm.stack(1 as const), className)}
        data-mol-id="reputation-badge"
        aria-label={ariaLabel}
      >
        <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('medium'))}>
          {t('reputationBadge.caption', {}, { defaultValue: 'Reputation' })}
        </span>
        <div className={cm.flex({ align: 'center', gap: 'sm' })} data-mol-id="reputation-badge-row">
          <span
            className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}
            data-mol-id="reputation-badge-score"
          >
            {formattedScore}
          </span>
          <Badge color={color}>{levelLabelText}</Badge>
        </div>
      </div>
    )
  }

  return (
    <span
      className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), className)}
      data-mol-id="reputation-badge"
      aria-label={ariaLabel}
    >
      <span className={cm.fontWeight('semibold')} data-mol-id="reputation-badge-score">
        {formattedScore}
      </span>
      <Badge color={color}>{levelLabelText}</Badge>
    </span>
  )
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

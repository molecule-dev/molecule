import type React from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Badge } from '@molecule/app-ui-react'

import { colorForLevel, DEFAULT_THRESHOLDS, levelForScore } from './levels.js'
import type { ReputationLevel, ReputationThresholds } from './types.js'

interface ReputationBadgeProps {
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
 * @param root0 - Component props.
 * @param root0.score - Numeric reputation score.
 * @param root0.level - Optional explicit level override.
 * @param root0.thresholds - Optional threshold overrides.
 * @param root0.variant - Layout variant (`'compact'` default).
 * @param root0.className - Extra wrapper classes.
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

  const levelLabel = t(
    `reputationBadge.level.${resolvedLevel}`,
    {},
    {
      defaultValue: {
        newcomer: 'Newcomer',
        contributor: 'Contributor',
        trusted: 'Trusted',
        veteran: 'Veteran',
        legend: 'Legend',
      }[resolvedLevel],
    },
  )

  const formattedScore = formatScore(score)
  const ariaLabel = t(
    'reputationBadge.aria',
    { score: formattedScore, level: levelLabel },
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
          <Badge color={color}>{levelLabel}</Badge>
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
      <Badge color={color}>{levelLabel}</Badge>
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

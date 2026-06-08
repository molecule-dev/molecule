import { t } from '@molecule/app-i18n'
import type { CSSProperties } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Card } from '@molecule/app-ui-react'

import { HeroMetricTrendChip } from './HeroMetricTrendChip.js'
import type { HeroMetricAccent, HeroMetricCardProps } from './types.js'

const SEMANTIC_ACCENTS = new Set<HeroMetricAccent>([
  'primary',
  'success',
  'warning',
  'danger',
  'info',
  'neutral',
])

/**
 * Resolves a top-edge accent border color into an inline-style declaration.
 *
 * Semantic tokens (`'primary'`, `'success'`, …) are mapped to the
 * `var(--mol-color-*)` CSS custom-properties exposed by every ClassMap
 * bond, keeping the value swappable per theme. Any other string is
 * forwarded verbatim — useful for one-off brand accents.
 *
 * @param accent - The accent token or raw color string.
 * @returns Inline-style record applied to the card's outer element.
 */
function resolveAccentStyle(accent: HeroMetricAccent): CSSProperties {
  const color = SEMANTIC_ACCENTS.has(accent) ? `var(--mol-color-${accent})` : accent
  return {
    borderTopWidth: '4px',
    borderTopStyle: 'solid',
    borderTopColor: color,
  }
}

/**
 * Top-of-dashboard hero metric card.
 *
 * Replaces the bespoke `*HeroCard` components found across flagship
 * dashboards (CalorieRingCard, TodayHeroCard, MoodHeroCard,
 * SleepScoreHeroCard, PetSnapshotHero, NextAppointmentCard,
 * WorkoutHeroCard, VitalsHeroCard, …) with a single composable
 * primitive.
 *
 * Layout: large value left (with optional unit + trend chip + subtitle),
 * `progressRing` or `icon` slot to the right.
 *
 * Styling is fully delegated to `getClassMap()`; the only inline style
 * is the optional colored top-border accent, which the molecule design
 * system explicitly permits.
 *
 * @param props - Component props.
 * @returns The rendered hero metric card element.
 */
export function HeroMetricCard({
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
}: HeroMetricCardProps): React.ReactElement {
  const cm = getClassMap()
  const interactive = Boolean(onClick)
  const accentStyle = accent ? resolveAccentStyle(accent) : undefined
  const rightSlot = progressRing ?? icon

  const loadingLabel = t('hero-metric-card.loading', {}, { defaultValue: 'Loading metric…' })

  return (
    <Card
      className={cm.cn(className)}
      style={accentStyle}
      interactive={interactive}
      onClick={onClick}
      data-mol-id={dataMolId}
    >
      <div
        className={cm.flex({ justify: 'between', align: 'center', gap: 'md' })}
        aria-busy={loading || undefined}
      >
        <div className={cm.stack(2)}>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {title}
          </span>
          {loading ? (
            <span
              className={cm.cn(cm.textSize('5xl'), cm.fontWeight('bold'))}
              role="status"
              aria-live="polite"
            >
              {loadingLabel}
            </span>
          ) : (
            <div className={cm.flex({ align: 'baseline', gap: 'xs' })}>
              <span className={cm.cn(cm.textSize('5xl'), 'font-extrabold leading-none')}>
                {value}
              </span>
              {unit !== undefined && unit !== null ? (
                <span
                  className={cm.cn(
                    cm.textSize('lg'),
                    cm.fontWeight('medium'),
                    'text-on-surface-variant',
                  )}
                >
                  {unit}
                </span>
              ) : null}
            </div>
          )}
          {!loading && trend ? <HeroMetricTrendChip trend={trend} /> : null}
          {!loading && subtitle ? (
            <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>{subtitle}</span>
          ) : null}
        </div>
        {rightSlot ? (
          <div className={cm.flex({ align: 'center', justify: 'center' })}>{rightSlot}</div>
        ) : null}
      </div>
    </Card>
  )
}

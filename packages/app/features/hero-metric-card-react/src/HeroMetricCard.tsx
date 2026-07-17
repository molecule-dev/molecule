import { t } from '@molecule/app-i18n'
import type { ColorVariant } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Card } from '@molecule/app-ui-react'

import { HeroMetricTrendChip } from './HeroMetricTrendChip.js'
import type { HeroMetricAccent, HeroMetricCardProps, HeroMetricSemanticAccent } from './types.js'

/**
 * Maps a semantic hero accent to a real ClassMap {@link ColorVariant}.
 *
 * The theme exposes no `danger`/`neutral` color token, so those names are
 * translated to the tokens that DO exist (`danger → error`, `neutral →
 * secondary`). The previous implementation emitted
 * `var(--mol-color-danger)` / `var(--mol-color-neutral)`, which resolve to
 * nothing and rendered the accent colorless.
 */
const ACCENT_COLOR_VARIANT: Record<HeroMetricSemanticAccent, ColorVariant> = {
  primary: 'primary',
  success: 'success',
  warning: 'warning',
  danger: 'error',
  info: 'info',
  neutral: 'secondary',
}

/**
 * Resolves the top-edge accent bar's color.
 *
 * Semantic accents route through `cm.progressColor()` — the ClassMap's
 * per-variant color resolver — so the bar picks up a real, theme-aware token
 * (`bg-primary`, `bg-error`, …) that is visibly colored in both light and dark
 * themes. Any other string is treated as a one-off CSS color and applied
 * inline (the documented colored-accent exception).
 *
 * @param cm - The active ClassMap resolver.
 * @param accent - The accent token or raw color string.
 * @returns A ClassMap color class and/or an inline background color.
 */
function resolveAccentBar(
  cm: ReturnType<typeof getClassMap>,
  accent: HeroMetricAccent,
): { className?: string; backgroundColor?: string } {
  const variant = ACCENT_COLOR_VARIANT[accent as HeroMetricSemanticAccent]
  if (variant) {
    return { className: cm.progressColor(variant) }
  }
  return { backgroundColor: accent }
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
 * Styling routes entirely through `getClassMap()` — including the colored
 * top-edge accent, which is a full-width bar tinted via `cm.progressColor()`.
 * Inline style is used only for the bar's fixed height (and a one-off raw
 * accent color when the caller passes a CSS color string).
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
  const accentBar = accent ? resolveAccentBar(cm, accent) : undefined
  const rightSlot = progressRing ?? icon

  const loadingLabel = t('hero-metric-card.loading', {}, { defaultValue: 'Loading metric…' })

  return (
    <Card
      className={cm.cn(className)}
      // Padding moves onto the inner wrapper so the accent bar can sit
      // full-bleed against the top edge; `overflow: hidden` clips the bar to
      // the card's rounded corners.
      padding="none"
      style={accentBar ? { overflow: 'hidden' } : undefined}
      interactive={interactive}
      onClick={onClick}
      data-mol-id={dataMolId}
    >
      {accentBar ? (
        <span
          aria-hidden="true"
          className={cm.cn(accentBar.className)}
          style={{ display: 'block', height: '4px', backgroundColor: accentBar.backgroundColor }}
        />
      ) : null}
      <div className={cm.cardPadding('md')}>
        <div
          className={cm.flex({ justify: 'between', align: 'center', gap: 'md' })}
          aria-busy={loading || undefined}
        >
          <div className={cm.stack(2)}>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                cm.uppercase,
                cm.trackingWide,
                cm.textMuted,
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
                <span
                  className={cm.cn(cm.textSize('5xl'), cm.fontWeight('extrabold'), 'leading-none')}
                >
                  {value}
                </span>
                {unit !== undefined && unit !== null ? (
                  <span className={cm.cn(cm.textSize('lg'), cm.fontWeight('medium'), cm.textMuted)}>
                    {unit}
                  </span>
                ) : null}
              </div>
            )}
            {!loading && trend ? <HeroMetricTrendChip trend={trend} /> : null}
            {!loading && subtitle ? (
              <span className={cm.cn(cm.textSize('sm'), cm.textMuted)}>{subtitle}</span>
            ) : null}
          </div>
          {rightSlot ? (
            <div className={cm.flex({ align: 'center', justify: 'center' })}>{rightSlot}</div>
          ) : null}
        </div>
      </div>
    </Card>
  )
}

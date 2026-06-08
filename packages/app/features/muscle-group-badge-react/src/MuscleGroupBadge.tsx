import type { CSSProperties, JSX } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { MuscleGroup, MuscleGroupBadgeProps } from './types.js'

/** Hex accent color per group — overridable via `accentColor`. */
const ACCENT: Record<MuscleGroup, string> = {
  chest: '#ef4444',
  back: '#3b82f6',
  shoulders: '#8b5cf6',
  biceps: '#ec4899',
  triceps: '#f97316',
  forearms: '#f59e0b',
  core: '#10b981',
  glutes: '#a855f7',
  quads: '#14b8a6',
  hamstrings: '#06b6d4',
  calves: '#84cc16',
  fullBody: '#6366f1',
}

const SIZE_PX: Record<NonNullable<MuscleGroupBadgeProps['size']>, number> = {
  sm: 32,
  md: 48,
  lg: 72,
}

/**
 * Default English label for a muscle group, used when no `label` is given
 * and the i18n bond doesn't have a translation. Returns the same string
 * the `t()` `defaultValue` would surface — exposed for tests and downstream
 * consumers that need to label buttons / menus / search filters by group.
 *
 * @param group - The muscle group.
 * @returns A short, capitalized English label.
 */
export function defaultLabelFor(group: MuscleGroup): string {
  switch (group) {
    case 'chest':
      return 'Chest'
    case 'back':
      return 'Back'
    case 'shoulders':
      return 'Shoulders'
    case 'biceps':
      return 'Biceps'
    case 'triceps':
      return 'Triceps'
    case 'forearms':
      return 'Forearms'
    case 'core':
      return 'Core'
    case 'glutes':
      return 'Glutes'
    case 'quads':
      return 'Quads'
    case 'hamstrings':
      return 'Hamstrings'
    case 'calves':
      return 'Calves'
    case 'fullBody':
      return 'Full body'
  }
}

/**
 * Tiny anatomical glyph — a stylized human silhouette with the active
 * muscle group highlighted by `accent`. Pure SVG, no images.
 *
 * @param props - Internal sub-props.
 * @param props.group - The muscle group to highlight.
 * @param props.accent - Accent color CSS value.
 * @param props.size - Pixel size of the glyph (square).
 * @returns The rendered SVG.
 */
function MuscleGlyph({
  group,
  accent,
  size,
}: {
  group: MuscleGroup
  accent: string
  size: number
}): JSX.Element {
  // Highlight regions per group. Coordinates are in a 24x24 viewBox.
  const highlight = (() => {
    switch (group) {
      case 'chest':
        return <rect x="9" y="6.5" width="6" height="3" rx="1" fill={accent} />
      case 'back':
        return <rect x="9" y="7" width="6" height="4" rx="1" fill={accent} />
      case 'shoulders':
        return (
          <g fill={accent}>
            <circle cx="8.5" cy="6.5" r="1.4" />
            <circle cx="15.5" cy="6.5" r="1.4" />
          </g>
        )
      case 'biceps':
        return (
          <g fill={accent}>
            <rect x="6" y="7.5" width="2" height="3.5" rx="1" />
            <rect x="16" y="7.5" width="2" height="3.5" rx="1" />
          </g>
        )
      case 'triceps':
        return (
          <g fill={accent}>
            <rect x="5.5" y="9" width="2" height="3" rx="1" />
            <rect x="16.5" y="9" width="2" height="3" rx="1" />
          </g>
        )
      case 'forearms':
        return (
          <g fill={accent}>
            <rect x="5" y="11" width="1.8" height="3" rx="0.6" />
            <rect x="17.2" y="11" width="1.8" height="3" rx="0.6" />
          </g>
        )
      case 'core':
        return <rect x="10" y="10.5" width="4" height="4" rx="0.8" fill={accent} />
      case 'glutes':
        return <rect x="9" y="14" width="6" height="2.5" rx="1" fill={accent} />
      case 'quads':
        return (
          <g fill={accent}>
            <rect x="9" y="16" width="2.5" height="4" rx="0.8" />
            <rect x="12.5" y="16" width="2.5" height="4" rx="0.8" />
          </g>
        )
      case 'hamstrings':
        return (
          <g fill={accent}>
            <rect x="9" y="17" width="2.5" height="3" rx="0.8" opacity="0.85" />
            <rect x="12.5" y="17" width="2.5" height="3" rx="0.8" opacity="0.85" />
          </g>
        )
      case 'calves':
        return (
          <g fill={accent}>
            <rect x="9.5" y="20" width="2" height="2.5" rx="0.6" />
            <rect x="12.5" y="20" width="2" height="2.5" rx="0.6" />
          </g>
        )
      case 'fullBody':
        return <rect x="6" y="3" width="12" height="19" rx="2" fill={accent} fillOpacity={0.2} />
    }
  })()

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden focusable={false}>
      {/* Body silhouette — head + torso + limbs. */}
      <g fill="currentColor" fillOpacity={0.12} stroke="currentColor" strokeOpacity={0.4}>
        <circle cx="12" cy="3.5" r="2" />
        <path d="M7 6 h10 a1 1 0 0 1 1 1 v9 a1 1 0 0 1 -1 1 h-2 v5 h-2 v-5 h-2 v5 h-2 v-5 h-2 a1 1 0 0 1 -1 -1 v-9 a1 1 0 0 1 1 -1 z" />
      </g>
      {highlight}
    </svg>
  )
}

/**
 * Anatomical muscle-group badge — a small body-silhouette glyph with the
 * targeted muscle highlighted, plus a translated label. Used by
 * workout-tracker exercise-detail pages.
 *
 * Two variants:
 * - `default` — glyph + label side-by-side.
 * - `compact` — glyph + label inline, smaller padding (good for chips).
 *
 * @param props - Component props.
 * @returns The rendered badge element.
 *
 * @example
 * ```tsx
 * <MuscleGroupBadge group="chest" />
 * <MuscleGroupBadge group="quads" variant="compact" size="sm" />
 * ```
 */
export function MuscleGroupBadge({
  group,
  label,
  variant = 'default',
  size = 'md',
  accentColor,
  dataMolId,
  className,
}: MuscleGroupBadgeProps): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()

  const accent = accentColor ?? ACCENT[group]
  const px = SIZE_PX[size]
  const resolvedLabel =
    label ?? t(`muscleGroupBadge.group.${group}`, {}, { defaultValue: defaultLabelFor(group) })

  const wrapperClass = cm.cn(
    cm.flex({ align: 'center', gap: variant === 'compact' ? 'xs' : 'sm' }),
    className,
  )

  const wrapperStyle: CSSProperties = {
    padding: variant === 'compact' ? '0.2rem 0.5rem' : '0.4rem 0.7rem',
    borderRadius: 999,
    background: 'var(--mol-color-surface-variant, rgba(0,0,0,0.04))',
    border: `1px solid ${accent}`,
    display: 'inline-flex',
    color: 'var(--mol-color-on-surface, #222)',
  }

  return (
    <span
      className={wrapperClass}
      role="group"
      aria-label={t(
        'muscleGroupBadge.group',
        { name: resolvedLabel },
        { defaultValue: '{{name}} muscle group' },
      )}
      data-mol-id={dataMolId ?? 'muscle-group-badge'}
      data-group={group}
      style={wrapperStyle}
    >
      <MuscleGlyph group={group} accent={accent} size={px} />
      <span
        className={cm.cn(
          cm.textSize(variant === 'compact' ? 'xs' : 'sm'),
          cm.fontWeight('semibold'),
        )}
        data-mol-id="muscle-group-label"
      >
        {resolvedLabel}
      </span>
    </span>
  )
}

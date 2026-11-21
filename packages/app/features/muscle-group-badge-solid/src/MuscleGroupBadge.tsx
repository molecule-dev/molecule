/**
 * Solid anatomical muscle-group badge: a body-silhouette glyph with the
 * targeted muscle highlighted, plus a translated label.
 *
 * Solid counterpart of `@molecule/app-muscle-group-badge-react`'s
 * `MuscleGroupBadge` — the same props (React names), the same ClassMap tokens
 * and inline styles, and the same DOM for the same input.
 *
 * @module
 */

import { type Component, type JSX, Match, Switch } from 'solid-js'

import type { TranslateFunction } from '@molecule/app-i18n'
import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import type { MuscleGroup, MuscleGroupBadgeProps } from './types.js'

/**
 * Hex accent color per group — the group's own category palette (data), not a
 * theme tone; overridable via `accentColor`.
 */
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

/** Glyph pixel size per display size. */
const SIZE_PX: Record<NonNullable<MuscleGroupBadgeProps['size']>, number> = {
  sm: 32,
  md: 48,
  lg: 72,
}

/**
 * Default English label for a muscle group — the same string each group's
 * literal `t()` default surfaces. Exposed for tests and downstream consumers
 * that need to label buttons / menus / search filters by group.
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
 * Translated label for a muscle group — one literal `t()` call per group, so
 * the i18n gate can verify every key this lookup can produce against the
 * `@molecule/app-locales-muscle-group-badge` bond; a key built at runtime from
 * the group value would be invisible to it.
 *
 * @param t - The translation function from `useTranslation()`.
 * @param group - The muscle group to label.
 * @returns The label in the active locale, or the group's English default.
 */
function translatedLabel(t: TranslateFunction, group: MuscleGroup): string {
  switch (group) {
    case 'chest':
      return t('muscleGroupBadge.group.chest', {}, { defaultValue: 'Chest' })
    case 'back':
      return t('muscleGroupBadge.group.back', {}, { defaultValue: 'Back' })
    case 'shoulders':
      return t('muscleGroupBadge.group.shoulders', {}, { defaultValue: 'Shoulders' })
    case 'biceps':
      return t('muscleGroupBadge.group.biceps', {}, { defaultValue: 'Biceps' })
    case 'triceps':
      return t('muscleGroupBadge.group.triceps', {}, { defaultValue: 'Triceps' })
    case 'forearms':
      return t('muscleGroupBadge.group.forearms', {}, { defaultValue: 'Forearms' })
    case 'core':
      return t('muscleGroupBadge.group.core', {}, { defaultValue: 'Core' })
    case 'glutes':
      return t('muscleGroupBadge.group.glutes', {}, { defaultValue: 'Glutes' })
    case 'quads':
      return t('muscleGroupBadge.group.quads', {}, { defaultValue: 'Quads' })
    case 'hamstrings':
      return t('muscleGroupBadge.group.hamstrings', {}, { defaultValue: 'Hamstrings' })
    case 'calves':
      return t('muscleGroupBadge.group.calves', {}, { defaultValue: 'Calves' })
    case 'fullBody':
      return t('muscleGroupBadge.group.fullBody', {}, { defaultValue: 'Full body' })
  }
}

/**
 * The highlight region of a group, in the glyph's 24x24 viewBox.
 *
 * @param props - The highlight sub-props.
 * @param props.group - The muscle group to highlight.
 * @param props.accent - Accent color accessor.
 * @returns The highlight element.
 */
function MuscleHighlight(props: { group: MuscleGroup; accent: () => string }): JSX.Element {
  return (
    <Switch>
      <Match when={props.group === 'chest'}>
        <rect x="9" y="6.5" width="6" height="3" rx="1" fill={props.accent()} />
      </Match>
      <Match when={props.group === 'back'}>
        <rect x="9" y="7" width="6" height="4" rx="1" fill={props.accent()} />
      </Match>
      <Match when={props.group === 'shoulders'}>
        <g fill={props.accent()}>
          <circle cx="8.5" cy="6.5" r="1.4" />
          <circle cx="15.5" cy="6.5" r="1.4" />
        </g>
      </Match>
      <Match when={props.group === 'biceps'}>
        <g fill={props.accent()}>
          <rect x="6" y="7.5" width="2" height="3.5" rx="1" />
          <rect x="16" y="7.5" width="2" height="3.5" rx="1" />
        </g>
      </Match>
      <Match when={props.group === 'triceps'}>
        <g fill={props.accent()}>
          <rect x="5.5" y="9" width="2" height="3" rx="1" />
          <rect x="16.5" y="9" width="2" height="3" rx="1" />
        </g>
      </Match>
      <Match when={props.group === 'forearms'}>
        <g fill={props.accent()}>
          <rect x="5" y="11" width="1.8" height="3" rx="0.6" />
          <rect x="17.2" y="11" width="1.8" height="3" rx="0.6" />
        </g>
      </Match>
      <Match when={props.group === 'core'}>
        <rect x="10" y="10.5" width="4" height="4" rx="0.8" fill={props.accent()} />
      </Match>
      <Match when={props.group === 'glutes'}>
        <rect x="9" y="14" width="6" height="2.5" rx="1" fill={props.accent()} />
      </Match>
      <Match when={props.group === 'quads'}>
        <g fill={props.accent()}>
          <rect x="9" y="16" width="2.5" height="4" rx="0.8" />
          <rect x="12.5" y="16" width="2.5" height="4" rx="0.8" />
        </g>
      </Match>
      <Match when={props.group === 'hamstrings'}>
        <g fill={props.accent()}>
          <rect x="9" y="17" width="2.5" height="3" rx="0.8" opacity="0.85" />
          <rect x="12.5" y="17" width="2.5" height="3" rx="0.8" opacity="0.85" />
        </g>
      </Match>
      <Match when={props.group === 'calves'}>
        <g fill={props.accent()}>
          <rect x="9.5" y="20" width="2" height="2.5" rx="0.6" />
          <rect x="12.5" y="20" width="2" height="2.5" rx="0.6" />
        </g>
      </Match>
      <Match when={props.group === 'fullBody'}>
        <rect x="6" y="3" width="12" height="19" rx="2" fill={props.accent()} fill-opacity="0.2" />
      </Match>
    </Switch>
  )
}

/**
 * Marks the glyph SVG unfocusable, as React's `focusable={false}` attribute
 * does (Solid's SVG JSX types do not include the attribute).
 *
 * @param el - The rendered SVG element.
 */
function notFocusable(el: SVGSVGElement): void {
  el.setAttribute('focusable', 'false')
}

/**
 * Tiny anatomical glyph — a stylized human silhouette with the active muscle
 * group highlighted by `accent`. Pure SVG, no images.
 *
 * @param props - The glyph sub-props.
 * @param props.group - The muscle group to highlight.
 * @param props.accent - Accent color accessor.
 * @param props.size - Pixel size of the glyph (square), as an accessor.
 * @returns The rendered SVG.
 */
function MuscleGlyph(props: {
  group: MuscleGroup
  accent: () => string
  size: () => number
}): JSX.Element {
  return (
    <svg
      ref={notFocusable}
      width={props.size()}
      height={props.size()}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      {/* Body silhouette — head + torso + limbs. */}
      <g fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.4">
        <circle cx="12" cy="3.5" r="2" />
        <path d="M7 6 h10 a1 1 0 0 1 1 1 v9 a1 1 0 0 1 -1 1 h-2 v5 h-2 v-5 h-2 v5 h-2 v-5 h-2 a1 1 0 0 1 -1 -1 v-9 a1 1 0 0 1 1 -1 z" />
      </g>
      <MuscleHighlight group={props.group} accent={props.accent} />
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
 * @param props - Component props (see {@link MuscleGroupBadgeProps}).
 * @returns The rendered badge.
 */
export const MuscleGroupBadge: Component<MuscleGroupBadgeProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()

  const variant = (): NonNullable<MuscleGroupBadgeProps['variant']> => props.variant ?? 'default'
  const size = (): NonNullable<MuscleGroupBadgeProps['size']> => props.size ?? 'md'
  const accent = (): string => props.accentColor ?? ACCENT[props.group]
  const px = (): number => SIZE_PX[size()]
  const resolvedLabel = (): string => props.label ?? translatedLabel(t, props.group)

  return (
    <span
      class={cm.cn(
        cm.flex({ align: 'center', gap: variant() === 'compact' ? 'xs' : 'sm' }),
        // The pill's recessed surface, from the theme.
        cm.surfaceSecondary,
        props.className,
      )}
      role="group"
      aria-label={t(
        'muscleGroupBadge.group',
        { name: resolvedLabel() },
        { defaultValue: '{{name}} muscle group' },
      )}
      data-mol-id={props.dataMolId ?? 'muscle-group-badge'}
      data-group={props.group}
      style={{
        padding: variant() === 'compact' ? '0.2rem 0.5rem' : '0.4rem 0.7rem',
        'border-radius': '999px',
        // The accent ring carries the group's palette color (data), not a theme tone.
        border: `1px solid ${accent()}`,
        display: 'inline-flex',
      }}
    >
      <MuscleGlyph group={props.group} accent={accent} size={px} />
      <span
        class={cm.cn(cm.textSize(variant() === 'compact' ? 'xs' : 'sm'), cm.fontWeight('semibold'))}
        data-mol-id="muscle-group-label"
      >
        {resolvedLabel()}
      </span>
    </span>
  )
}
